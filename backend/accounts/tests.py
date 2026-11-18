import io
import os
import re
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from wardrobe.models import Item, Look, SavedProduct

User = get_user_model()
MEDIA = tempfile.mkdtemp()
PASSWORD = 'Str0ng-pass!'


def photo():
    buffer = io.BytesIO()
    Image.new('RGB', (100, 100), (10, 80, 40)).save(buffer, format='JPEG')
    return SimpleUploadedFile('a.jpg', buffer.getvalue(), content_type='image/jpeg')


@override_settings(MEDIA_ROOT=MEDIA, FRONTEND_URL='https://app.test')
class Base(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('a@x.com', 'a@x.com', PASSWORD, first_name='Ana')
        self.client = APIClient()
        self.client.login(username='a@x.com', password=PASSWORD)


class ProfileTests(Base):
    def test_edit_name(self):
        r = self.client.patch('/api/auth/profile/', {'name': 'Anya'}, format='json')
        self.assertEqual(r.json()['user']['name'], 'Anya')

    def test_change_email_needs_password(self):
        r = self.client.patch('/api/auth/profile/', {'email': 'new@x.com'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch('/api/auth/profile/', {'email': 'NEW@x.com', 'currentPassword': PASSWORD}, format='json')
        self.assertEqual(r.json()['user']['email'], 'new@x.com')
        self.assertTrue(APIClient().login(username='new@x.com', password=PASSWORD))

    def test_change_email_to_taken_address(self):
        User.objects.create_user('b@x.com', 'b@x.com', PASSWORD)
        r = self.client.patch('/api/auth/profile/', {'email': 'b@x.com', 'currentPassword': PASSWORD}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_change_password_keeps_session(self):
        bad = self.client.post('/api/auth/change-password/', {'currentPassword': 'wrong', 'newPassword': 'An0ther-pass!'}, format='json')
        self.assertEqual(bad.status_code, 400)
        weak = self.client.post('/api/auth/change-password/', {'currentPassword': PASSWORD, 'newPassword': '123'}, format='json')
        self.assertEqual(weak.status_code, 400)
        ok = self.client.post('/api/auth/change-password/', {'currentPassword': PASSWORD, 'newPassword': 'An0ther-pass!'}, format='json')
        self.assertEqual(ok.status_code, 204)
        self.assertEqual(self.client.get('/api/auth/me/').json()['user']['email'], 'a@x.com')
        self.assertTrue(APIClient().login(username='a@x.com', password='An0ther-pass!'))

    def test_avatar_upload_and_remove(self):
        url = self.client.post('/api/auth/avatar/', {'image': photo()}, format='multipart').json()['user']['avatar']
        self.assertTrue(url.startswith('/media/avatars/'))
        self.assertTrue(os.path.exists(MEDIA + url.removeprefix('/media')))
        self.assertIsNone(self.client.delete('/api/auth/avatar/').json()['user']['avatar'])
        self.assertFalse(os.path.exists(MEDIA + url.removeprefix('/media')))

    def test_delete_account_removes_everything(self):
        item = Item.objects.create(owner=self.user, name='Tee', category='top')
        item.image.save('t.jpg', photo(), save=True)
        path = item.image.path
        look = Look.objects.create(owner=self.user, name='L')
        look.items.set([item])
        SavedProduct.objects.create(owner=self.user, title='P', link='https://x.test/p')

        self.assertEqual(self.client.post('/api/auth/delete-account/', {'password': 'wrong'}, format='json').status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

        self.assertEqual(self.client.post('/api/auth/delete-account/', {'password': PASSWORD}, format='json').status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(Item.objects.exists() or Look.objects.exists() or SavedProduct.objects.exists())
        self.assertFalse(os.path.exists(path))
        self.assertIsNone(self.client.get('/api/auth/me/').json()['user'])

    def test_anonymous_blocked(self):
        for path in ['/api/auth/profile/', '/api/auth/change-password/', '/api/auth/delete-account/', '/api/bag/']:
            self.assertEqual(APIClient().post(path, {}, format='json').status_code, 403, path)


class PasswordResetTests(Base):
    def _link(self):
        return re.search(r'https://app\.test/reset-password\?uid=(\S+)&token=(\S+)', mail.outbox[-1].body).groups()

    def test_full_reset_flow(self):
        anon = APIClient()
        self.assertEqual(anon.post('/api/auth/password-reset/', {'email': 'A@x.com'}, format='json').status_code, 200)
        uid, token = self._link()

        weak = anon.post('/api/auth/password-reset/confirm/', {'uid': uid, 'token': token, 'password': '123'}, format='json')
        self.assertEqual(weak.status_code, 400)
        ok = anon.post('/api/auth/password-reset/confirm/', {'uid': uid, 'token': token, 'password': 'An0ther-pass!'}, format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(anon.login(username='a@x.com', password='An0ther-pass!'))

        # The link only works once
        again = APIClient().post('/api/auth/password-reset/confirm/', {'uid': uid, 'token': token, 'password': 'Th1rd-pass!!'}, format='json')
        self.assertEqual(again.status_code, 400)

    def test_unknown_email_looks_the_same(self):
        r = APIClient().post('/api/auth/password-reset/', {'email': 'nobody@x.com'}, format='json')
        self.assertEqual((r.status_code, r.json()), (200, {'ok': True}))
        self.assertEqual(mail.outbox, [])

    def test_bad_token_and_uid(self):
        anon = APIClient()
        self.assertEqual(anon.post('/api/auth/password-reset/confirm/', {'uid': 'x', 'token': 'y', 'password': 'An0ther-pass!'}, format='json').status_code, 400)


class BagTests(Base):
    PRODUCT = {'title': 'Gold Hoops', 'link': 'https://shop.test/hoops', 'price': '₹499', 'thumbnail': 'https://img.test/1', 'source': 'Myntra'}

    def test_save_list_delete(self):
        r = self.client.post('/api/bag/', self.PRODUCT, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        again = self.client.post('/api/bag/', self.PRODUCT, format='json')
        self.assertEqual((again.status_code, again.json()['id']), (200, r.json()['id']))  # no duplicates
        self.assertEqual(len(self.client.get('/api/bag/').json()), 1)
        self.assertEqual(self.client.delete(f"/api/bag/{r.json()['id']}/").status_code, 204)

    def test_null_price_and_thumbnail_allowed(self):
        r = self.client.post('/api/bag/', {**self.PRODUCT, 'price': None, 'thumbnail': None}, format='json')
        self.assertEqual(r.status_code, 201, r.content)

    def test_rejects_unsafe_links(self):
        for link in ['javascript:alert(1)', 'http://shop.test/x']:
            self.assertEqual(self.client.post('/api/bag/', {**self.PRODUCT, 'link': link}, format='json').status_code, 400, link)

    def test_isolated_between_users(self):
        other = User.objects.create_user('b@x.com', 'b@x.com', PASSWORD)
        theirs = SavedProduct.objects.create(owner=other, title='T', link='https://x.test/t')
        their_look = Look.objects.create(owner=other, name='Theirs')
        self.assertEqual(self.client.get('/api/bag/').json(), [])
        self.assertEqual(self.client.delete(f'/api/bag/{theirs.id}/').status_code, 404)
        r = self.client.post('/api/bag/', {**self.PRODUCT, 'lookId': str(their_look.id)}, format='json')
        self.assertEqual(r.status_code, 400)


class HealthTests(TestCase):
    @override_settings(GEMINI_API_KEY='secret', SERPAPI_KEY='')
    def test_reports_services_without_leaking_keys(self):
        r = APIClient().get('/api/health/')
        self.assertEqual(r.json(), {'status': 'ok', 'gemini': True, 'shopping': False})


class AdminPanelTests(Base):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user('boss@x.com', 'boss@x.com', PASSWORD, first_name='Boss', is_staff=True)
        self.staff = APIClient()
        self.staff.login(username='boss@x.com', password=PASSWORD)

    def test_regular_users_are_blocked(self):
        for url in ['/api/admin-panel/stats/', '/api/admin-panel/users/', '/api/admin-panel/messages/']:
            self.assertEqual(self.client.get(url).status_code, 403)
            self.assertEqual(APIClient().get(url).status_code, 403)
        self.assertEqual(self.client.patch(f'/api/admin-panel/users/{self.admin.id}/', {'isActive': False}, format='json').status_code, 403)

    def test_me_reports_admin_flag(self):
        self.assertFalse(self.client.get('/api/auth/me/').json()['user']['isAdmin'])
        self.assertTrue(self.staff.get('/api/auth/me/').json()['user']['isAdmin'])

    def test_stats_and_user_list(self):
        Item.objects.create(owner=self.user, name='Tee', category='top')
        Look.objects.create(owner=self.user, name='L', vibe='party', event='office party')
        stats = self.staff.get('/api/admin-panel/stats/').json()
        self.assertEqual(stats['users'], 2)
        self.assertEqual(stats['items'], 1)
        self.assertEqual(stats['looksByVibe'][0]['vibe'], 'party')
        self.assertEqual(stats['recentLooks'][0]['event'], 'office party')
        users = self.staff.get('/api/admin-panel/users/?q=ana').json()['users']
        self.assertEqual([u['email'] for u in users], ['a@x.com'])
        self.assertEqual(users[0]['items'], 1)

    def test_deactivate_blocks_login_and_kills_session(self):
        r = self.staff.patch(f'/api/admin-panel/users/{self.user.id}/', {'isActive': False}, format='json')
        self.assertFalse(r.json()['user']['isActive'])
        self.assertIsNone(self.client.get('/api/auth/me/').json()['user'])
        r = APIClient().post('/api/auth/login/', {'email': 'a@x.com', 'password': PASSWORD}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_cannot_change_own_account(self):
        r = self.staff.patch(f'/api/admin-panel/users/{self.admin.id}/', {'isAdmin': False}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.staff.delete(f'/api/admin-panel/users/{self.admin.id}/').status_code, 400)

    def test_delete_user_removes_photos(self):
        item = Item.objects.create(owner=self.user, name='Tee', category='top')
        item.image.save('t.jpg', photo(), save=True)
        path = item.image.path
        self.assertEqual(self.staff.delete(f'/api/admin-panel/users/{self.user.id}/').status_code, 204)
        self.assertFalse(User.objects.filter(email='a@x.com').exists())
        self.assertFalse(os.path.exists(path))

    def test_active_users_counted_from_app_opens(self):
        self.client.get('/api/auth/me/')  # opening the app marks the member as seen
        stats = self.staff.get('/api/admin-panel/stats/').json()
        self.assertEqual(stats['activeThisWeek'], 2)
        users = {u['email']: u for u in self.staff.get('/api/admin-panel/users/').json()['users']}
        self.assertIsNotNone(users['a@x.com']['lastSeen'])

    def test_member_complaint_reply_and_resolve(self):
        r = self.client.post('/api/support/', {'topic': 'bug', 'message': 'Upload keeps failing'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['status'], 'open')
        self.assertEqual(self.client.post('/api/support/', {'topic': 'contact', 'message': 'x'}, format='json').status_code, 400)

        inbox = self.staff.get('/api/admin-panel/messages/?status=open').json()
        self.assertEqual(inbox['open'], 1)
        ticket = inbox['messages'][0]
        self.assertEqual((ticket['email'], ticket['topicLabel'], ticket['userId']), ('a@x.com', 'Something is broken', self.user.id))
        self.assertEqual(self.staff.get('/api/admin-panel/stats/').json()['openComplaints'], 1)

        r = self.staff.patch(f'/api/admin-panel/messages/{ticket["id"]}/', {'reply': 'Fixed, try again!', 'status': 'resolved'}, format='json')
        self.assertEqual(r.json()['message']['status'], 'resolved')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Fixed, try again!', mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, ['a@x.com'])

        mine = self.client.get('/api/support/').json()['tickets']
        self.assertEqual((mine[0]['reply'], mine[0]['status']), ('Fixed, try again!', 'resolved'))
        self.assertEqual(self.staff.get('/api/admin-panel/messages/?status=open').json()['messages'], [])

    def test_members_only_see_their_own_complaints(self):
        other = User.objects.create_user('b@x.com', 'b@x.com', PASSWORD)
        other_client = APIClient()
        other_client.force_authenticate(other)
        other_client.post('/api/support/', {'topic': 'account', 'message': 'Private'}, format='json')
        self.assertEqual(self.client.get('/api/support/').json()['tickets'], [])
        self.assertEqual(self.client.patch('/api/admin-panel/messages/1/', {'status': 'resolved'}, format='json').status_code, 403)

    def test_messages(self):
        APIClient().post('/api/contact/', {'name': 'Zed', 'email': 'z@x.com', 'message': 'Hi'}, format='json')
        messages = self.staff.get('/api/admin-panel/messages/').json()['messages']
        self.assertEqual(messages[0]['name'], 'Zed')
        self.assertEqual(self.staff.delete(f'/api/admin-panel/messages/{messages[0]["id"]}/').status_code, 204)
        self.assertEqual(self.staff.get('/api/admin-panel/messages/').json()['messages'], [])
