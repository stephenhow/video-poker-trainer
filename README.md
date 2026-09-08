# Video Poker Trainer

A browser-based practice trainer for video poker variants. Deal a hand, decide what to
hold, and get scored against the **true mathematically optimal play** -- computed by
brute-force enumeration of every possible draw for every one of the 32 possible hold
decisions, not a heuristic strategy chart.

Play it at: _(add your GitHub Pages URL here once published)_

## How it works

For a dealt 5-card hand, there are 32 possible hold/discard decisions (2^5). For each
one, the trainer enumerates literally every card combination the remaining deck could
produce, tallies the resulting hand-rank distribution, and computes its exact expected
value under the current pay table. The hold with the highest EV is the optimal play --
that's what your choice gets compared against.

This is the same technique (and, for the two games currently implemented, the same
game-rule logic) as the C++ combinatorial analysis engine this project's paytables and
hand-ranking rules were ported from -- just fast enough to run per-hand in a browser
(under half a second worst-case, tested in Node -- see `test.mjs`).

## Running locally

No build step, no dependencies -- it's plain ES modules. Serve the directory with any
static file server and open `index.html`, e.g.:

```
python3 -m http.server 8000
```

To run the correctness/performance self-checks:

```
node test.mjs
```

## Adding a game

Each game is a small module in `js/games/` exporting:

```js
{
  id, name,
  deck: () => [...cards],       // this game's full deck (see js/poker.js)
  ranks: [...names],            // pay table row names, low to high
  defaultPayouts: [...numbers], // one payout per rank, same order
  evalRank(features) { ... }    // classify a 5-card hand's features into a rank index
}
```

`features` comes from `js/handFeatures.js` (`extractFeatures`), which does the bitmask
bookkeeping (per-suit rank masks, pairs/trips/quads, straight/flush/royal lookup
tables) once per hand and exposes cheap predicate functions (`isRF`, `isSF`, `isStr`,
`isFlush`, `quadsCnt`, etc.) for the rank function to use. Register the new module in
`js/games/index.js`.

## Publishing to GitHub Pages

Push this repo to GitHub, then in the repo's Settings -> Pages, set the source to the
`main` branch (root). The site will be live at `https://<user>.github.io/<repo>/`.

## License

MIT -- see `LICENSE`.
