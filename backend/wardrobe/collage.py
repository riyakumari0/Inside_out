"""
Outfit collages: each piece is cut out of its photo, then the cut-outs are laid out
on a plain canvas like a fashion moodboard.

    +-------------------+-----------+
    |                   | accessory |
    |   top             | accessory |
    |                   |           |
    +-------------------+ outerwear |
    |                   |           |
    |   bottom          |           |
    |   (or one dress   | footwear  |
    |    spanning both) |           |
    +-------------------+-----------+

Background removal uses rembg with BiRefNet-lite (open-source models that run on this
server), then keeps only the main item: no shadows, props or petals. If rembg isn't
installed, a simple flood fill from the photo's corners removes plain backgrounds instead.
"""

import io
import logging
import threading

from django.conf import settings
from PIL import Image, ImageChops, ImageDraw, ImageFilter

logger = logging.getLogger(__name__)

CUTOUT_MAX_SIDE = 900
CANVAS = (1080, 1920)  # 9:16, the shape of a phone screen / Pinterest pin
BACKGROUND = (236, 236, 233)
MARGIN = 60

_sessions = {}
_session_lock = threading.Lock()


def _mask(img, model):
    """The model's guess of which pixels are the piece, 0..1."""
    import numpy as np
    from rembg import new_session, remove  # imported lazily: the models are large

    with _session_lock:
        if model not in _sessions:
            _sessions[model] = new_session(model)
        mask = remove(img, session=_sessions[model], only_mask=True)
    return np.asarray(mask.convert('L'), dtype=float) / 255


def _flood_mask(img, threshold=28):
    """Fallback without rembg: everything connected to the corners and close in colour is background."""
    import numpy as np
    rgb = img.convert('RGB')
    marker = (255, 0, 254)
    filled = rgb.copy()
    w, h = filled.size
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if filled.getpixel(corner) != marker:
            ImageDraw.floodfill(filled, corner, marker, thresh=threshold)
    diff = ImageChops.difference(filled, Image.new('RGB', filled.size, marker)).convert('L')
    mask = diff.point(lambda v: 255 if v > 0 else 0).filter(ImageFilter.MinFilter(3))
    return np.asarray(mask, dtype=float) / 255


def _plain_background(img):
    """True when the photo's corners are all about the same colour (a studio or plain-wall shot)."""
    w, h = img.size
    corners = [img.getpixel(p) for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]]
    return max(max(c[i] for c in corners) - min(c[i] for c in corners) for i in range(3)) < 24


def clean_mask(main, backup=None, plain=None):
    """
    Turns a model's mask into "only the main item":
    - if the main model lost most of the piece (white bag on a white table), use the plain-background
      flood fill when the photo has one, otherwise the backup model
    - drop faint, half-transparent pixels (shadows, reflections) so edges are crisp
    - pick the main item: big, near the centre, and not running off the photo's edge like props do
    - keep only pieces next to it of similar size (the second shoe or earring); drop the rest
    """
    import numpy as np
    from scipy import ndimage

    m = main
    if backup is not None and (main > 0.5).mean() < 0.5 * (backup > 0.05).mean():
        m = plain if plain is not None and 0.03 < plain.mean() < 0.95 else backup
    m = np.clip((m - 0.35) / 0.3, 0, 1)

    labels, count = ndimage.label(m > 0.5)
    if count == 0:
        return m
    h, w = m.shape
    index = range(1, count + 1)
    areas = ndimage.sum(np.ones_like(labels), labels, index)
    boxes = ndimage.find_objects(labels)
    cy, cx = np.array(ndimage.center_of_mass(np.ones_like(labels), labels, index)).T
    at_edge = np.array([b[0].start <= 1 or b[1].start <= 1 or b[0].stop >= h - 1 or b[1].stop >= w - 1 for b in boxes])
    off_centre = np.hypot((cx - w / 2) / w, (cy - h / 2) / h) / 0.7071
    score = areas * (1.15 - off_centre) * np.where(at_edge & ~at_edge.all(), 0.3, 1.0)
    main_i = int(np.argmax(score))
    mb = boxes[main_i]
    reach = 0.6 * max(mb[0].stop - mb[0].start, mb[1].stop - mb[1].start)

    keep = []
    for k, b in enumerate(boxes):
        gap_y = max(0, max(b[0].start, mb[0].start) - min(b[0].stop, mb[0].stop))
        gap_x = max(0, max(b[1].start, mb[1].start) - min(b[1].stop, mb[1].stop))
        partner = areas[k] >= 0.3 * areas[main_i] and max(gap_x, gap_y) <= reach and not (at_edge[k] and not at_edge[main_i])
        if k == main_i or partner:
            keep.append(k + 1)
    return m * ndimage.binary_dilation(np.isin(labels, keep), iterations=2)


def make_cutout(image_file):
    """Returns PNG bytes of only the main item, background removed, cropped to the item."""
    import numpy as np

    with image_file.open('rb') as f:
        img = Image.open(f)
        img.load()
    img = img.convert('RGB')
    img.thumbnail((CUTOUT_MAX_SIDE, CUTOUT_MAX_SIDE))

    mask = None
    if settings.CUTOUT_ENGINE == 'rembg':
        try:
            main = _mask(img, settings.CUTOUT_MODEL)
            backup = _mask(img, settings.CUTOUT_BACKUP_MODEL) if settings.CUTOUT_BACKUP_MODEL else None
            plain = _flood_mask(img, threshold=18) if _plain_background(img) else None
            mask = clean_mask(main, backup, plain)
        except Exception as err:  # missing package, model download failure, etc.
            logger.warning('rembg unavailable, using simple background removal: %s', err)
    if mask is None:
        mask = clean_mask(_flood_mask(img))

    alpha = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))  # smooth, not jagged
    out = img.convert('RGBA')
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    # If removal ate the whole piece (or nearly), keep the original photo instead
    if not bbox or (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) < 0.02 * out.width * out.height:
        out = img.convert('RGBA')
    else:
        out = out.crop(bbox)

    buffer = io.BytesIO()
    out.save(buffer, format='PNG', optimize=True)
    return buffer.getvalue()


def _piece_image(item):
    source = item.cutout if (item.cutout and item.use_cutout) else item.image
    with source.open('rb') as f:
        img = Image.open(f)
        img.load()
    return img.convert('RGBA')


MAX_UPSCALE = 1.6
PIECE_GAP = 40  # minimum empty space between any two pieces


def _fit_rect(size, box, max_upscale=MAX_UPSCALE):
    """Where a piece of this size lands when scaled to fit inside box (keeping its shape), centred."""
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    if bw <= 0 or bh <= 0:
        return None
    scale = min(bw / size[0], bh / size[1], max_upscale)
    w, h = max(1, round(size[0] * scale)), max(1, round(size[1] * scale))
    x, y = x0 + (bw - w) // 2, y0 + (bh - h) // 2
    return (x, y, x + w, y + h)


# How tall each side piece's slot is allowed to be, relative to the others
SIDE_WEIGHT = {'accessory': 0.75, 'outerwear': 1.6, 'footwear': 1.0}
SIDE_MAX_HEIGHT = {'accessory': 380, 'outerwear': 720, 'footwear': 460}
SIDE_ORDER = {'accessory': 0, 'outerwear': 1, 'footwear': 2}


def layout(pieces):
    """
    pieces: (key, (width, height), category) for each piece.
    Returns (key, (x0, y0, x1, y1)) for each piece drawn. Every piece gets its own
    box and the boxes never touch, so no piece can overlap another.
    """
    W, H = CANVAS
    base = [p for p in pieces if p[2] in ('top', 'bottom', 'dress')]
    side = sorted([p for p in pieces if p[2] not in ('top', 'bottom', 'dress')], key=lambda p: SIDE_ORDER.get(p[2], 1))
    placed = []

    # Left column: the outfit's base (one dress, or a top above a bottom)
    left = (MARGIN, MARGIN, (W // 2 + 100) - PIECE_GAP // 2 if side else W - MARGIN, H - MARGIN)
    first = {}
    for key, size, cat in base:
        first.setdefault(cat, (key, size))
    if 'dress' in first:
        chosen = [(first['dress'], left)]
    elif 'top' in first and 'bottom' in first:
        width, column = left[2] - left[0], left[3] - left[1]
        (top_key, top_size), (bottom_key, bottom_size) = first['top'], first['bottom']
        top_h = min(column * 0.42, top_size[1] * min(width / top_size[0], MAX_UPSCALE))
        bottom_h = min(column * 0.62, bottom_size[1] * min(width / bottom_size[0], MAX_UPSCALE))
        if top_h + bottom_h + PIECE_GAP > column:  # shrink both so the gap always fits
            shrink = (column - PIECE_GAP) / (top_h + bottom_h)
            top_h, bottom_h = top_h * shrink, bottom_h * shrink
        # Stacked like they're worn, a small gap at the waist, the pair centred
        start = left[1] + (column - (top_h + PIECE_GAP + bottom_h)) / 2
        split = start + top_h
        chosen = [
            (first['top'], (left[0], round(start), left[2], int(split))),
            (first['bottom'], (left[0], int(split) + PIECE_GAP, left[2], round(split + PIECE_GAP + bottom_h))),
        ]
    elif first:
        chosen = [(next(iter(first.values())), left)]
    else:
        chosen = []
    for (key, size), box in chosen:
        rect = _fit_rect(size, box)
        if rect:
            placed.append((key, rect))

    # Right column: bags and accessories, outerwear, footwear from top to bottom
    if side:
        x0 = MARGIN if not base else left[2] + PIECE_GAP
        x1 = W - MARGIN
        available = H - 2 * MARGIN - PIECE_GAP * (len(side) - 1)
        total_weight = sum(SIDE_WEIGHT.get(cat, 1) for _, _, cat in side)
        heights = [min(SIDE_MAX_HEIGHT.get(cat, 500), available * SIDE_WEIGHT.get(cat, 1) / total_weight) for _, _, cat in side]
        # Spread leftover space evenly so the column fills the page like the base does
        spare = (available - sum(heights)) / (len(side) + 1)
        y = MARGIN + spare
        for (key, size, cat), h in zip(side, heights):
            rect = _fit_rect(size, (x0, int(y), x1, int(y + h)))
            if rect:
                placed.append((key, rect))
            y += h + PIECE_GAP + spare
    return placed


def build_collage(items):
    """JPEG bytes of the moodboard for these pieces (only pieces with a photo are drawn)."""
    images = {str(i.id): _piece_image(i) for i in items if i.image}
    if not images:
        return None
    pieces = [(str(i.id), images[str(i.id)].size, i.kind) for i in items if i.image]

    canvas = Image.new('RGBA', CANVAS, BACKGROUND + (255,))
    for key, (x0, y0, x1, y1) in layout(pieces):
        canvas.alpha_composite(images[key].resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0))

    buffer = io.BytesIO()
    canvas.convert('RGB').save(buffer, format='JPEG', quality=88, optimize=True)
    return buffer.getvalue()
