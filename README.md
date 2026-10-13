# Wallpaper Studio

A kid-friendly drawing app for making Windows desktop wallpapers. Plain HTML, CSS and JavaScript:
no installs, no internet, no tracking.

## How to open it
Double-click **index.html**. It opens in your default browser (Edge or Chrome work best) and runs offline.

## Making a wallpaper
1. Draw with the tools, add stickers, pick a background.
2. Press the big green **Save to My Computer** button. A 1920x1080 PNG goes to your Downloads folder.
3. In File Explorer, right-click the picture and choose **Set as desktop background**.

Shortcuts: `Ctrl+Z` undo, `Ctrl+Y` redo, `Ctrl+S` save.
Work is autosaved in the browser every few seconds and comes back when the page is reopened.
(It is stored per browser, so use the same browser each time. Clearing browser site data erases it.)

## Changing things (all at the top of `app.js`)
| What | Where |
|---|---|
| Color palette (12 swatches) | `COLORS` |
| Brush sizes (5) | `BRUSH_SIZES` (pixels on the 1920x1080 canvas) |
| Sticker sizes | `STICKER_SIZES` |
| Stickers | `STICKERS` – any emoji, add or remove freely |
| Mascot tips | `TIPS`, and `TIP_SECONDS` for how often they change |
| Undo steps / autosave speed | `MAX_UNDO`, `AUTOSAVE_SECONDS` |
| Background patterns | `BACKGROUNDS` – each has a small `draw(ctx, w, h)` function using canvas code |

Colors of the page itself (cream, tan buttons, green save button) are the variables at the top of `style.css`.
The whole layout scales from `--u`, so it adapts to different window sizes and tablets in landscape.

## Files
`index.html` layout · `style.css` look · `app.js` all behaviour
