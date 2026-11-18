"""
Django settings for the Inside & Out API.

Secrets and per-environment values come from backend/.env (see .env.example).
"""

import os
import sys
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    return os.getenv(name, str(default)).lower() in ('1', 'true', 'yes')


def env_list(name, default=''):
    return [v.strip() for v in os.getenv(name, default).split(',') if v.strip()]


DEBUG = env_bool('DJANGO_DEBUG', False)

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('Set DJANGO_SECRET_KEY in backend/.env')
    SECRET_KEY = 'dev-only-insecure-key'

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')
CSRF_TRUSTED_ORIGINS = env_list(
    'DJANGO_CSRF_TRUSTED_ORIGINS',
    # Vite dev server (npm run dev) and preview server (npm run preview)
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173',
)


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'accounts',
    'wardrobe',
    'stylist',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# SQLite locally; set DATABASE_URL (PostgreSQL) in production
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{os.getenv('DJANGO_DB_PATH', BASE_DIR / 'db.sqlite3')}",
        conn_max_age=60,
    ),
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
# The built React app (npm run build), served by Django in production
FRONTEND_DIST = BASE_DIR.parent / 'dist'
WHITENOISE_ROOT = FRONTEND_DIST if FRONTEND_DIST.exists() else None
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage' if DEBUG else 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
MEDIA_ROOT = Path(os.getenv('DJANGO_MEDIA_ROOT', BASE_DIR / 'media'))

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Uploaded clothing photos
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
MAX_UPLOAD_BYTES = 8 * 1024 * 1024

# Session cookie auth; the React app is served from the same origin through the Vite proxy
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = env_bool('DJANGO_SECURE_COOKIES', not DEBUG)
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # hosting platforms terminate HTTPS
    SECURE_HSTS_SECONDS = int(os.getenv('DJANGO_HSTS_SECONDS', '0'))
    SECURE_SSL_REDIRECT = env_bool('DJANGO_SSL_REDIRECT', False)
SECURE_CONTENT_TYPE_NOSNIFF = True

# Outfit collages: 'rembg' cuts pieces out of their photos with an AI model that runs here
# (downloaded once, ~400 MB in total). 'simple' only removes plain, even backgrounds.
CUTOUT_ENGINE = 'simple' if 'test' in sys.argv[1:2] else os.getenv('CUTOUT_ENGINE', 'rembg')  # tests stay fast and offline
TESTING = 'test' in sys.argv[1:2]
CUTOUT_IN_BACKGROUND = not TESTING  # uploads return at once; tests run it inline
CUTOUT_MODEL = os.getenv('CUTOUT_MODEL', 'birefnet-general-lite')  # ~220 MB, crisp edges
CUTOUT_BACKUP_MODEL = os.getenv('CUTOUT_BACKUP_MODEL', 'isnet-general-use')  # ~170 MB, rescues white-on-white pieces

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.ScopedRateThrottle'],
    # AI and shopping calls cost money, so each user gets a budget
    'DEFAULT_THROTTLE_RATES': {
        'auth': '20/hour',
        'analyze': '60/hour',
        'outfit': '40/hour',
        'evaluate': '20/hour',
        'shop': '30/day',
        'image': '10/day',
        'chat': '60/hour',
        'contact': '5/hour',
        'support': '10/hour',
        'collage': '120/hour',
    },
}

# Rate limits and shopping results live here. File-based in production so all
# gunicorn workers share the same counts.
CACHES = {
    'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'} if DEBUG else {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': os.getenv('DJANGO_CACHE_DIR', '/tmp/inside-out-cache'),
    },
}

# Password reset emails. Without SMTP settings they're printed in the Django terminal.
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'Inside & Out <no-reply@localhost>')
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' if EMAIL_HOST else 'django.core.mail.backends.console.EmailBackend'

# Third-party AI / shopping services. Leave a key empty to use the built-in fallback.
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_TEXT_MODEL = os.getenv('GEMINI_TEXT_MODEL', 'gemini-3.8-flash')
GEMINI_IMAGE_MODEL = os.getenv('GEMINI_IMAGE_MODEL', 'gemini-nano-banana-2.1')
SERPAPI_KEY = os.getenv('SERPAPI_KEY', '')
SHOPPING_COUNTRY = os.getenv('SHOPPING_COUNTRY', 'in')
SHOPPING_LANGUAGE = os.getenv('SHOPPING_LANGUAGE', 'en')
