# Poker Night

A home-game helper that runs on a phone. Split the chip box into equal stacks, share the game
with friends, let everyone add their own rebuys and count their own chips, and see who pays whom.

It is a separate app from GiftFit and shares nothing with it. Plain HTML, CSS and JavaScript,
no build step and no dependencies.

## Two ways to play

- **With accounts.** People sign up with a username and password and add each other as friends.
  The host picks friends for a game and it appears on their phones. Each player enters their own
  rebuys and chip count; the host can do it for anyone, and for guests who don't have the app.
- **Without.** Everything stays on one phone and the host enters it all. Same screens, same
  rules: the page runs `core.js` itself instead of calling the server.

## Run it

```
cd poker-night
npm run dev      # the page and the API on http://localhost:4173, data kept in memory
npm test         # the rules in core.js
```

## Put it online (Vercel)

1. New project from this repository, with **Root Directory** set to `poker-night`. No build command.
2. Connect an Upstash Redis database to the project. That sets `KV_REST_API_URL` and
   `KV_REST_API_TOKEN`. Every key starts with `pn:`, so it can be the same database GiftFit uses.
3. On an iPhone, open the site in Safari, tap Share, then "Add to Home Screen".

Without step 2 the site still works, but only the no-account way.

## Files

- `index.html`, `app.css`, `app.js` – the page. One screen at a time, sized to the phone.
- `solver.js` – works out chip values and stacks, and the fewest payments to settle up.
- `core.js` – the rules: friends, shared games, who may change what, counting out. Runs on the
  server and, for no-account play, in the page.
- `api/index.js` – the server: sign-up, login, sessions, then hands over to `core.js`.
- `dev-server.js` – local development only. `test/` – tests for `core.js`.
- `sw.js`, `manifest.webmanifest`, `icons/` – install and offline support. Bump `VERSION` in
  `sw.js` when a file is added or removed.
- `fonts/` – Besley and Hanken Grotesk (SIL Open Font License), bundled so they work offline.

## Known limits

- Accounts have no email, so a forgotten password cannot be reset.
- Other phones catch up every few seconds by asking the server; there is no push.
- On an iPhone, links open in Safari, not in the installed app. Friends added and games shared
  from inside the app show up there on their own.
- Games played without an account stay on that phone and are not moved into an account later.
