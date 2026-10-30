"""Colour coordination rules, based on hue relationships on the colour wheel."""

import colorsys
from itertools import combinations

from wardrobe.constants import COLORS, NEUTRALS


def hue(name):
    hex_value = COLORS.get(name, '#888888').lstrip('#')
    r, g, b = (int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, _, _ = colorsys.rgb_to_hls(r, g, b)
    return h * 360


def hue_distance(a, b):
    d = abs(hue(a) - hue(b)) % 360
    return min(d, 360 - d)


def pair_score(a, b):
    """0..1: how well two colour names sit together."""
    if a == b:
        return 0.9  # monochrome
    if a in NEUTRALS or b in NEUTRALS:
        return 1.0
    d = hue_distance(a, b)
    if d <= 35:
        return 0.85  # analogous
    if 150 <= d <= 210:
        return 0.8  # complementary
    if 100 <= d < 150:
        return 0.6  # triadic-ish
    return 0.3  # clash


def main_color(item):
    return item.colors[0] if item.colors else None


def outfit_harmony(items):
    """Returns (score 0..1, short label) for a set of pieces."""
    colors = [c for c in (main_color(i) for i in items) if c]
    if len(colors) < 2:
        return 0.75, 'single colour story'

    pairs = list(combinations(colors, 2))
    score = sum(pair_score(a, b) for a, b in pairs) / len(pairs)

    accents = {c for c in colors if c not in NEUTRALS}
    if len(accents) > 2:
        score -= 0.15 * (len(accents) - 2)  # too many competing colours

    if not accents:
        label = 'neutral palette'
    elif len(accents) == 1:
        label = f'{next(iter(accents))} on a neutral base'
    elif all(hue_distance(a, b) <= 35 for a, b in combinations(accents, 2)):
        label = 'analogous colours'
    elif any(150 <= hue_distance(a, b) <= 210 for a, b in combinations(accents, 2)):
        label = 'complementary contrast'
    else:
        label = 'bold colour mix'
    return max(0.0, min(1.0, score)), label
