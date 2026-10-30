# Inside & Out: Workspace Guide

Updated 30 Oct 2026, after completing the APIs (accounts, bag, deployment). Setup details and the API list are in `README.md`.

---

## 1. Start the app

Two terminals, one command each (don't paste `# comments` after commands in zsh):

```bash
cd /Users/apple/trejectory/Inside_out
```
```bash
npm run api
```
```bash
npm run dev
```

Open http://localhost:5173 → **Login Now → Sign Up**. Passwords need 8+ characters and can't be too common (Django checks this).

**To turn on the AI:** put your keys in `backend/.env`, then restart `npm run api`:

```
GEMINI_API_KEY=your-key-from-aistudio.google.com
SERPAPI_KEY=your-key-from-serpapi.com
```

Without keys, everything still works using the built-in rule-based stylist. Screens show **"Quick rules · AI offline"** so you always know which one answered.

---

## 2. The core flow

1. **Upload single pieces** (`/wardrobe/new`). One photo per piece. The photo is resized in the browser, then Django checks it's a real image, shrinks it to 1200px and strips EXIF (phone photos can carry GPS location). Gemini fills in name, category, colours, pattern, seasons and vibes; anything you typed yourself is never overwritten.
2. **New users start empty.** The Dashboard shows a "Build your closet" checklist (a top, a bottom, footwear, an accessory) that ticks off and disappears once the basics are in.
3. **Manifest the Fit** (`/create`). Pick a vibe →
   - Django builds rule-checked candidates: exactly one base (a dress, or a top + a bottom), plus the footwear and 1–2 accessories that coordinate best, and outerwear when the season or vibe calls for it.
   - Colour coordination: neutrals go with anything; monochrome, analogous and complementary colours score well; too many competing accents are penalised.
   - Gemini picks the final look from your closet and explains it. Its answer is **validated**: only your own piece IDs, correct structure. If anything is off, the best rule-based candidate is used instead.
   - **Shuffle** gives a different look; **Wear it today** logs it.
4. **Finalize Look** saves it, and Gemini evaluates it (looking at the photos): score /10, colour harmony, vibe fit, tips, and **0–2 pieces to buy**.
5. **Shop the gap:** each suggested piece has **Find products** → real Google Shopping results via SerpAPI (photo, price, store, link). Results are cached for 24h to save your quota.
6. **Create Outfit Image:** Gemini's image model receives the photos of your pieces and creates an editorial flat-lay of the outfit. It's saved on the look and can be downloaded.
7. **Stylist chat** (bubble on logged-in pages): Gemini sees your closet and the last few messages.

---

## 3. Pages

| URL | Who | What |
|---|---|---|
| `/` | everyone | Landing (your original design, every clickable wired) |
| `/about` | everyone | Your original Dashboard design as the marketing page |
| `/login`, `/signup` | everyone | Session login via Django |
| `/contact` | everyone | Saved to the database; read them at http://127.0.0.1:8000/admin |
| `/dashboard` | logged in | Style hub: favorites slideshow in the arch, newest pieces, onboarding checklist |
| `/collections` | logged in | Search / filter / sort everything (`?view=new` = New In) |
| `/favorites` | logged in | Hearted pieces |
| `/bag` | logged in | Products saved from Shop the gap (🛍 icon) |
| `/profile` | logged in | Name, email, photo, password, delete account |
| `/forgot-password`, `/reset-password` | everyone | Email reset link. Without SMTP settings, the email prints in the `npm run api` terminal |
| `/create` | logged in | Manifest the Fit → Finalize → Evaluate → Shop the gap → Outfit image; saved looks |
| `/wardrobe/new`, `/:id`, `/:id/edit` | logged in | Add, view (wear log, cost per wear), edit, delete |

---

## 4. Security

- Passwords are hashed by Django (PBKDF2). Sessions use an **HttpOnly** cookie that JavaScript can't read.
- **CSRF** protection on every write, including login/signup.
- Every query is limited to the logged-in user. Tests prove you can't read, edit, delete or build a look from someone else's piece.
- Gemini and SerpAPI keys live only in `backend/.env` (git-ignored).
- AI and shopping endpoints are **rate-limited per user** (e.g. 10 outfit images/day, 30 shopping searches/day), so one person can't run up your bill.
- Uploads: file type verified, max 8 MB, re-encoded, EXIF stripped, random file names.
- Shopping links are only shown if they're `https://`; they open in a new tab with `noopener`.

---

## 5. Tests

```bash
npm run lint
```
```bash
npm run api:test
```

44 backend tests cover auth and CSRF, profile, password reset, account deletion, the bag, data isolation, photo cleaning, colour rules, outfit rules, rejecting made-up IDs from Gemini, evaluation, shopping (SerpAPI mocked), image generation (mocked) and chat. The flows were also run in a real browser against gunicorn with debug off, with no sideways scrolling and no console errors, and the Docker image was built and started.

---

## 6. Not tested yet

- **A real email send.** Reset emails were only tested printing to the terminal; try once with your SMTP settings.
- **A real hosting deploy and PostgreSQL.** The Docker image ran locally on SQLite.
- **Real Gemini and SerpAPI responses.** No keys are set here, so those calls were tested with mocks that match the documented API shapes. Once you add keys, try: upload a photo → check the tags, Manifest → Finalize → Find products → Create Outfit Image. If Google renames a model, change `GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL` in `backend/.env`. No code change needed.

---

## 7. Next ideas

1. Send piece **photos** (not only descriptions) to Gemini when picking outfits. That's better for patterns and textures, but costs more per request.
2. Email verification at sign-up.
3. Weather-aware vibes (rain → closed shoes, layers).
4. Replace the footer social URLs and the "Made with ♥ by Gemini" credit with your own.
5. Deploy: Vercel/Netlify (frontend) + Render/Railway (Django + PostgreSQL + cloud storage).
