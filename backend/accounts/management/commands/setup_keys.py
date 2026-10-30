import getpass
import re

from django.conf import settings
from django.core.management.base import BaseCommand

KEYS = [
    ('GEMINI_API_KEY', 'Gemini key (https://aistudio.google.com/apikey)'),
    ('SERPAPI_KEY', 'SerpAPI key (https://serpapi.com/manage-api-key)'),
]


class Command(BaseCommand):
    help = 'Saves API keys to backend/.env. Input is hidden; press Enter to keep the current value.'

    def handle(self, *args, **options):
        path = settings.BASE_DIR / '.env'
        text = path.read_text() if path.exists() else ''
        for name, label in KEYS:
            value = getpass.getpass(f'{label}: ').strip()
            if not value:
                continue
            line = f'{name}={value}'
            if re.search(rf'^{name}=.*$', text, flags=re.M):
                text = re.sub(rf'^{name}=.*$', lambda _: line, text, flags=re.M)
            else:
                text = text.rstrip('\n') + f'\n{line}\n'
            self.stdout.write(f'{name} saved.')
        path.write_text(text)
        path.chmod(0o600)
