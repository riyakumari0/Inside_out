import base64
import io
import shutil
import tempfile
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from wardrobe.models import Item, Look

from . import gemini
from .colors import outfit_harmony, pair_score
from .composer import build_candidates, validate_pick
from .schemas import Evaluation, OutfitPick

User = get_user_model()
MEDIA = tempfile.mkdtemp()


def photo(color=(30, 100, 60), size=(300, 400), fmt='JPEG', exif=False):
    buffer = io.BytesIO()
    img = Image.new('RGB', size, color)
    kwargs = {}
    if exif:
        e = Image.Exif()
        e[0x010F] = 'PhoneMaker'  # Make
        kwargs['exif'] = e
    img.save(buffer, format=fmt, **kwargs)
    return SimpleUploadedFile('p.jpg', buffer.getvalue(), content_type='image/jpeg')


@override_settings(MEDIA_ROOT=MEDIA, GEMINI_API_KEY='', SERPAPI_KEY='', REST_FRAMEWORK={
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
})
class Base(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('a@x.com', 'a@x.com', 'Str0ng-pass!', first_name='Ana')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def item(self, name, category, colors, tags=(), owner=None, **kw):
        return Item.objects.create(owner=owner or self.user, name=name, category=category, colors=list(colors), tags=list(tags), **kw)

    def closet(self):
        return {
            'tee': self.item('White Tee', 'top', ['white'], ['weekend']),
            'blouse': self.item('Red Blouse', 'top', ['red'], ['date-night']),
            'jeans': self.item('Blue Jeans', 'bottom', ['blue'], ['weekend']),
            'skirt': self.item('Black Skirt', 'bottom', ['black'], ['date-night']),
            'dress': self.item('Green Dress', 'dress', ['green'], ['brunch']),
            'sneakers': self.item('White Sneakers', 'footwear', ['white'], ['weekend']),
            'heels': self.item('Black Heels', 'footwear', ['black'], ['date-night']),
            'hoops': self.item('Gold Hoops', 'accessory', ['gold'], ['date-night']),
        }


class AuthTests(Base):
    def test_signup_login_logout_with_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        # Without the CSRF cookie/header, signup is rejected
        r = client.post('/api/auth/signup/', {'name': 'Bo', 'email': 'bo@x.com', 'password': 'Str0ng-pass!'}, format='json')
        self.assertEqual(r.status_code, 403)

        client.get('/api/auth/csrf/')
        token = client.cookies['csrftoken'].value
        r = client.post('/api/auth/signup/', {'name': 'Bo', 'email': 'Bo@X.com', 'password': 'Str0ng-pass!'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['user'], {'name': 'Bo', 'email': 'bo@x.com', 'avatar': None})
        self.assertEqual(client.get('/api/auth/me/').json()['user']['email'], 'bo@x.com')

        token = client.cookies['csrftoken'].value
        self.assertEqual(client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertIsNone(client.get('/api/auth/me/').json()['user'])

    def test_weak_password_and_duplicate_email(self):
        client = APIClient()
        r = client.post('/api/auth/signup/', {'name': 'C', 'email': 'c@x.com', 'password': '123'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('password', r.json())
        r = client.post('/api/auth/signup/', {'name': 'A', 'email': 'a@x.com', 'password': 'Str0ng-pass!'}, format='json')
        self.assertIn('already exists', r.json()['email'][0])

    def test_wrong_password(self):
        r = APIClient().post('/api/auth/login/', {'email': 'a@x.com', 'password': 'nope-nope-1'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_anonymous_cannot_read_wardrobe(self):
        self.assertEqual(APIClient().get('/api/items/').status_code, 403)


class WardrobeTests(Base):
    def test_upload_cleans_photo(self):
        r = self.client.post('/api/items/', {
            'name': 'Linen Shirt', 'category': 'top', 'colors': '["green","white"]', 'seasons': '["summer"]',
            'tags': '["Brunch"]', 'image': photo(size=(3000, 2000), exif=True),
        }, format='multipart')
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertTrue(body['image'].startswith('/media/wardrobe/'))
        self.assertEqual(body['tags'], ['brunch'])
        stored = Image.open(Item.objects.get(id=body['id']).image.path)
        self.assertLessEqual(max(stored.size), 1200)
        self.assertNotIn(0x010F, stored.getexif())  # metadata stripped

    def test_rejects_non_image_and_unknown_colour(self):
        fake = SimpleUploadedFile('x.jpg', b'not an image', content_type='image/jpeg')
        r = self.client.post('/api/items/', {'name': 'X', 'category': 'top', 'image': fake}, format='multipart')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/items/', {'name': 'X', 'category': 'top', 'colors': ['rainbow']}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_users_cannot_touch_each_others_items(self):
        other = User.objects.create_user('b@x.com', 'b@x.com', 'Str0ng-pass!')
        theirs = self.item('Their Coat', 'outerwear', ['navy'], owner=other)
        self.assertEqual(self.client.get(f'/api/items/{theirs.id}/').status_code, 404)
        self.assertEqual(self.client.patch(f'/api/items/{theirs.id}/', {'favorite': True}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/items/{theirs.id}/').status_code, 404)
        self.assertEqual(self.client.get('/api/items/').json(), [])
        # Can't build a look from someone else's piece either
        r = self.client.post('/api/looks/', {'name': 'Sneaky', 'itemIds': [str(theirs.id)]}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_mark_worn(self):
        tee = self.item('Tee', 'top', ['white'])
        r = self.client.post('/api/items/mark-worn/', {'ids': [str(tee.id)]}, format='json')
        self.assertEqual(r.json()[0]['wornCount'], 1)
        self.assertIsNotNone(r.json()[0]['lastWorn'])


class ColourTests(TestCase):
    def test_pair_rules(self):
        self.assertEqual(pair_score('navy', 'red'), 1.0)  # neutral
        self.assertGreater(pair_score('blue', 'orange'), 0.7)  # complementary
        self.assertLess(pair_score('pink', 'orange'), 0.5)  # clash

    def test_too_many_accents_scores_lower(self):
        calm = [Item(colors=['white']), Item(colors=['navy']), Item(colors=['red'])]
        loud = [Item(colors=['red']), Item(colors=['green']), Item(colors=['purple']), Item(colors=['orange'])]
        self.assertGreater(outfit_harmony(calm)[0], outfit_harmony(loud)[0])


class ComposerTests(Base):
    def test_candidates_follow_outfit_rules(self):
        c = self.closet()
        by_id = {str(i.id): i for i in c.values()}
        candidates = build_candidates(list(c.values()), vibe='date-night', seed=1)
        self.assertTrue(candidates)
        for cand in candidates:
            self.assertIsNotNone(validate_pick(cand.ids, by_id), cand.ids)
            self.assertEqual(sum(1 for i in cand.items if i.category == 'footwear'), 1)
            self.assertTrue(any(i.category == 'accessory' for i in cand.items))

    def test_validate_pick_rejects_bad_ai_output(self):
        c = self.closet()
        by_id = {str(i.id): i for i in c.values()}
        self.assertIsNone(validate_pick(['not-a-real-id'], by_id))
        self.assertIsNone(validate_pick([c['dress'].id, c['tee'].id, c['jeans'].id], by_id))  # dress + pair
        self.assertIsNone(validate_pick([c['tee'].id, c['blouse'].id, c['jeans'].id], by_id))  # two tops
        self.assertIsNotNone(validate_pick([c['dress'].id, c['heels'].id], by_id))


class StylistTests(Base):
    def test_outfit_fallback_without_key(self):
        c = self.closet()
        r = self.client.post('/api/stylist/outfit/', {'vibe': 'date-night'}, format='json')
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertFalse(body['ai'])
        by_id = {str(i.id): i for i in c.values()}
        self.assertIsNotNone(validate_pick(body['itemIds'], by_id))

    def test_outfit_uses_valid_gemini_pick(self):
        c = self.closet()
        pick = OutfitPick(item_ids=[str(c['blouse'].id), str(c['skirt'].id), str(c['heels'].id), str(c['hoops'].id)],
                          name='Red Hour', reasoning='Classic.', color_story='Red on black.')
        with mock.patch.object(gemini, 'ask_json', return_value=pick):
            body = self.client.post('/api/stylist/outfit/', {'vibe': 'date-night'}, format='json').json()
        self.assertTrue(body['ai'])
        self.assertEqual(body['name'], 'Red Hour')
        self.assertEqual(set(body['itemIds']), set(pick.item_ids))

    def test_outfit_ignores_hallucinated_gemini_ids(self):
        c = self.closet()
        other = User.objects.create_user('b@x.com', 'b@x.com', 'Str0ng-pass!')
        foreign = self.item('Not Yours', 'dress', ['red'], owner=other)
        pick = OutfitPick(item_ids=[str(foreign.id)], name='Stolen', reasoning='-', color_story='-')
        with mock.patch.object(gemini, 'ask_json', return_value=pick):
            body = self.client.post('/api/stylist/outfit/', {'vibe': 'party'}, format='json').json()
        self.assertFalse(body['ai'])
        self.assertNotIn(str(foreign.id), body['itemIds'])
        self.assertTrue(set(body['itemIds']) <= {str(i.id) for i in c.values()})

    def test_outfit_with_empty_closet(self):
        self.assertEqual(self.client.post('/api/stylist/outfit/', {}, format='json').status_code, 400)

    def _look(self, c, vibe='weekend'):
        look = Look.objects.create(owner=self.user, name='Look', vibe=vibe)
        look.items.set([c['tee'], c['jeans']])
        return look

    def test_evaluate_fallback_suggests_missing_pieces(self):
        look = self._look(self.closet())
        body = self.client.post('/api/stylist/evaluate/', {'lookId': str(look.id)}, format='json').json()
        ev = body['evaluation']
        self.assertFalse(ev['ai'])
        self.assertTrue(1 <= ev['score'] <= 10)
        self.assertEqual({m['category'] for m in ev['missing']}, {'footwear', 'accessory'})

    def test_evaluate_with_gemini(self):
        look = self._look(self.closet())
        fake = Evaluation(score=8, verdict='Fresh.', color_harmony='Crisp.', vibe_fit='Spot on.', tips=['Roll the sleeves.'],
                          missing=[{'category': 'accessory', 'description': 'tan belt', 'search_query': 'tan leather belt women', 'why': 'Defines the waist.'}])
        with mock.patch.object(gemini, 'ask_json', return_value=fake):
            ev = self.client.post('/api/stylist/evaluate/', {'lookId': str(look.id)}, format='json').json()['evaluation']
        self.assertEqual(ev['score'], 8)
        self.assertTrue(ev['ai'])
        self.assertEqual(Look.objects.get(id=look.id).evaluation['score'], 8)

    def test_cannot_evaluate_someone_elses_look(self):
        other = User.objects.create_user('b@x.com', 'b@x.com', 'Str0ng-pass!')
        look = Look.objects.create(owner=other, name='Theirs')
        self.assertEqual(self.client.post('/api/stylist/evaluate/', {'lookId': str(look.id)}, format='json').status_code, 404)

    def test_shop_without_key_returns_store_links(self):
        body = self.client.post('/api/stylist/shop/', {'query': 'gold hoop earrings'}, format='json').json()
        self.assertFalse(body['live'])
        self.assertTrue(all(p['link'].startswith('https://') for p in body['products']))

    @override_settings(SERPAPI_KEY='test-key')
    def test_shop_with_serpapi(self):
        payload = {'shopping_results': [
            {'title': 'Gold Hoops', 'product_link': 'https://www.google.com/shopping/product/1', 'price': '₹499', 'source': 'Myntra', 'thumbnail': 'https://img/1'},
            {'title': 'Bad link', 'product_link': 'javascript:alert(1)'},
        ]}
        with mock.patch('stylist.shopping.requests.get') as get:
            get.return_value.json.return_value = payload
            get.return_value.raise_for_status.return_value = None
            body = self.client.post('/api/stylist/shop/', {'query': 'gold hoops'}, format='json').json()
            self.client.post('/api/stylist/shop/', {'query': 'gold hoops'}, format='json')  # cached
        self.assertTrue(body['live'])
        self.assertEqual([p['title'] for p in body['products']], ['Gold Hoops'])
        self.assertEqual(get.call_count, 1)

    def test_image_needs_key(self):
        c = self.closet()
        c['tee'].image.save('t.jpg', photo(), save=True)
        look = self._look(c)
        r = self.client.post('/api/stylist/image/', {'lookId': str(look.id)}, format='json')
        self.assertEqual(r.status_code, 503)

    def test_image_with_gemini(self):
        c = self.closet()
        c['tee'].image.save('t.jpg', photo(), save=True)
        look = self._look(c)
        buffer = io.BytesIO()
        Image.new('RGB', (64, 80), (120, 140, 110)).save(buffer, format='PNG')
        with mock.patch.object(gemini, 'generate_image', return_value=buffer.getvalue()) as gen:
            body = self.client.post('/api/stylist/image/', {'lookId': str(look.id)}, format='json').json()
        self.assertTrue(body['image'].startswith('/media/looks/'))
        self.assertEqual(len(gen.call_args.args[1]), 1)  # only pieces with photos are sent

    def test_analyze_fallback_detects_colour(self):
        r = self.client.post('/api/stylist/analyze/', {'image': photo(color=(28, 42, 73))}, format='multipart')
        self.assertEqual(r.json(), {'suggestion': {'colors': ['navy']}, 'ai': False})

    def test_analyze_fallback_small_piece_on_white(self):
        # A small dark object with anti-aliased edges on a white background, like a product photo
        from PIL import ImageDraw
        for fill, expected in [((25, 25, 25), 'black'), ((200, 160, 75), 'gold')]:
            buffer = io.BytesIO()
            img = Image.new('RGB', (600, 800), (250, 250, 248))
            ImageDraw.Draw(img).ellipse((100, 450, 290, 560), fill=fill)
            img.save(buffer, format='JPEG')
            upload = SimpleUploadedFile('s.jpg', buffer.getvalue(), content_type='image/jpeg')
            r = self.client.post('/api/stylist/analyze/', {'image': upload}, format='multipart')
            self.assertEqual(r.json()['suggestion']['colors'], [expected])

    def test_chat_fallback(self):
        self.closet()
        body = self.client.post('/api/stylist/chat/', {'message': 'What should I wear on a date?'}, format='json').json()
        self.assertFalse(body['ai'])
        self.assertIn('Date Night', body['text'])
        self.assertEqual(body['link']['to'], '/create?vibe=date-night')


class GeminiWrapperTests(TestCase):
    @override_settings(GEMINI_API_KEY='')
    def test_no_key_raises_unavailable(self):
        with self.assertRaises(gemini.GeminiUnavailable):
            gemini.ask_text('hi')

    @override_settings(GEMINI_API_KEY='k')
    def test_parses_structured_and_image_output(self):
        fake_client = mock.Mock()
        fake_client.interactions.create.return_value = mock.Mock(
            output_text='{"item_ids":["1"],"name":"N","reasoning":"R","color_story":"C"}',
            output_image=mock.Mock(data=base64.b64encode(b'PNGDATA').decode()),
        )
        with mock.patch.object(gemini, '_get_client', return_value=fake_client):
            self.assertEqual(gemini.ask_json('p', OutfitPick).name, 'N')
            self.assertEqual(gemini.generate_image('p', []), b'PNGDATA')
            kwargs = fake_client.interactions.create.call_args.kwargs
            self.assertEqual(kwargs['response_format']['type'], 'image')

    @override_settings(GEMINI_API_KEY='k')
    def test_bad_json_becomes_unavailable(self):
        fake_client = mock.Mock()
        fake_client.interactions.create.return_value = mock.Mock(output_text='{"oops": 1}')
        with mock.patch.object(gemini, '_get_client', return_value=fake_client):
            with self.assertRaises(gemini.GeminiUnavailable):
                gemini.ask_json('p', OutfitPick)
