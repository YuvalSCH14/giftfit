# Poker Night

A home-game helper that runs on a phone: split the chip box into equal stacks, seat the table,
track rebuys, count out at the end and see who pays whom. Everything is saved on the device;
there is no server and no account.

It is a separate app from GiftFit and shares nothing with it. Plain HTML, CSS and JavaScript,
no build step.

## Run it

```
cd poker-night
python3 -m http.server 4173   # then open http://localhost:4173
```

## Put it on a phone

Host this folder on any static host over HTTPS (on Vercel: a new project with Root Directory
set to `poker-night`, no build command). On an iPhone open it in Safari, tap Share, then
"Add to Home Screen". It then opens full-screen and works offline.

## Files

- `index.html`, `app.css` – the page and its styles, written for a phone first.
- `solver.js` – works out chip values and stacks, and the fewest payments to settle up. No page code.
- `app.js` – the page logic. State lives in one object in `localStorage`.
- `sw.js`, `manifest.webmanifest`, `icons/` – install and offline support. Bump `VERSION` in
  `sw.js` when a file is added or removed.
- `fonts/` – Besley and Hanken Grotesk (SIL Open Font License), bundled so they work offline.
