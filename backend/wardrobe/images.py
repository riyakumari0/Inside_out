import io

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

MAX_SIDE = 1200


def clean_upload(upload):
    """
    Validates an uploaded photo and re-encodes it as a JPEG:
    rejects non-images and oversized files, fixes phone rotation,
    caps the size, and drops EXIF metadata (which can include GPS location).
    """
    if upload.size > settings.MAX_UPLOAD_BYTES:
        raise serializers.ValidationError('Photo is too large (max 8 MB).')
    try:
        img = Image.open(upload)
        img.verify()
        upload.seek(0)
        img = Image.open(upload)
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise serializers.ValidationError('That file is not a readable image.')

    if img.mode in ('RGBA', 'LA', 'P'):
        # Cut-out PNGs get a white backdrop instead of turning black
        img = img.convert('RGBA')
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        img = background
    else:
        img = img.convert('RGB')
    img.thumbnail((MAX_SIDE, MAX_SIDE))

    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=85, optimize=True)
    return ContentFile(buffer.getvalue(), name='upload.jpg')


def image_bytes(field_file):
    """Raw JPEG bytes for sending a stored photo to Gemini."""
    with field_file.open('rb') as f:
        return f.read()
