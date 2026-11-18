import getpass
import re

from django.conf import settings
from django.core.management.base import BaseCommand

KEYS = [
    ('GEMINI_API_KEY', 'Gemini key (https://aistudio.google.com/apikey)'),
    ('SERPAPI_KEY', 'SerpAPI key (https://serpapi.com/manage-api-key)'),
]


def problem_with(name, value):
    if re.search(r'[\s\x00-\x1f\x7f]', value):
        return 'it contains spaces or stray keyboard characters. Paste it once, with no arrow keys.'
    half = len(value) // 2
    if any(value == value[:n] * (len(value) // n) for n in range(10, half + 1) if len(value) % n == 0):
        return 'the same text is repeated, so it was probably pasted more than once.'
    if name == 'SERPAPI_KEY' and not re.fullmatch(r'[0-9a-f]{64}', value):
        return 'SerpAPI keys are 64 characters of 0-9 and a-f. Check you copied it from the SerpAPI page.'
    return None


class Command(BaseCommand):
    help = 'Saves API keys to backend/.env. Input is hidden; press Enter to keep the current value.'

    def handle(self, *args, **options):
        path = settings.BASE_DIR / '.env'
        text = path.read_text() if path.exists() else ''
        for name, label in KEYS:
            value = getpass.getpass(f'{label}: ').strip()
            if not value:
                continue
            problem = problem_with(name, value)
            if problem:
                self.stderr.write(f'{name} NOT saved: {problem}')
                continue
            line = f'{name}={value}'
            if re.search(rf'^{name}=.*$', text, flags=re.M):
                text = re.sub(rf'^{name}=.*$', lambda _: line, text, flags=re.M)
            else:
                text = text.rstrip('\n') + f'\n{line}\n'
            self.stdout.write(f'{name} saved.')
        path.write_text(text)
        path.chmod(0o600)
