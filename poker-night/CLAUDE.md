# Working on Poker Night

## What the owner cares about

The people using this are casual friends at a poker table who "don't like to think a lot".
The owner has said, more than once, that the app got overcomplicated when features were added
literally.

Standing instruction from the owner (25 Nov 2026): **before building anything they ask for,
check whether it could make the flow worse** — an extra step, an extra decision, a screen that
interrupts a game, a jump that skips context. If it could, don't just build the literal request:
find a way to deliver what they want that keeps the flow short and smooth, and say what you did
and why.

Example of getting this wrong: asked to "always show this screen first" about the chip set list,
the list was made a step in every new game. What they meant was: inside chip selection, always
start from the list rather than jumping into the editor. The first reading added a tap to every
game.

## How the flow is meant to feel

- One thing per screen, nothing scrolls, one main button at the bottom.
- Set-up is four taps: players, buy-in, chip set, split. The owner asked (26 Nov 2026) for the
  chip set list to be shown in every new game, saved set on top. Keep it a one-tap step: the
  set used last time is marked, tapping a set moves straight on, and editing stays behind
  "Change your set".
- Rarely used things live in the menu or a sheet, not on the main screens.
- Problems are shown where they are (the field that is wrong), not as a separate screen.
- Plain words. No poker or software jargon where a normal word will do.

## Releasing

Bump `version.js` and `VERSION` in `sw.js` together (a test checks they match); the home screen
shows the number. Run `npm test`. The project on Vercel is not linked to Git: it is deployed by
uploading this folder.
