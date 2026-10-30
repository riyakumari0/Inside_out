from django.conf import settings
from django.core.management.base import BaseCommand

from stylist import gemini
from stylist.shopping import search_products


class Command(BaseCommand):
    help = 'Makes one real call to Gemini (text and image) and SerpAPI to confirm the keys work.'

    def report(self, name, ok, detail=''):
        style = self.style.SUCCESS if ok else self.style.ERROR
        self.stdout.write(style(f'{"OK  " if ok else "FAIL"} {name}') + (f': {detail}' if detail else ''))

    def handle(self, *args, **options):
        if not settings.GEMINI_API_KEY:
            self.report('Gemini', False, 'GEMINI_API_KEY is empty')
        else:
            try:
                self.report(f'Gemini text ({settings.GEMINI_TEXT_MODEL})', True, gemini.ask_text('Reply with the single word: ready')[:40])
            except gemini.GeminiUnavailable as err:
                self.report(f'Gemini text ({settings.GEMINI_TEXT_MODEL})', False, str(err)[:300])
            try:
                data = gemini.generate_image('A small plain green square.', [], aspect_ratio='1:1')
                self.report(f'Gemini image ({settings.GEMINI_IMAGE_MODEL})', True, f'{len(data)} bytes')
            except gemini.GeminiUnavailable as err:
                self.report(f'Gemini image ({settings.GEMINI_IMAGE_MODEL})', False, str(err)[:300])

        if not settings.SERPAPI_KEY:
            self.report('SerpAPI', False, 'SERPAPI_KEY is empty')
        else:
            products, live = search_products('gold hoop earrings')
            self.report('SerpAPI', live and bool(products), f'{len(products)} products' if live else 'search failed, see the log above')
