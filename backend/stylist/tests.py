import base64
import io
import os
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
        self.assertEqual(r.json()['user'], {'name': 'Bo', 'email': 'bo@x.com', 'avatar': None, 'isAdmin': False})
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

    def test_outfit_for_described_event(self):
        c = self.closet()
        body = self.client.post('/api/stylist/outfit/', {'event': 'Dinner date at a rooftop restaurant'}, format='json').json()
        self.assertEqual(body['event'], 'Dinner date at a rooftop restaurant')
        self.assertEqual(body['vibe'], 'date-night')  # detected from the description
        self.assertIsNotNone(validate_pick(body['itemIds'], {str(i.id): i for i in c.values()}))

    def test_event_reaches_gemini(self):
        c = self.closet()
        pick = OutfitPick(item_ids=[str(c['dress'].id), str(c['heels'].id)], name='Garden Glow', reasoning='-', color_story='-')
        with mock.patch.object(gemini, 'ask_json', return_value=pick) as ask:
            self.client.post('/api/stylist/outfit/', {'event': "Cousin's sangeet, outdoors"}, format='json')
        self.assertIn("Cousin's sangeet, outdoors", ask.call_args.args[0])

    def test_look_saves_event(self):
        c = self.closet()
        r = self.client.post('/api/looks/', {'name': 'L', 'vibe': '', 'event': 'Job interview', 'itemIds': [str(c['tee'].id)]}, format='json')
        self.assertEqual(r.json()['event'], 'Job interview')

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


def garment_photo(colour=(30, 60, 140), size=(200, 300)):
    """A coloured garment-shaped block on a plain white background, like a product photo."""
    img = Image.new('RGB', size, (250, 250, 250))
    img.paste(Image.new('RGB', (size[0] // 2, size[1] // 2), colour), (size[0] // 4, size[1] // 4))
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return SimpleUploadedFile('g.jpg', buffer.getvalue(), content_type='image/jpeg')


class CollageTests(Base):
    def upload(self, name, category, colour):
        r = self.client.post('/api/items/', {'name': name, 'category': category, 'image': garment_photo(colour)}, format='multipart')
        self.assertEqual(r.status_code, 201)
        return Item.objects.get(id=r.json()['id'])

    def test_upload_makes_transparent_cutout(self):
        item = self.upload('Blue Tee', 'top', (30, 60, 140))
        self.assertTrue(item.cutout)
        self.assertTrue(item.use_cutout)
        cut = Image.open(item.cutout.path)
        self.assertEqual(cut.mode, 'RGBA')
        self.assertLess(cut.width, 150)  # cropped to the garment, white background gone
        self.assertEqual(cut.getpixel((cut.width // 2, cut.height // 2))[3], 255)

    def test_saving_a_look_builds_its_collage(self):
        top = self.upload('Tee', 'top', (30, 60, 140))
        bottom = self.upload('Skirt', 'bottom', (20, 20, 20))
        shoes = self.upload('Heels', 'footwear', (180, 30, 30))
        r = self.client.post('/api/looks/', {'name': 'L', 'itemIds': [str(top.id), str(bottom.id), str(shoes.id)]}, format='json')
        collage = r.json()['collage']
        self.assertTrue(collage.startswith('/media/collages/'))
        img = Image.open(MEDIA + collage.removeprefix('/media'))
        self.assertEqual(img.size, (1080, 1920))
        left = [img.getpixel((x, y)) for x in range(60, 640, 20) for y in range(60, 1860, 20)]
        right = [img.getpixel((x, y)) for x in range(680, 1020, 20) for y in range(60, 1860, 20)]
        self.assertTrue(any(p[2] > 100 and p[0] < 80 for p in left))  # blue top on the left
        self.assertTrue(any(p[0] > 140 and p[1] < 80 for p in right))  # red shoes on the right

    def test_cutout_keeps_only_the_main_item(self):
        import numpy as np
        from wardrobe.collage import clean_mask
        m = np.zeros((300, 300))
        m[100:200, 80:140] = 1     # left shoe, in the middle
        m[100:200, 160:220] = 1    # right shoe, its pair
        m[0:60, 0:120] = 1         # a big prop running off the top-left edge (flowers, a plate)
        m[260:266, 280:286] = 1    # a speck
        m[230:250, 40:60] = 0.2    # a faint shadow
        out = clean_mask(m) > 0.5
        self.assertTrue(out[150, 110] and out[150, 190])   # both shoes stay
        self.assertFalse(out[30, 60])                       # prop gone
        self.assertFalse(out[263, 283])                     # speck gone
        self.assertFalse(out[240, 50])                      # shadow gone

    def test_cutout_falls_back_when_the_main_model_loses_the_piece(self):
        import numpy as np
        from wardrobe.collage import clean_mask
        lost = np.zeros((200, 200)); lost[40:50, 40:160] = 1        # only the strap of a white bag
        backup = np.zeros((200, 200)); backup[40:180, 40:160] = 0.6  # the other model saw the whole bag, faintly
        out = clean_mask(lost, backup) > 0.5
        self.assertTrue(out[120, 100])
        plain = np.zeros((200, 200)); plain[40:180, 40:160] = 1     # plain background: the flood fill wins
        self.assertTrue((clean_mask(lost, backup, plain) > 0.5)[170, 50])

    def test_pieces_never_overlap(self):
        import random
        from wardrobe.collage import CANVAS, MARGIN, PIECE_GAP, layout
        rng = random.Random(7)
        outfits = [['top', 'bottom'], ['dress'], ['top', 'bottom', 'footwear'], ['dress', 'footwear', 'accessory'],
                   ['top', 'bottom', 'outerwear', 'footwear', 'accessory', 'accessory', 'accessory'],
                   ['top', 'bottom', 'footwear', 'accessory', 'accessory', 'accessory', 'accessory', 'outerwear'],
                   ['footwear', 'accessory'], ['top']]
        for _ in range(200):
            cats = rng.choice(outfits)
            # Any photo shape: very wide skirts, very tall boots, tiny earrings
            pieces = [(str(n), (rng.randint(20, 1600), rng.randint(20, 1600)), c) for n, c in enumerate(cats)]
            rects = [r for _, r in layout(pieces)]
            self.assertEqual(len(rects), len(cats), cats)
            for x0, y0, x1, y1 in rects:
                self.assertTrue(MARGIN <= x0 < x1 <= CANVAS[0] - MARGIN and MARGIN <= y0 < y1 <= CANVAS[1] - MARGIN, (cats, rects))
            for i, a in enumerate(rects):
                for b in rects[i + 1:]:
                    apart = a[2] + PIECE_GAP <= b[0] or b[2] + PIECE_GAP <= a[0] or a[3] + PIECE_GAP <= b[1] or b[3] + PIECE_GAP <= a[1]
                    self.assertTrue(apart, f'{cats}: {a} and {b} are closer than {PIECE_GAP}px')

    def test_preview_for_a_manifested_outfit(self):
        top = self.upload('Tee', 'top', (30, 60, 140))
        shoes = self.upload('Heels', 'footwear', (180, 30, 30))
        body = self.client.post('/api/stylist/collage-preview/', {'itemIds': [str(top.id), str(shoes.id)]}, format='json').json()
        self.assertTrue(body['image'].startswith('data:image/jpeg;base64,'))
        img = Image.open(io.BytesIO(base64.b64decode(body['image'].split(',', 1)[1])))
        self.assertEqual(img.size, (1080, 1920))
        self.assertEqual(Look.objects.count(), 0)  # nothing saved

    def test_preview_ignores_other_peoples_pieces(self):
        other = User.objects.create_user('b@x.com', 'b@x.com', 'Str0ng-pass!')
        theirs = Item.objects.create(owner=other, name='Not yours', category='top')
        theirs.image.save('t.jpg', garment_photo(), save=True)
        body = self.client.post('/api/stylist/collage-preview/', {'itemIds': [str(theirs.id)]}, format='json').json()
        self.assertIsNone(body['image'])

    def test_collage_redraws_and_files_are_cleaned_up(self):
        top = self.upload('Tee', 'top', (30, 60, 140))
        bottom = self.upload('Skirt', 'bottom', (20, 20, 20))
        look_id = self.client.post('/api/looks/', {'name': 'L', 'itemIds': [str(top.id), str(bottom.id)]}, format='json').json()['id']
        first = Look.objects.get(id=look_id).collage.path
        cutout = top.cutout.path
        self.client.delete(f'/api/items/{top.id}/')  # the look keeps the skirt, so its collage is redrawn
        look = Look.objects.get(id=look_id)
        self.assertFalse(os.path.exists(first))
        self.assertFalse(os.path.exists(cutout))
        self.assertTrue(os.path.exists(look.collage.path))
        second = look.collage.path
        self.client.delete(f'/api/looks/{look_id}/')
        self.assertFalse(os.path.exists(second))

    def test_switching_to_original_photo_redraws_collage(self):
        top = self.upload('Tee', 'top', (30, 60, 140))
        bottom = self.upload('Skirt', 'bottom', (20, 20, 20))
        look_id = self.client.post('/api/looks/', {'name': 'L', 'itemIds': [str(top.id), str(bottom.id)]}, format='json').json()['id']
        before = Look.objects.get(id=look_id).collage.name
        r = self.client.patch(f'/api/items/{top.id}/', {'useCutout': False}, format='json')
        self.assertFalse(r.json()['useCutout'])
        self.assertNotEqual(Look.objects.get(id=look_id).collage.name, before)

    def test_collage_endpoint_for_older_looks(self):
        item = Item.objects.create(owner=self.user, name='Dress', category='dress')
        item.image.save('d.jpg', garment_photo((120, 40, 90)), save=True)
        look = Look.objects.create(owner=self.user, name='Old')
        look.items.set([item])
        body = self.client.post('/api/stylist/collage/', {'lookId': str(look.id)}, format='json').json()
        self.assertTrue(body['collage'])
        item.refresh_from_db()
        self.assertTrue(item.cutout)


class WholeOutfitTests(Base):
    def test_a_purse_saved_as_a_top_never_replaces_the_top(self):
        c = self.closet()
        purse = self.item('Office side purse', 'top', ['brown'], ['date-night'], favorite=True)
        for _ in range(20):
            body = self.client.post('/api/stylist/outfit/', {'vibe': 'date-night'}, format='json').json()
            picked = [Item.objects.get(id=i) for i in body['itemIds']]
            real_tops = [i for i in picked if i.category in ('top', 'dress') and i != purse]
            self.assertTrue(real_tops, f'no top or dress in {[i.name for i in picked]}')
            if any(i.category == 'top' and i != purse for i in picked):
                self.assertTrue(any(i.category == 'bottom' for i in picked))
        self.assertEqual(purse.kind, 'accessory')

    def test_gemini_cannot_use_a_purse_as_the_top(self):
        c = self.closet()
        purse = self.item('Office side purse', 'top', ['brown'])
        pick = OutfitPick(item_ids=[str(purse.id), str(c['jeans'].id)], name='No Top', reasoning='-', color_story='-')
        with mock.patch.object(gemini, 'ask_json', return_value=pick):
            body = self.client.post('/api/stylist/outfit/', {'vibe': 'weekend'}, format='json').json()
        self.assertFalse(body['ai'])  # rejected, the rule-based pick is used
        self.assertNotEqual(set(body['itemIds']), {str(purse.id), str(c['jeans'].id)})


class CleanPhotoTests(Base):
    def test_ai_clean_up_replaces_the_cutout_and_can_be_undone(self):
        r = self.client.post('/api/items/', {'name': 'Ruffle Top', 'category': 'top', 'image': garment_photo((30, 60, 140))}, format='multipart')
        item = Item.objects.get(id=r.json()['id'])
        cleaned = io.BytesIO()
        Image.new('RGB', (300, 400), (255, 255, 255)).save(cleaned, format='PNG')
        with mock.patch.object(gemini, 'generate_image', return_value=cleaned.getvalue()) as gen:
            body = self.client.post('/api/stylist/clean-photo/', {'itemId': str(item.id)}, format='json').json()
        self.assertIn('Ruffle Top', gen.call_args.args[0])
        self.assertIn('mannequin', gen.call_args.args[0])
        self.assertTrue(body['cutoutAi'])
        original_photo = Item.objects.get(id=item.id).image.name
        self.assertEqual(original_photo, item.image.name)  # the original photo is kept

        body = self.client.post('/api/stylist/clean-photo/', {'itemId': str(item.id), 'undo': True}, format='json').json()
        self.assertFalse(body['cutoutAi'])

    def test_ai_clean_up_without_gemini(self):
        r = self.client.post('/api/items/', {'name': 'Top', 'category': 'top', 'image': garment_photo()}, format='multipart')
        resp = self.client.post('/api/stylist/clean-photo/', {'itemId': r.json()['id']}, format='json')
        self.assertEqual(resp.status_code, 503)

    def test_cannot_clean_someone_elses_piece(self):
        other = User.objects.create_user('b@x.com', 'b@x.com', 'Str0ng-pass!')
        theirs = Item.objects.create(owner=other, name='Theirs', category='top')
        self.assertEqual(self.client.post('/api/stylist/clean-photo/', {'itemId': str(theirs.id)}, format='json').status_code, 404)
