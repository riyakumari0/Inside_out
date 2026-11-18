"""
Rule-based outfit builder.

Builds every base (one dress, or one top + one bottom), adds the footwear and
accessories that coordinate best, and ranks the results by vibe, season and
colour harmony. Gemini picks the final look from these candidates; when Gemini
is unavailable the top candidate is used directly.
"""

import random
from dataclasses import dataclass, field
from datetime import date

from .colors import outfit_harmony, pair_score, main_color

MAX_BASES = 400


def current_season(today=None):
    month = (today or date.today()).month
    if month in (12, 1, 2):
        return 'winter'
    if month in (3, 4, 5):
        return 'spring'
    if month in (6, 7, 8):
        return 'summer'
    return 'autumn'


@dataclass
class Candidate:
    items: list
    score: float
    harmony: float
    harmony_label: str
    notes: list = field(default_factory=list)

    @property
    def ids(self):
        return [str(i.id) for i in self.items]


def _fit(item, vibe, season):
    """How well a single piece suits the request, before colours are considered."""
    s = 0.0
    if vibe and vibe in item.tags:
        s += 3
    if season in item.seasons or not item.seasons:
        s += 1
    if item.favorite:
        s += 0.3
    if item.worn_count == 0:
        s += 0.2  # gently surface pieces that haven't been worn yet
    return s


def _best_match(pool, chosen, vibe, season, rng, limit=1):
    """Pieces from `pool` that coordinate best with what's already chosen."""
    def score(item):
        colour = main_color(item)
        harmony = 1.0
        if colour:
            others = [main_color(c) for c in chosen if main_color(c)]
            if others:
                harmony = sum(pair_score(colour, o) for o in others) / len(others)
        return _fit(item, vibe, season) + harmony * 3 + rng.random() * 0.6

    return sorted(pool, key=score, reverse=True)[:limit]


def build_candidates(items, vibe=None, anchor=None, season=None, limit=6, seed=None):
    rng = random.Random(seed)
    season = season or current_season()
    by_cat = {}
    for item in items:
        by_cat.setdefault(item.kind, []).append(item)

    tops, bottoms, dresses = by_cat.get('top', []), by_cat.get('bottom', []), by_cat.get('dress', [])
    bases = [[d] for d in dresses] + [[t, b] for t in tops for b in bottoms]
    if not bases:
        # Not enough to build a full look; offer whatever single base piece exists
        bases = [[i] for i in tops + bottoms]

    if anchor is not None and anchor.kind in ('top', 'bottom', 'dress'):
        bases = [b for b in bases if anchor in b] or [[anchor]]
    rng.shuffle(bases)
    bases = bases[:MAX_BASES]

    candidates = []
    for base in bases:
        look = list(base)
        notes = []
        if anchor is not None and anchor not in look:
            look.append(anchor)

        if not any(i.kind == 'footwear' for i in look):
            footwear = _best_match(by_cat.get('footwear', []), look, vibe, season, rng)
            look += footwear
            if not footwear:
                notes.append('no footwear in closet')

        wants_layer = season in ('autumn', 'winter') or vibe in ('corporate', 'cozy', 'travel')
        if wants_layer and not any(i.kind == 'outerwear' for i in look):
            look += _best_match(by_cat.get('outerwear', []), look, vibe, season, rng)

        existing_accessories = sum(1 for i in look if i.kind == 'accessory')
        accessories = _best_match(
            [a for a in by_cat.get('accessory', []) if a not in look], look, vibe, season, rng, limit=max(0, 2 - existing_accessories),
        )
        look += accessories
        if not accessories and not existing_accessories:
            notes.append('no accessories in closet')

        harmony, label = outfit_harmony(look)
        score = sum(_fit(i, vibe, season) for i in base) / len(base) * 2 + harmony * 5 + rng.random() * 0.5
        candidates.append(Candidate(look, score, harmony, label, notes))

    candidates.sort(key=lambda c: c.score, reverse=True)

    unique, seen = [], set()
    for c in candidates:
        key = frozenset(c.ids)
        if key not in seen:
            seen.add(key)
            unique.append(c)
        if len(unique) == limit:
            break
    return unique


def validate_pick(item_ids, items_by_id):
    """
    Checks an AI-chosen outfit follows the rules: only the user's own pieces,
    exactly one base, at most one footwear and one outerwear, up to 3 accessories.
    Returns the list of items, or None if the pick is invalid.
    """
    picked = []
    for item_id in dict.fromkeys(item_ids):
        item = items_by_id.get(str(item_id))
        if item is None:
            return None
        picked.append(item)

    count = {}
    for item in picked:
        count[item.kind] = count.get(item.kind, 0) + 1

    has_dress = count.get('dress', 0) == 1 and not count.get('top') and not count.get('bottom')
    has_pair = count.get('top', 0) == 1 and count.get('bottom', 0) == 1 and not count.get('dress')
    if not (has_dress or has_pair):
        return None
    if count.get('footwear', 0) > 1 or count.get('outerwear', 0) > 1 or count.get('accessory', 0) > 3:
        return None
    return picked
