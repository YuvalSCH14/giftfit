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
- Set-up is three questions in this order: chip set, players, buy-in. The chip set list is
  shown in every new game (owner's request, 26 Nov 2026) with the saved set on top and the
  last-used one marked, so it is one tap. The last step's button creates the game.
- Only after the game is created does the app say how to organise the table ("Get the table
  ready": numbered do-this steps, then "Start playing"). Don't put instructions before that.
- If the chips, players and buy-in don't work together, the line under the buy-in says so, with
  the one tap that fixes it. There is no separate problem screen.
- Rarely used things live in the menu or a sheet, not on the main screens.
- Problems are shown where they are (the field that is wrong), not as a separate screen.
- Plain words. No poker or software jargon where a normal word will do.

## Releasing

Bump `version.js` and `VERSION` in `sw.js` together (a test checks they match); the home screen
shows the number. Run `npm test`. The project on Vercel is not linked to Git: it is deployed by
uploading this folder.

## Counting chips from a photo (in progress, switched off)

`chipcount.js` reads a side-on photo of chip stacks on the phone; nothing is uploaded. The owner
wants it to save the count at cash-out and expects no mistakes. The rule that follows from that:
a wrong count that claims to be sure is the one unacceptable outcome. When in doubt the stack is
marked "?" and a person checks it; manual entry always stays.

State on 26 Nov 2026, measured on the owner's six sample photos (24 stacks with a known count):
13 right and sure, 3 right but marked "?", 8 wrong but marked "?", none wrong and sure; a photo
taken from steeply above is refused outright. The clean side-on photo is exact (122 chips).
What still fails, always flagged: dark chips on top against a dark background seen from a little
above (the top face cannot be measured), and things right behind a stack (table rail, phone,
cards). The checks were tuned on those six photos, so they are not proven on others. Until it is
measured on more real photos, the Photo button only appears on a phone that opened the app once
with `?photo=1`. `test/chipcount.test.js` uses drawn pictures and guards the logic only.

Claude API test (26 Nov 2026), `api/photo.js` (`POST /api/photo/count`, Claude Opus 5.5, effort
high): only accounts listed in the Vercel variable `PHOTO_AI_USERS` can call it, with daily caps.
The six photos sent twice each (48 stack readings): 32 right, 16 wrong, one of them wrong while
marked sure (bar photo, a 4-chip stack read as 5). About 3.6 cents and 16 seconds per photo.
It got the photo with the wooden rail behind right where the phone counter failed, and failed
others the phone got right. Trusting a stack only when the phone counter and Claude agree gave
22 of 48 trusted, all correct; not much more coverage than the phone counter alone. Not wired
into the app; the owner has to decide whether it is worth it.

Live scanner (26 Nov 2026, the owner's design): the Scan button on the cash-out screen opens
the camera; it says "Point at your stacks", "Stacks detected", "Counting chips", then shows a
checkmark and fills in the count. No numbers on the camera view. Frames are read on the phone
in `scanworker.js`; a stack is believed after three sure readings in a row that agree, and the
scan is done when every stack is. It must feel like scanning a QR code: fast, no decisions.
Tested only with a fake camera playing shaky video made from the six sample photos: the clean
one locks in about 2 seconds, the dim-room one in about 8, the other four never lock (so they
fall back to typing), and nothing wrong was confirmed. Not yet tried on a real phone with real
chips. It is switched on per phone: five quick taps on the version label, or `?photo=1`.

