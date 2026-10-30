"""
Thin wrapper around the Gemini Interactions API (google-genai SDK).

Every call raises GeminiUnavailable on any failure (no key, network, quota,
bad output) so the views can fall back to the rule-based stylist.
"""

import base64
import logging

from django.conf import settings
from pydantic import ValidationError

logger = logging.getLogger(__name__)


class GeminiUnavailable(Exception):
    pass


_client = None


def _get_client():
    global _client
    if not settings.GEMINI_API_KEY:
        raise GeminiUnavailable('GEMINI_API_KEY is not set')
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def image_part(data, mime_type='image/jpeg'):
    return {'type': 'image', 'data': base64.b64encode(data).decode('ascii'), 'mime_type': mime_type}


def _system(system):
    return {'system_instruction': system} if system else {}


def _input(prompt, images):
    if not images:
        return prompt
    return [{'type': 'text', 'text': prompt}, *images]


def ask_json(prompt, schema, images=None, system=None):
    """Asks for JSON matching a Pydantic model and returns a validated instance."""
    client = _get_client()
    try:
        interaction = client.interactions.create(
            model=settings.GEMINI_TEXT_MODEL,
            input=_input(prompt, images),
            **_system(system),
            response_format={'type': 'text', 'mime_type': 'application/json', 'schema': schema.model_json_schema()},
        )
        return schema.model_validate_json(interaction.output_text)
    except ValidationError as err:
        logger.warning('Gemini returned JSON that does not match %s: %s', schema.__name__, err)
        raise GeminiUnavailable('unexpected AI response') from err
    except Exception as err:  # SDK / network / quota errors
        logger.warning('Gemini text call failed: %s', err)
        raise GeminiUnavailable(str(err)) from err


def ask_text(prompt, system=None, images=None):
    client = _get_client()
    try:
        interaction = client.interactions.create(
            model=settings.GEMINI_TEXT_MODEL,
            input=_input(prompt, images),
            **_system(system),
        )
        text = (interaction.output_text or '').strip()
        if not text:
            raise GeminiUnavailable('empty AI response')
        return text
    except GeminiUnavailable:
        raise
    except Exception as err:
        logger.warning('Gemini chat call failed: %s', err)
        raise GeminiUnavailable(str(err)) from err


def generate_image(prompt, images, aspect_ratio='4:5', size='1K'):
    """Returns PNG/JPEG bytes of a generated image."""
    client = _get_client()
    try:
        interaction = client.interactions.create(
            model=settings.GEMINI_IMAGE_MODEL,
            input=_input(prompt, images),
            response_format={'type': 'image', 'aspect_ratio': aspect_ratio, 'image_size': size},
        )
        output = interaction.output_image
        if not output or not output.data:
            raise GeminiUnavailable('no image returned')
        return base64.b64decode(output.data)
    except GeminiUnavailable:
        raise
    except Exception as err:
        logger.warning('Gemini image call failed: %s', err)
        raise GeminiUnavailable(str(err)) from err
