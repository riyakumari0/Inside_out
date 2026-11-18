# Inside & Out

*From your wardrobe to the world.*

**What the app does, and how the newer features work: [FEATURES.md](FEATURES.md).**

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

## Outfit collages

A manifested outfit is shown as one Pinterest-style moodboard (1080×1920) made from the user's own photos, and every saved look keeps one. Each piece is cut out of its photo when it's uploaded, then the cut-outs are laid out on a plain grey canvas: the top sitting on the bottom (or a dress) on the left; bags and accessories, outerwear and footwear down the right. Anything named bag/purse/tote/clutch goes in the accessory column whatever its category. Code: `backend/wardrobe/collage.py`.

- Background removal uses [rembg](https://github.com/danielgatis/rembg) on the server with BiRefNet-lite, plus isnet as a backup and a plain-background flood fill for white-on-white pieces. The models (~400 MB) download to `~/.rembg` the first time. Then only the main item is kept: faint shadows are dropped, and props, petals and other separate objects go, while pairs (two shoes, two earrings) stay.
- Cut-outs are made **in the background**, one at a time (~10–20 s each on a laptop CPU): uploads return at once and collages use the original photo until the cut-out is ready. A collage then takes about 0.1 s. Set `CUTOUT_ENGINE=simple` in `backend/.env` to skip the models.
- When something is *joined* to the piece (a mannequin, a model wearing it, a stand), the piece's page has **Clean up with AI**: Gemini redraws only that piece as a product shot, which is then cut out (counts toward the 10 images/day; small details can change; **Use my photo instead** undoes it). **Original photo** turns the cut-out off for that piece.
- Outfits always have a real top + bottom or a dress: anything named bag/purse/tote/clutch counts as an accessory, even if it was saved as a top.
- Pieces uploaded before this feature: run `cd backend && .venv/bin/python manage.py build_collages` once (`--all` redoes every cut-out).

## Admin panel

Sign up in the app, then make that account an admin:

```bash
cd backend && .venv/bin/python manage.py make_admin you@example.com
```

Log in again (or refresh) and **Admin Panel** appears in the profile menu (`/admin-panel`): overview (members, active this week/today, open complaints), members (search, make/remove admin, deactivate, delete) and **Complaints**: issues members send from Help & Support plus Contact page messages, which you can reply to (shown in the app and emailed) and mark resolved. Admins see counts only, never anyone's closet photos. `--remove` takes admin access away.

## Tests

```bash
npm run lint
npm run api:test     # 72 Django tests: auth + CSRF, data isolation, outfit rules, event outfits, admin panel, support, cut-outs, outfit images, Gemini/SerpAPI (mocked)
```

## Project structure

```
src/                     React app
  api/client.js          fetch wrapper (session cookie, CSRF, error messages)
  context/               AuthProvider, WardrobeProvider (API-backed), ToastProvider
  pages/                 Landing, About, Login/Signup, Dashboard, Collections, Favorites,
                         Create (Manifest the Fit), Add/Edit/Detail piece, Bag, Profile,
                         Forgot/Reset password, Contact, Help & Support, Admin Panel, 404
backend/
  config/                settings (reads backend/.env), urls
  accounts/              signup, login, profile, avatar, password change/reset, delete account, contact, health,
                         Help & Support; admin_views.py (Admin Panel API); make_admin command
  wardrobe/              Item + Look + SavedProduct (bag) models, owner-scoped CRUD, photo validation/EXIF stripping
    collage.py           cut-outs (background removal, main item only) and the outfit image layout
    outfit_images.py     background cut-out queue, keeps look images up to date; build_collages command
  stylist/
    colors.py            colour-coordination scoring
    composer.py          rule-based outfit candidates + validation of AI picks
    gemini.py            the only file that talks to Gemini
    shopping.py          SerpAPI Google Shopping (cached 24h)
    views.py             /api/stylist/analyze|outfit|evaluate|shop|image|collage|collage-preview|clean-photo|chat
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
| POST | `/api/stylist/outfit/` | `{vibe?, event?, anchorId?, previousIds?}` → outfit (`event` is free text, e.g. "cousin's wedding, evening") |
| POST | `/api/stylist/evaluate/` | `{lookId}` → score, tips, missing pieces |
| POST | `/api/stylist/shop/` | `{query}` → products |
| POST | `/api/stylist/image/` | `{lookId}` → generated outfit image |
| POST | `/api/stylist/collage-preview/` | `{itemIds}` → the outfit as one moodboard image (data URL, nothing saved) |
| POST | `/api/stylist/collage/` | `{lookId}` → rebuild a saved look's collage |
| POST | `/api/stylist/clean-photo/` | `{itemId, undo?}` → Gemini redraws only the piece, then it's cut out (or back to the photo) |
| POST | `/api/stylist/chat/` | `{message, history}` → stylist reply |
| POST | `/api/contact/` | Contact form |
| GET | `/api/admin-panel/stats/` | Admin only: totals, pieces by category, popular occasions, latest looks |
| GET | `/api/admin-panel/users/?q=` | Admin only: members with piece/look counts |
| PATCH/DELETE | `/api/admin-panel/users/:id/` | Admin only: `{isActive?, isAdmin?}` · delete account and photos (not your own) |
| GET/POST | `/api/support/` | Members: report an issue `{topic, message}` · list your own with status and replies |
| GET | `/api/admin-panel/messages/?status=open` | Admin only: complaints and contact messages |
| PATCH · DELETE | `/api/admin-panel/messages/:id/` | Admin only: `{reply?, status?}` (a reply is also emailed) · delete |

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
