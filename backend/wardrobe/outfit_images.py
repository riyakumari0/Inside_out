"""Keeps each piece's cut-out and each look's collage up to date."""
import logging
import threading
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import close_old_connections, connection

from .collage import build_collage, make_cutout

logger = logging.getLogger(__name__)


def refresh_cutout(item, source=None):
    """Cuts the piece out of its photo, or out of `source` (Gemini's cleaned-up product shot)."""
    if item.cutout:
        item.cutout.delete(save=False)
    if item.image:
        try:
            data = make_cutout(ContentFile(source) if source else item.image)
            item.cutout.save('cutout.png', ContentFile(data), save=False)
        except Exception as err:  # never block saving a piece because of the collage
            logger.error('Cut-out failed for %s: %s', item.id, err)
    item.cutout_ai = bool(source and item.cutout)
    item.use_cutout = True if source else item.use_cutout
    item.save(update_fields=['cutout', 'cutout_ai', 'use_cutout'])


# Cut-outs take several seconds, so they're made one at a time in the background:
# uploads return at once, and collages use the original photo until the cut-out is ready.
_worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix='cutouts')
_pending = set()
_pending_lock = threading.Lock()


def _cutout_job(item_id):
    from .models import Item

    close_old_connections()
    try:
        item = Item.objects.filter(id=item_id).first()
        if item and item.image:
            refresh_cutout(item)
            for look in item.looks.all():
                refresh_collage(look)
    except Exception as err:
        logger.error('Background cut-out failed for %s: %s', item_id, err)
    finally:
        with _pending_lock:
            _pending.discard(item_id)
        connection.close()


def queue_cutout(item):
    """Makes the piece's cut-out (and redraws its looks) in the background, or right away in tests."""
    if not settings.CUTOUT_IN_BACKGROUND:
        refresh_cutout(item)
        for look in item.looks.all():
            refresh_collage(look)
        return
    with _pending_lock:
        if item.id in _pending:
            return
        _pending.add(item.id)
    _worker.submit(_cutout_job, item.id)


def ensure_cutouts(items):
    """Queues cut-outs for older pieces that don't have one yet."""
    for item in items:
        if item.image and not item.cutout:
            queue_cutout(item)


def refresh_collage(look):
    if look.collage:
        look.collage.delete(save=False)
    try:
        data = build_collage(list(look.items.all()))
        if data:
            look.collage.save('collage.jpg', ContentFile(data), save=False)
    except Exception as err:
        logger.error('Collage failed for look %s: %s', look.id, err)
    look.save(update_fields=['collage'])
