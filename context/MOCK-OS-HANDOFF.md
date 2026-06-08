# Mock OS Website — Agent Hand-Off Document

## PROJECT OVERVIEW

Build a standalone mock operating system website, visually similar to a desktop OS, deployable via a public URL. The client provided a reference screenshot showing a forest background with pixel-art-style clickable icons (maps, journal, friends list, sunseeker) arranged in the top-left corner of the screen.

This is a **static single-page application**. There is no e-commerce, no backend, no user accounts.

---

## VISUAL REFERENCE

- Full-screen background image (static, no scroll)
- Clickable icons arranged on the "desktop" (similar to OS desktop icons — image + label beneath)
- Icons are draggable around the screen
- Clicking an icon opens a **draggable, resizable window**
- Windows have a title bar with minimize, maximize, and close controls
- Windows can display text, images, or video as content
- Up to 4 icons initially, up to ~10 eventually

---

## RECOMMENDED STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Code | Plain HTML / CSS / JS | No framework needed |
| Version Control | GitHub | Required for Vercel deployment |
| Hosting | Vercel | Free tier, auto-deploys on push |
| CMS (Phase 2) | Sanity | Free tier, non-developer-friendly Studio UI |
| Domain | Custom domain | Connect via Vercel dashboard DNS settings |

---

## DEPLOYMENT PIPELINE

1. Create a GitHub repository for this project
2. Connect the GitHub repo to Vercel (one-time, done via vercel.com dashboard — "Import Project")
3. Every `git push` to the main branch auto-deploys to Vercel
4. Vercel provides a `.vercel.app` URL immediately; connect the custom domain in Project Settings → Domains
5. Custom domain: add a CNAME record pointing to `cname.vercel-dns.com` at your DNS provider

No server needs to run locally. Local development is just opening `index.html` in a browser or using a simple local server (`npx serve .` or VS Code Live Server).

---

## FILE STRUCTURE

```
project-root/
├── index.html          # Single page — everything lives here
├── style.css           # All styles
├── app.js              # All JavaScript logic
└── assets/
    ├── background.jpg  # Desktop background image
    └── icons/          # Icon images (PNG with transparency recommended)
        ├── maps.png
        ├── journal.png
        ├── friends-list.png
        └── sunseeker.png
```

---

## EXISTING REFERENCE: archive.liquid

The client has a Shopify theme (`archive.liquid`) that implements an identical windowing system. You are being given this file as a reference. **Do not modify it.** Extract the logic described below and adapt it to plain HTML/JS — stripping all Liquid templating syntax (`{% %}`, `{{ }}`).

### What to extract from archive.liquid

#### 1. Window HTML Structure (lines ~37–90 per window)
The folder window markup pattern. In the plain HTML version, hardcode one `<div class="folder-window">` per icon. The key structure is:

```html
<div id="window-maps" class="folder-window" style="display: none;">
  <div class="folder-window__inner">
    <div class="folder-window__title-bar">
      <span class="folder-window__title">Maps</span>
      <div class="folder-window__controls">
        <!-- SVG with minimize, maximize, close buttons — copy the exact SVG from archive.liquid -->
      </div>
    </div>
    <div class="folder-window__content">
      <!-- window body content here -->
    </div>
    <!-- 8 resize handles — copy exactly from archive.liquid -->
    <div class="resize-handle resize-handle-top"></div>
    <div class="resize-handle resize-handle-right"></div>
    <div class="resize-handle resize-handle-bottom"></div>
    <div class="resize-handle resize-handle-left"></div>
    <div class="resize-handle resize-handle-top-left"></div>
    <div class="resize-handle resize-handle-top-right"></div>
    <div class="resize-handle resize-handle-bottom-left"></div>
    <div class="resize-handle resize-handle-bottom-right"></div>
  </div>
</div>
```

**What to ignore:** The Liquid `{% for file in shop.metaobjects... %}` loops inside `.folder-window__content`. Replace those with static hardcoded content appropriate to each window.

#### 2. makeWindowDraggable() — extract verbatim (~lines 1150–1220)
This function attaches mousedown/touchstart drag logic to the title bar. It uses a `highestZIndex` counter to bring the active window to front. The boundary constraints reference `borderTop`, `borderLeft`, `borderRight`, `borderBottom` — adapt those values to your layout (no Shopify page border exists in the new project, so use `0` for all sides or a small padding).

#### 3. makeWindowResizable() — extract verbatim (after makeWindowDraggable)
This attaches the 8 resize handle drag logic. Extract as-is.

#### 4. setupWindowControls() — extract verbatim
Handles minimize (hide window), maximize (toggle fullscreen), and close (remove from DOM / hide). Extract as-is.

#### 5. Icon drag + click logic (~lines 410–540)
The folder icon dragging logic (mousedown → mousemove → mouseup) with a `hasMoved` flag that distinguishes a click from a drag. If `hasMoved` is false on mouseup, it's a click → open window. Extract this pattern for the desktop icons.

**What to ignore from icons:** The `randomX`/`randomY` initial positioning logic. In the new project, icons have fixed positions (laid out like the reference screenshot, top-left area).

#### 6. openFolderWindow() — adapt (~lines 542–640)
This handles positioning the window near the clicked icon and calling the drag/resize/controls setup. Adapt it — the Shopify-specific boundary calculations (`(1.375 + 2) * 16 * 2` for header height) should be replaced with simple values like `0` or `16` since there's no Shopify header.

#### 7. CSS — extract all `.folder-window`, `.folder-window__*`, `.resize-handle`, `.folder-icon`, `.folder-icon__*` rules
These are defined in the `{% stylesheet %}` block at the bottom of archive.liquid. Copy them directly into `style.css`. Remove any Liquid variable references (e.g., `{{ section.settings.text_color }}` → replace with a hardcoded color value).

---

## WHAT TO BUILD FROM SCRATCH (NOT IN archive.liquid)

#### Desktop Icon Component
The archive page uses a `folder-icon` snippet (a separate Shopify file not in archive.liquid). Build this as a simple HTML structure:

```html
<div class="desktop-icon" data-window="maps">
  <img src="assets/icons/maps.png" alt="Maps">
  <span class="desktop-icon__label">maps</span>
</div>
```

Style: icon image on top, label centered below. Match the reference screenshot aesthetic — pixel art style icons, small text label, no background on the icon itself.

#### Desktop / Background
```css
body {
  margin: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-image: url('assets/background.jpg');
  background-size: cover;
  background-position: center;
}
```

#### Content Data (Hardcoded for Phase 1)
Since there's no CMS yet, hardcode window content directly in HTML. Each window's `.folder-window__content` div gets static HTML — paragraphs of text, `<img>` tags, or `<video>` tags.

---

## PHASE 2: CMS INTEGRATION (Sanity)

When the client is ready to make content editable by a non-developer:

1. Create a free Sanity project at sanity.io
2. Define a schema with a `desktopIcon` document type containing:
   - `title` (string) — icon label
   - `iconImage` (image)
   - `windowContent` (array of blocks: text, image, video)
3. Use the Sanity HTTP API (no SDK needed for a static site) to fetch content on page load
4. Replace the hardcoded window content with dynamically rendered content from the API

**Design the Phase 1 HTML with this in mind:** Keep window content generation in a dedicated JS function (e.g., `renderWindowContent(iconId, contentArray)`) so that swapping from hardcoded data to Sanity API data only requires changing what's passed into that function, not restructuring the entire app.

---

## BOUNDARY / CONSTRAINT VALUES

In archive.liquid, the boundary calculations reference Shopify's page border (a fixed white frame). In the new project, use these simplified values:

```javascript
const borderTop = 16;     // 16px top padding
const borderLeft = 16;    // 16px left padding  
const borderRight = window.innerWidth - 16;
const borderBottom = window.innerHeight - 16;
```

---

## STEP-BY-STEP BUILD ORDER

1. **Scaffold** — Create `index.html`, `style.css`, `app.js`, `assets/` folder structure
2. **Background** — Full-screen background image, `overflow: hidden` on body
3. **Icons** — 4 desktop icons positioned in top-left area, matching the reference screenshot layout
4. **Window HTML** — Add the 4 hidden `.folder-window` divs with hardcoded content
5. **Window CSS** — Extract and adapt all window/resize-handle styles from archive.liquid
6. **Icon drag logic** — Extract and adapt the folder icon drag + click handler from archive.liquid
7. **makeWindowDraggable()** — Extract and adapt from archive.liquid
8. **makeWindowResizable()** — Extract and adapt from archive.liquid
9. **setupWindowControls()** — Extract and adapt from archive.liquid
10. **openWindow()** — Wire icon clicks to show the correct window, position it, initialize drag/resize/controls
11. **GitHub repo** — Initialize git, push to GitHub
12. **Vercel deploy** — Import repo on vercel.com, confirm deployment works
13. **Custom domain** — Add domain in Vercel Project Settings, configure DNS CNAME record

---

## NOTES FOR THE AGENT

- The client is familiar with this codebase (ITYAWR Shopify theme). They understand windowing systems and how drag/resize/z-index management works. No need to over-explain these concepts.
- Do not introduce any framework (React, Vue, etc.). Plain HTML/CSS/JS only.
- Do not add unnecessary abstraction. This is a small, focused project.
- The client values precision and controlled changes. Make changes incrementally and confirm understanding before proceeding.
- The client will want to eventually support mobile. Keep that in mind but do not build it in Phase 1.
- Game content (doom clone, brick breaker, snake) from archive.liquid is **not** required for this project. Ignore all game-related code.
