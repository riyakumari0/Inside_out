"""Product search for "shop the gap", via SerpAPI's Google Shopping engine."""

import hashlib
import logging
from urllib.parse import quote_plus

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

SERPAPI_URL = 'https://serpapi.com/search'
CACHE_SECONDS = 60 * 60 * 24

# Used when no SerpAPI key is configured: plain store search pages, per country
STORE_SEARCH = {
    'in': [('Myntra', 'https://www.myntra.com/{slug}'), ('Ajio', 'https://www.ajio.com/search/?text={q}'), ('Amazon.in', 'https://www.amazon.in/s?k={q}')],
    'us': [('Amazon', 'https://www.amazon.com/s?k={q}'), ('Nordstrom', 'https://www.nordstrom.com/sr?keyword={q}'), ('ASOS', 'https://www.asos.com/us/search/?q={q}')],
    'gb': [('ASOS', 'https://www.asos.com/search/?q={q}'), ('Amazon.co.uk', 'https://www.amazon.co.uk/s?k={q}'), ('Zara', 'https://www.zara.com/uk/en/search?searchTerm={q}')],
}


def store_links(query):
    stores = STORE_SEARCH.get(settings.SHOPPING_COUNTRY, STORE_SEARCH['us'])
    return [{'title': f'Search "{query}"', 'source': name, 'link': url.format(q=quote_plus(query), slug=quote_plus(query.lower().replace(' ', '-'))), 'price': None, 'thumbnail': None} for name, url in stores]


def search_products(query, max_price=None, limit=6):
    """Returns (products, is_live). Results are cached for a day to save API quota."""
    query = query.strip()[:120]
    if not settings.SERPAPI_KEY:
        return store_links(query), False

    key = 'shop:' + hashlib.sha1(f'{query}|{max_price}|{settings.SHOPPING_COUNTRY}'.encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached, True

    params = {
        'engine': 'google_shopping',
        'q': query,
        'gl': settings.SHOPPING_COUNTRY,
        'hl': settings.SHOPPING_LANGUAGE,
        'api_key': settings.SERPAPI_KEY,
    }
    if max_price:
        params['max_price'] = int(max_price)

    try:
        response = requests.get(SERPAPI_URL, params=params, timeout=15)
        response.raise_for_status()
        results = response.json().get('shopping_results', [])
    except (requests.RequestException, ValueError) as err:
        logger.warning('SerpAPI search failed: %s', err)
        return store_links(query), False

    products = []
    for r in results:
        link = r.get('product_link') or r.get('link')
        if not link or not link.startswith('https://'):
            continue
        products.append({
            'title': r.get('title', '')[:140],
            'source': r.get('source', ''),
            'link': link,
            'price': r.get('price'),
            'thumbnail': r.get('serpapi_thumbnail') or r.get('thumbnail'),
            'rating': r.get('rating'),
        })
        if len(products) == limit:
            break

    cache.set(key, products, CACHE_SECONDS)
    return products, True
