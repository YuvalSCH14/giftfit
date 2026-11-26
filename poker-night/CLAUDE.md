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

State on 26 Nov 2026: exact on the owner's first sample (122 chips, 6 stacks) and on the drawn
tests in `test/chipcount.test.js`. Not yet handled: a photo taken from a little above, where the
visible top face of a stack can be read as one more chip. Until that is solved and measured on
real photos, the Photo button only appears on a phone that opened the app once with `?photo=1`.

