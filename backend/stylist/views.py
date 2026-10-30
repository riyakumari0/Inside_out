import random

from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from PIL import Image
from rest_framework import serializers, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from wardrobe.constants import COLORS, VIBES
from wardrobe.images import clean_upload, image_bytes
from wardrobe.models import Item, Look
from wardrobe.serializers import LookSerializer

from . import gemini
from .colors import outfit_harmony
from .composer import build_candidates, current_season, validate_pick
from .schemas import Evaluation, OutfitPick, PieceTags
from .shopping import search_products

STYLIST_PERSONA = (
    'You are the Inside & Out personal stylist: warm, concise and practical. '
    'You only style with the pieces you are given and you care about colour coordination, '
    'proportion and suiting the occasion. Never invent pieces the user does not own.'
)


def vibe_label(vibe):
    return VIBES.get(vibe, 'Everyday')


# ---------- Analyze a new piece ----------

def _dominant_colour(jpeg):
    # Most common colour bucket, ignoring the near-white background. Averaging all pixels
    # would blend edges and shadows into the wrong colour (black shoes came out "green").
    img = Image.open(jpeg).convert('RGB').resize((48, 48))
    pixels = [p for p in img.getdata() if not all(c > 235 for c in p)] or list(img.getdata())
    buckets = {}
    for p in pixels:
        buckets.setdefault(tuple(c >> 5 for c in p), []).append(p)
    top = max(buckets.values(), key=len)
    r, g, b = (sum(p[i] for p in top) / len(top) for i in range(3))

    def distance(hex_value):
        h = hex_value.lstrip('#')
        return sum((int(h[i:i + 2], 16) - v) ** 2 for i, v in zip((0, 2, 4), (r, g, b)))

    return min(COLORS, key=lambda name: distance(COLORS[name]))


class AnalyzeView(APIView):
    """Reads a clothing photo and suggests name, category, colours, pattern, seasons and vibes."""
    parser_classes = [MultiPartParser]
    throttle_scope = 'analyze'

    def post(self, request):
        upload = request.FILES.get('image')
        if not upload:
            raise serializers.ValidationError({'image': 'Attach a photo.'})
        cleaned = clean_upload(upload)
        data = cleaned.read()

        try:
            tags = gemini.ask_json(
                'Identify this single clothing item or accessory for a wardrobe app. '
                'Use only the allowed values for category, colours, seasons and vibes.',
                PieceTags,
                images=[gemini.image_part(data)],
                system=STYLIST_PERSONA,
            )
            suggestion = tags.model_dump()
            suggestion['colors'] = suggestion['colors'][:3]
            suggestion['tags'] = suggestion.pop('vibes')[:4]
            return Response({'suggestion': suggestion, 'ai': True})
        except gemini.GeminiUnavailable:
            cleaned.seek(0)
            return Response({'suggestion': {'colors': [_dominant_colour(cleaned)]}, 'ai': False})


# ---------- Build an outfit ----------

class OutfitRequest(serializers.Serializer):
    vibe = serializers.ChoiceField(choices=list(VIBES), required=False, allow_blank=True)
    anchorId = serializers.UUIDField(required=False, allow_null=True)
    previousIds = serializers.ListField(child=serializers.UUIDField(), required=False)


class OutfitView(APIView):
    throttle_scope = 'outfit'

    def post(self, request):
        params = OutfitRequest(data=request.data)
        params.is_valid(raise_exception=True)
        vibe = params.validated_data.get('vibe') or None
        previous = {str(i) for i in params.validated_data.get('previousIds', [])}

        items = list(Item.objects.filter(owner=request.user))
        if not items:
            return Response({'detail': 'Add a few pieces to your wardrobe first.'}, status=status.HTTP_400_BAD_REQUEST)
        by_id = {str(i.id): i for i in items}
        anchor_id = params.validated_data.get('anchorId')
        anchor = by_id.get(str(anchor_id)) if anchor_id else None

        season = current_season()
        candidates = build_candidates(items, vibe=vibe, anchor=anchor, season=season, seed=random.random())
        if previous:
            # "Shuffle" should give a different look
            candidates = [c for c in candidates if set(c.ids) != previous] or candidates
        if not candidates:
            return Response({'detail': 'Add at least a top and a bottom, or a dress.'}, status=status.HTTP_400_BAD_REQUEST)

        pick, ai = None, False
        try:
            pick, ai = self._ask_gemini(items, candidates, vibe, season, anchor, previous, by_id)
        except gemini.GeminiUnavailable:
            pass

        if pick is None:
            best = candidates[0]
            pick = {
                'items': best.items,
                'name': f'{vibe_label(vibe)} Fit',
                'reasoning': f'Picked for {vibe_label(vibe).lower()} in {season}, balancing your favourites with pieces that coordinate.',
                'color_story': best.harmony_label.capitalize() + '.',
            }

        harmony, label = outfit_harmony(pick['items'])
        notes = next((c.notes for c in candidates if set(c.ids) == {str(i.id) for i in pick['items']}), [])
        return Response({
            'itemIds': [str(i.id) for i in pick['items']],
            'name': pick['name'],
            'reasoning': pick['reasoning'],
            'colorStory': pick['color_story'],
            'harmony': {'score': round(harmony, 2), 'label': label},
            'notes': notes,
            'ai': ai,
        })

    def _ask_gemini(self, items, candidates, vibe, season, anchor, previous, by_id):
        wardrobe = '\n'.join(i.describe() for i in items[:150])
        shortlist = '\n'.join(
            f'{n + 1}. {", ".join(c.ids)}  (colour harmony {c.harmony:.2f}: {c.harmony_label})'
            for n, c in enumerate(candidates)
        )
        prompt = f"""Create one outfit for the vibe "{vibe_label(vibe)}" in {season}.

Wardrobe (id in brackets):
{wardrobe}

Rule-checked shortlists you may use or improve on:
{shortlist}

Rules:
- Exactly one base: one dress, OR one top plus one bottom.
- Add one footwear item if the wardrobe has any, 1-2 accessories if available, and outerwear only if it suits the season or vibe.
- Coordinate colours (neutrals with one accent, analogous, or complementary). Avoid clashing accents.
{f'- The outfit must include [{anchor.id}] {anchor.name}.' if anchor else ''}
{f'- Make it different from the previous outfit: {", ".join(previous)}.' if previous else ''}
- Use only ids from the wardrobe list, copied exactly."""

        result = gemini.ask_json(prompt, OutfitPick, system=STYLIST_PERSONA)
        picked = validate_pick(result.item_ids, by_id)
        if picked is None or (anchor and anchor not in picked):
            return None, False
        return {'items': picked, 'name': result.name, 'reasoning': result.reasoning, 'color_story': result.color_story}, True


# ---------- Evaluate a saved look ----------

def _fallback_evaluation(look, items):
    harmony, label = outfit_harmony(items)
    vibe_hits = sum(1 for i in items if look.vibe and look.vibe in i.tags)
    vibe_ratio = vibe_hits / len(items) if look.vibe else 0.6
    categories = {i.category for i in items}

    missing = []
    accents = [c for i in items for c in i.colors[:1]]
    metal = 'gold' if any(c in ('brown', 'beige', 'green', 'red', 'orange', 'yellow', 'teal') for c in accents) else 'silver'
    if 'footwear' not in categories:
        missing.append({'category': 'footwear', 'description': f'neutral {"heels" if look.vibe in ("party", "date-night") else "sneakers" if look.vibe in ("weekend", "travel") else "loafers"}',
                        'search_query': f'{"nude block heels" if look.vibe in ("party", "date-night") else "white sneakers women" if look.vibe in ("weekend", "travel") else "tan loafers"}',
                        'why': 'Finishes the look and grounds the colours.'})
    if 'accessory' not in categories:
        missing.append({'category': 'accessory', 'description': f'minimal {metal} jewellery',
                        'search_query': f'{metal} hoop earrings', 'why': f'{metal.capitalize()} picks up the warm or cool tones in the outfit.'})

    score = max(1, min(10, round(3 + harmony * 4 + vibe_ratio * 2 + (1 if not missing else 0))))
    return {
        'score': score,
        'verdict': 'A well-balanced look.' if score >= 7 else 'A solid start with room to polish.',
        'color_harmony': f'{label.capitalize()} (harmony {harmony:.0%}).',
        'vibe_fit': f'{vibe_hits} of {len(items)} pieces are tagged for {vibe_label(look.vibe).lower()}.' if look.vibe else 'No vibe chosen.',
        'tips': ['Tuck or half-tuck the top to define the waist.', 'Keep jewellery in one metal tone.'],
        'missing': missing[:2],
    }


class LookActionMixin:
    def get_look(self, request):
        look_id = request.data.get('lookId')
        if not look_id:
            raise serializers.ValidationError({'lookId': 'Save the look first.'})
        return get_object_or_404(Look.objects.prefetch_related('items'), id=look_id, owner=request.user)


class EvaluateView(LookActionMixin, APIView):
    throttle_scope = 'evaluate'

    def post(self, request):
        look = self.get_look(request)
        items = list(look.items.all())
        photos = [gemini.image_part(image_bytes(i.image)) for i in items if i.image][:6]

        try:
            result = gemini.ask_json(
                f"""Evaluate this outfit for the vibe "{vibe_label(look.vibe)}" in {current_season()}.
Pieces (photos attached in the same order where available):
{chr(10).join(i.describe() for i in items)}

Score it 1-10 on colour coordination, proportion and fit for the occasion.
Suggest 0-2 pieces the user could BUY to enhance it (only if they'd clearly help), each with a precise shopping search query.""",
                Evaluation,
                images=photos,
                system=STYLIST_PERSONA,
            )
            evaluation, ai = result.model_dump(), True
        except gemini.GeminiUnavailable:
            evaluation, ai = _fallback_evaluation(look, items), False

        evaluation['ai'] = ai
        look.evaluation = evaluation
        look.save(update_fields=['evaluation'])
        return Response(LookSerializer(look, context={'request': request}).data)


# ---------- Shop the gap ----------

class ShopRequest(serializers.Serializer):
    query = serializers.CharField(max_length=120)
    maxPrice = serializers.IntegerField(required=False, min_value=1)


class ShopView(APIView):
    throttle_scope = 'shop'

    def post(self, request):
        params = ShopRequest(data=request.data)
        params.is_valid(raise_exception=True)
        products, live = search_products(params.validated_data['query'], params.validated_data.get('maxPrice'))
        return Response({'products': products, 'live': live})


# ---------- Outfit image ----------

class OutfitImageView(LookActionMixin, APIView):
    throttle_scope = 'image'

    def post(self, request):
        look = self.get_look(request)
        items = [i for i in look.items.all() if i.image]
        if not items:
            return Response({'detail': 'Add photos to these pieces first.'}, status=status.HTTP_400_BAD_REQUEST)

        prompt = (
            f'Create a polished editorial flat-lay photograph of exactly these {len(items)} clothing pieces '
            f'styled together as one "{vibe_label(look.vibe)}" outfit: '
            + '; '.join(f'{i.name} ({i.category})' for i in items)
            + '. Keep every garment\'s colours, patterns and details faithful to the reference photos. '
            'Arrange them naturally on a soft sage-green linen background with gentle daylight and soft shadows. '
            'No people, no mannequins, no text, no logos added.'
        )
        try:
            data = gemini.generate_image(prompt, [gemini.image_part(image_bytes(i.image)) for i in items[:8]])
        except gemini.GeminiUnavailable:
            return Response(
                {'detail': 'Outfit images need a Gemini API key. Add GEMINI_API_KEY to backend/.env.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if look.image:
            look.image.delete(save=False)
        look.image.save('look.png', ContentFile(data), save=True)
        return Response(LookSerializer(look, context={'request': request}).data)


# ---------- Chat ----------

VIBE_KEYWORDS = {
    'date-night': ['date', 'dinner', 'romantic', 'night out'],
    'corporate': ['office', 'work', 'meeting', 'interview', 'corporate', 'formal'],
    'weekend': ['weekend', 'casual', 'chill', 'errands'],
    'brunch': ['brunch', 'lunch', 'cafe', 'coffee'],
    'party': ['party', 'club', 'birthday', 'celebrat'],
    'festive': ['festive', 'festival', 'wedding', 'diwali', 'eid', 'puja'],
    'cozy': ['cozy', 'cosy', 'cold', 'comfy'],
    'travel': ['travel', 'trip', 'flight', 'vacation', 'holiday', 'airport'],
    'toddler': ['toddler', 'kid', 'baby'],
}


def detect_vibe(text):
    lower = text.lower()
    return next((slug for slug, words in VIBE_KEYWORDS.items() if any(w in lower for w in words)), None)


class ChatRequest(serializers.Serializer):
    message = serializers.CharField(max_length=500)
    history = serializers.ListField(child=serializers.DictField(), required=False, max_length=12)


class ChatView(APIView):
    throttle_scope = 'chat'

    def post(self, request):
        params = ChatRequest(data=request.data)
        params.is_valid(raise_exception=True)
        message = params.validated_data['message']
        vibe = detect_vibe(message)
        link = {'to': f'/create?vibe={vibe}', 'label': f'Manifest a {vibe_label(vibe)} look'} if vibe else None

        items = list(Item.objects.filter(owner=request.user)[:150])
        closet = '\n'.join(i.describe() for i in items) or '(empty closet)'
        history = '\n'.join(
            f'{"User" if h.get("sender") == "user" else "Stylist"}: {str(h.get("text", ""))[:300]}'
            for h in params.validated_data.get('history', [])
        )
        try:
            text = gemini.ask_text(
                f"""The user's closet:
{closet}

Season: {current_season()}
Conversation so far:
{history}

User: {message}

Reply in under 70 words. When suggesting an outfit, name real pieces from the closet (top+bottom or dress, footwear, accessories) and mention the colour idea. If something is missing, say what to buy.""",
                system=STYLIST_PERSONA,
            )
            return Response({'text': text, 'link': link, 'ai': True})
        except gemini.GeminiUnavailable:
            pass

        # Rule-based fallback
        if vibe and items:
            candidates = build_candidates(items, vibe=vibe)
            if candidates:
                names = ' + '.join(i.name for i in candidates[0].items)
                return Response({'text': f'For {vibe_label(vibe)}, try: {names}. ✨', 'link': link, 'ai': False})
        if not items:
            return Response({'text': 'Your closet is empty. Add a few pieces and I\'ll start styling! 🌿',
                             'link': {'to': '/wardrobe/new', 'label': 'Add a piece'}, 'ai': False})
        return Response({'text': 'Tell me the occasion, like "date night", "office meeting" or "weekend brunch", and I\'ll pull a look from your closet.',
                         'link': link, 'ai': False})
