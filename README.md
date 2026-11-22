# Except. — Mastech booth walkthrough

An interactive 3D walkthrough of the concept exhibition stand for the "Except." campaign.
Visitors can look around, turn the warehouse record, and fill in an exception card.

Exhibition concept by Ketan Bhosale. The retail scenario is illustrative.

## What is in this folder

| File | What it is |
|---|---|
| `index.html` | The page |
| `style.css` | Colours, type and layout (Mastech's web typefaces and colours) |
| `main.js` | The 3D scene and the interactions |
| `assets/booth.glb` | The booth model, exported from Blender |
| `assets/fonts/` | Space Grotesk, Inter, JetBrains Mono (open licences) |
| `assets/booth-open.jpg`, `booth-closed.jpg` | Pictures used as the link preview and as a fallback if 3D cannot start |
| `vendor/` | three.js r187 (MIT licence), included so the page needs nothing from other sites |
| `vercel.json` | Small hosting settings for Vercel |

There is no build step. The folder is a plain static website.

## Put it online with GitHub and Vercel

1. On github.com, create a new repository, for example `except-booth`. Keep it empty.
2. On the repository page choose **Add file → Upload files**, drag in everything inside this folder (not the folder itself), and commit.
3. On vercel.com choose **Add New → Project**, pick the repository, and when asked for a framework choose **Other**. Leave every other setting as it is and press **Deploy**.
4. Vercel gives you a link. In **Settings → Domains** you can rename it, for example `except-booth.vercel.app`.

Every later change you upload to GitHub goes live automatically.

## Try it on your own computer first

Opening `index.html` by double-clicking will not work, because browsers block 3D files loaded that way.
In Terminal, go to this folder and run `python3 -m http.server 8000`, then open `http://localhost:8000`.

## How to use the booth

- Drag to look around. Scroll or pinch to move closer.
- Click the record, the green dot on its handle, or **Turn the record**. The **E** key does the same.
- **Aisle**, **Record** and **Table** jump to three viewpoints.
- Click the table or **Fill in a card** to write your own exception and copy it. Nothing is sent anywhere.

## Changing the booth

The model comes from `Mastech-Except-booth.blend`. After editing it in Blender, export it again as
`assets/booth.glb` (File → Export → glTF 2.0, format GLB, with modifiers applied and the record closed).
