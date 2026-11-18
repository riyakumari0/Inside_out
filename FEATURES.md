# Inside & Out: Feature Guide

*From your wardrobe to the world.*

Users upload their whole wardrobe, one photo per piece. When they have an event, the stylist builds a complete outfit **only from their own clothes** and shows it as one Pinterest-style image. The owner runs the app from an in-app **Admin Panel**: members, activity, and complaints.

Setup, environment variables, the full API list and deployment are in [README.md](README.md). This guide explains what the app does and how the newer parts work.

---

## At a glance

| For | Feature | Where |
|---|---|---|
| Users | Upload pieces; backgrounds are removed automatically | `/wardrobe/new` |
| Users | Outfit for a described event, e.g. "cousin's wedding reception, evening, outdoors" | `/create` |
| Users | The outfit as **one image**, like a Pinterest moodboard | `/create` (preview and saved looks) |
| Users | **Clean up with AI** for photos with a mannequin, model or stand | a piece's page |
| Users | **Help & Support**: report a problem, read the owner's reply | `/support` |
| Owner | **Admin Panel**: members, activity, complaints | `/admin-panel` |

---

## For users

### 1. Build the wardrobe

- One photo per piece at **Add a Piece**. Gemini suggests the name, category, colours, pattern, seasons and vibes; anything typed by hand is kept.
- After upload, the app **cuts the piece out of its photo** in the background (see [How cut-outs work](#how-cut-outs-work)). The upload itself is instant; the cut-out is ready about 10–20 seconds later.
- Best results: **one piece, laid flat or on a hanger, on a plain background**.

### 2. Get an outfit for an event

On **Create → Manifest the Fit**:

1. Pick a vibe (Date Night, Festive, Corporate Chic…) **or** type the event in your own words in **"Or describe your event"**.
2. The stylist builds a complete look from your closet:
   - **always a real top + bottom, or a dress**
   - plus footwear, 1–2 accessories, and outerwear when the season or vibe needs it
   - colours coordinated: neutrals with one accent, analogous or complementary
3. Gemini chooses the final look and explains why it suits the event. Its choice is checked: only your own pieces, correct structure. If anything is off, the best rule-based outfit is used instead.
4. **Shuffle** for another option, **Wear it today** to log it, **Finalize Look** to save it.

Finalizing scores the look out of 10 **for that event**, gives tips, and suggests up to two pieces to buy, with real shopping links.

### 3. The outfit image

The manifested outfit appears as **one image** made from your own photos. Small thumbnails under it open each piece. **Save image** downloads it, and saved looks keep it.

```
+----------------------+--------------+
|                      |  bag         |
|   top                |  earrings    |
|                      |  watch       |
|   ------ gap ------  |              |
|                      |  outerwear   |
|   bottom             |              |
|   (or one dress      |  footwear    |
|    filling the side) |              |
+----------------------+--------------+
        1080 × 1920 (phone / Pinterest shape)
```

- **Nothing overlaps.** Every piece gets its own box, with at least 40 px of empty space to every other piece. A test checks this on 200 random outfits.
- Anything named **bag, purse, tote or clutch** goes in the accessory column, even if it was saved as a top or outerwear.
- **Create Outfit Image** (optional) asks Gemini for a styled flat-lay photo of the look. A **Collage / AI Image** switch flips between the two.

### 4. When a cut-out isn't right

On a piece's page, under **In outfit images**:

| Option | Use it when | What happens |
|---|---|---|
| **Cut-out** (default) | the cut-out looks clean | the outfit image uses the cut-out |
| **Original photo** | the cut-out kept or lost something | the outfit image uses the full photo instead |
| **Clean up with AI** | something is *joined* to the piece: a mannequin, a person wearing it, a stand | Gemini redraws only that piece as a product photo, which is then cut out. The original photo is kept, and **Use my photo instead** undoes it. Uses one of the 10 Gemini images a day; small details can change. |

### 5. Help & Support

Profile menu → **Help & Support**. Pick a topic (Something is broken, Outfits & stylist, Uploading pieces, My account, Something else), describe the problem, and send. Each request shows **Open** or **Resolved** and the owner's reply. Replies are also emailed when SMTP is set up.

---

## For the owner: Admin Panel

### Make yourself an admin

Sign up in the app first, then:

```bash
cd backend && .venv/bin/python manage.py make_admin you@example.com
```

Refresh the app. **Admin Panel** appears in the profile menu. To take access away, use `make_admin you@example.com --remove`.

### What it shows

| Tab | What you can do |
|---|---|
| **Overview** | Members (and new this week), **active this week** and **in the last 24 hours**, open complaints, looks created, pieces uploaded, deactivated accounts, Gemini/shopping status, pieces by category, most-styled occasions, latest looks |
| **Users** | Search by name or email. **Make admin / Remove admin**, **Deactivate / Reactivate** (blocks login and ends their session), **Delete** (removes their closet, looks, bag and photos). You can't change your own account here, so you can't lock yourself out. |
| **Complaints** | Requests from Help & Support plus Contact-page messages, filtered by **Open / Resolved / All**. **Send reply** saves it, shows it to the member and emails them. **Mark resolved / Reopen**, **Delete**. Each message is tagged **Member** or **Visitor**. |

"Active" means the person opened the app, not only that they logged in once. Admins see **counts only, never anyone's wardrobe photos**.

---

## How cut-outs work

Each uploaded photo goes through these steps, one photo at a time, in a background queue:

1. **Main model:** BiRefNet-lite marks which pixels belong to the piece. It's open source and runs on the server.
2. **Rescue for white-on-white pieces:** if the main model lost most of the piece (a cream bag on a white table), the app uses a plain-background flood fill when the photo's corners are all the same colour, and otherwise a second model (isnet).
3. **Crisp edges:** faint, half-transparent pixels such as shadows and reflections are dropped.
4. **Only the main item:** the app picks the object that is big, near the centre, and not running off the photo's edge the way props do. It keeps a matching pair (two shoes, two earrings) and drops the rest, such as petals, plates and specks.
5. The result is cropped to the piece and saved as a transparent PNG. The original photo is never changed.

Until a cut-out is ready, outfit images use the original photo.

**What it can't separate:** anything physically joined to the piece in the photo, like a mannequin, a person wearing it, or a stand. Use **Clean up with AI** or **Original photo** for those.

---

## Settings and commands

| Setting (in `backend/.env`) | Default | Meaning |
|---|---|---|
| `CUTOUT_ENGINE` | `rembg` | `simple` skips the AI models and removes only plain, even backgrounds |
| `CUTOUT_MODEL` | `birefnet-general-lite` | main background-removal model (~220 MB, downloaded once to `~/.rembg`) |
| `CUTOUT_BACKUP_MODEL` | `isnet-general-use` | backup for white-on-white pieces (~170 MB); empty to turn off |

| Command (run in `backend/`) | What it does |
|---|---|
| `.venv/bin/python manage.py make_admin you@example.com` | gives an account Admin Panel access (`--remove` takes it away) |
| `.venv/bin/python manage.py build_collages` | makes missing cut-outs and rebuilds every look's image |
| `.venv/bin/python manage.py build_collages --all` | redoes every cut-out, except ones cleaned up with AI |

### Daily limits per user

| Action | Limit |
|---|---|
| AI images (Create Outfit Image, Clean up with AI) | 10 / day |
| Shopping searches | 30 / day |
| Outfit images (collages) | 120 / hour |
| Outfits manifested | 40 / hour |
| Help & Support requests | 10 / hour |

---

## Tips for the best results

- Photograph **one piece at a time**, flat or on a hanger, on a plain background, and fill most of the frame.
- Give accessories clear names (*Gold Watch*, *White Purse*) and set the right category. A purse saved as a **Top** still works, but the category should say **Accessory**.
- If a piece looks wrong in outfit images, open it and try **Clean up with AI** or **Original photo**.

---

## Tests

```bash
npm run lint
npm run api:test
```

72 backend tests. Besides the original coverage (auth, CSRF, data isolation, outfit rules, Gemini and shopping with mocks), they cover:

- event outfits: the event is detected, sent to Gemini and saved with the look
- every outfit has a real top + bottom or a dress, even when a purse is saved as a top
- the admin panel: access control, deactivate, delete, no self-changes, active-user counts
- Help & Support: members see only their own requests; replies, email and status
- cut-outs: transparent background, main item only, shadows dropped, fallback for white-on-white pieces, AI clean-up and undo
- outfit images: layout, no overlaps across 200 random outfits, preview saves nothing, redraw on changes, files cleaned up

---

## Where the code lives

| Area | Files |
|---|---|
| Event outfits | `backend/stylist/views.py` (`OutfitView`), `src/pages/CreatePage.jsx` |
| Whole-outfit rules | `backend/wardrobe/models.py` (`Item.kind`), `backend/stylist/composer.py` |
| Outfit image | `backend/wardrobe/collage.py` (`layout`, `build_collage`), `src/pages/CreatePage.jsx` (`OutfitCollage`) |
| Cut-outs | `backend/wardrobe/collage.py` (`make_cutout`, `clean_mask`), `backend/wardrobe/outfit_images.py` (background queue) |
| AI clean-up | `backend/stylist/views.py` (`CleanPhotoView`), `src/pages/ItemPage.jsx` |
| Admin Panel | `backend/accounts/admin_views.py`, `src/pages/AdminPage.jsx`, `backend/accounts/management/commands/make_admin.py` |
| Help & Support | `backend/accounts/views.py` (`SupportView`), `src/pages/SupportPage.jsx` |
