# Inside & Out

*From your wardrobe to the world.*

Upload your own clothes, pick a vibe, and an AI stylist builds a colour-coordinated outfit from your closet: a top + bottom or a dress, plus footwear and accessories. Gemini scores the final look, suggests pieces to buy (with real shopping links) and creates an image of the outfit.

## Stack

| Part | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 3, Framer Motion, React Router 7 |
| Backend | Django 5.2 + Django REST Framework, SQLite (dev) |
| AI | Gemini API (`google-genai`, Interactions API): tagging, outfit picking, evaluation, chat, outfit images |
| Shopping | SerpAPI Google Shopping |

## Run it locally

You need two terminals.

**1. Backend (first time)**

```bash
cd backend
curl -LsSf https://astral.sh/uv/install.sh | sh   # installs uv, which can fetch Python 3.12
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
cp .env.example .env                              # then fill in DJANGO_SECRET_KEY (and API keys)
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createsuperuser        # optional: for /admin
```

**2. Every time**

```bash
npm run api      # terminal 1: Django on http://127.0.0.1:8000
```
```bash
npm run dev      # terminal 2: app on http://localhost:5173
```

Vite forwards `/api` and `/media` to Django, so the app and API share one origin (session cookie + CSRF, no CORS).

### API keys (optional, in `backend/.env`)

| Key | Without it | With it |
|---|---|---|
| `GEMINI_API_KEY` | Rule-based stylist (colour wheel + vibe/season scoring), colour-only photo tagging, no outfit images | Gemini tags photos, picks and explains outfits, scores looks, chats, generates outfit images |
| `SERPAPI_KEY` | "Shop the gap" links to store search pages (Myntra / Ajio / Amazon for `in`) | Real products with photo, price and link from Google Shopping |

Keys stay on the server. The React app never sees them.

## Tests

```bash
npm run lint
npm run api:test     # 44 Django tests: auth + CSRF, password reset, per-user data isolation, photo cleaning, outfit rules, bag, Gemini/SerpAPI (mocked)
```

## Project structure

```
src/                     React app
  api/client.js          fetch wrapper (session cookie, CSRF, error messages)
  context/               AuthProvider, WardrobeProvider (API-backed), ToastProvider
  pages/                 Landing, About, Login/Signup, Dashboard, Collections, Favorites,
                         Create (Manifest the Fit), Add/Edit/Detail piece, Bag, Profile,
                         Forgot/Reset password, Contact, 404
backend/
  config/                settings (reads backend/.env), urls
  accounts/              signup, login, profile, avatar, password change/reset, delete account, contact, health
  wardrobe/              Item + Look + SavedProduct (bag) models, owner-scoped CRUD, photo validation/EXIF stripping
  stylist/
    colors.py            colour-coordination scoring
    composer.py          rule-based outfit candidates + validation of AI picks
    gemini.py            the only file that talks to Gemini
    shopping.py          SerpAPI Google Shopping (cached 24h)
    views.py             /api/stylist/analyze|outfit|evaluate|shop|image|chat
```

## API overview

| Method | Path | What |
|---|---|---|
| GET | `/api/auth/csrf/` · `/api/auth/me/` | CSRF cookie · current user |
| POST | `/api/auth/signup/` · `login/` · `logout/` | Session auth (Django password validation) |
| PATCH | `/api/auth/profile/` | Edit name/email (email needs current password) |
| POST | `/api/auth/change-password/` | `{currentPassword, newPassword}` |
| POST/DELETE | `/api/auth/avatar/` | Upload / remove profile photo |
| POST | `/api/auth/delete-account/` | `{password}`: deletes account, closet, looks, bag, photos |
| POST | `/api/auth/password-reset/` · `confirm/` | Email a reset link · `{uid, token, password}` |
| GET/POST | `/api/bag/` | Saved products (saving twice returns the existing one) |
| DELETE | `/api/bag/:id/` | Remove from bag |
| GET | `/api/health/` | Status + which services are configured (never the keys) |
| GET/POST | `/api/items/` | List / add pieces (multipart with `image`) |
| GET/PATCH/DELETE | `/api/items/:id/` | One piece |
| POST | `/api/items/mark-worn/` | `{ids}` → wear log |
| GET/POST/PATCH/DELETE | `/api/looks/` | Saved looks |
| POST | `/api/stylist/analyze/` | Photo → suggested name, category, colours, pattern, seasons, vibes |
| POST | `/api/stylist/outfit/` | `{vibe, anchorId?, previousIds?}` → outfit |
| POST | `/api/stylist/evaluate/` | `{lookId}` → score, tips, missing pieces |
| POST | `/api/stylist/shop/` | `{query}` → products |
| POST | `/api/stylist/image/` | `{lookId}` → generated outfit image |
| POST | `/api/stylist/chat/` | `{message, history}` → stylist reply |
| POST | `/api/contact/` | Contact form |

AI and shopping endpoints are rate-limited per user (see `REST_FRAMEWORK` in `backend/config/settings.py`).

## Deploy

The `Dockerfile` builds one service: Django serves the API, the React app and uploaded photos. It runs on any Docker host (Render, Railway, Fly.io). Set these environment variables:

| Variable | Value |
|---|---|
| `DJANGO_DEBUG` | `false` |
| `DJANGO_SECRET_KEY` | a long random string |
| `DJANGO_ALLOWED_HOSTS` | `yourdomain.com` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://yourdomain.com` |
| `FRONTEND_URL` | `https://yourdomain.com` (used in reset emails) |
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY`, `SERPAPI_KEY` | your keys |
| `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | SMTP, for password reset emails |
| `DJANGO_SSL_REDIRECT`, `DJANGO_HSTS_SECONDS` | `true`, `31536000` once HTTPS works |

Mount a persistent disk at `/app/backend/media`, or uploaded photos disappear on restart. Migrations run automatically on start. Run one server for now: photos are on local disk and rate-limit counts are per server.
