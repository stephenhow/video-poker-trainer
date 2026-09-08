// Quick correctness + performance sanity check, run with: node test.mjs
import { makeCard } from './js/poker.js';
import { evaluateAllMasks } from './js/engine.js';
import { JacksOrBetter } from './js/games/jacksOrBetter.js';
import { DeucesWild } from './js/games/deucesWild.js';

const WILD = -1;
let failures = 0;
function check(label, cond) {
    if (!cond) { console.error(`FAIL: ${label}`); failures++; }
    else console.log(`ok:   ${label}`);
}
function approx(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

// rank helpers: 0=Deuce..8=Ten,9=Jack,10=Queen,11=King,12=Ace ; suit: 0=c,1=d,2=h,3=s
const T = 8, J = 9, Q = 10, K = 11, A = 12;

console.log('=== Jacks or Better ===');
{
    const t0 = performance.now();
    // pat royal flush, spades
    const dealt = [makeCard(T, 3), makeCard(J, 3), makeCard(Q, 3), makeCard(K, 3), makeCard(A, 3)];
    const { masks, bestMask, bestEv } = evaluateAllMasks(JacksOrBetter, dealt, JacksOrBetter.defaultPayouts);
    check('pat royal: best mask is hold-all (31)', bestMask === 31);
    check('pat royal: EV is exactly 800', approx(bestEv, 800));
    check(`pat royal: mask 31 total draws is 1 (${masks[31].total})`, masks[31].total === 1);
    console.log(`  (${(performance.now() - t0).toFixed(1)}ms)`);
}
{
    // 4-card royal draw: Tc Jc Qc Kc + a dead card (2h) -- should hold the 4 clubs and draw 1
    const t0 = performance.now();
    const dealt = [makeCard(T, 0), makeCard(J, 0), makeCard(Q, 0), makeCard(K, 0), makeCard(0, 2)];
    const { masks, bestMask, bestEv } = evaluateAllMasks(JacksOrBetter, dealt, JacksOrBetter.defaultPayouts);
    check('4-royal draw: best mask holds first 4 (0b11110=30)', bestMask === 30);
    // Ac->royal(800) + 9c->SF(50) + 7 other clubs->flush(6ea=42) + 3 off-suit Aces->straight(4ea=12)
    // + 3 off-suit 9s->straight(4ea=12) + 3 Jacks/Queens/Kings each->JoB pair(1ea=3+3+3), over 47 draws
    const expected = (800 + 50 + 7 * 6 + 3 * 4 + 3 * 4 + 3 * 1 + 3 * 1 + 3 * 1) / 47;
    check(`4-royal draw: EV ${bestEv.toFixed(4)} matches hand-derived ${expected.toFixed(4)}`, approx(bestEv, expected, 1e-6));
    check(`4-royal draw: mask 30 total draws is C(47,1)=47 (${masks[30].total})`, masks[30].total === 47);
    console.log(`  (${(performance.now() - t0).toFixed(1)}ms)`);
}
{
    // full deal-all-5 pass, worst case (mask=0, discard everything) timing
    const t0 = performance.now();
    const dealt = [makeCard(0, 0), makeCard(2, 1), makeCard(4, 2), makeCard(6, 3), makeCard(9, 0)]; // garbage rainbow hand
    const { masks, bestMask, bestEv } = evaluateAllMasks(JacksOrBetter, dealt, JacksOrBetter.defaultPayouts);
    const ms = performance.now() - t0;
    check(`garbage hand: mask 0 total draws is C(47,5)=1533939 (${masks[0].total})`, masks[0].total === 1533939);
    console.log(`  garbage hand (worst case, all 32 masks): ${ms.toFixed(0)}ms, best=0b${bestMask.toString(2).padStart(5, '0')} ev=${bestEv.toFixed(4)}`);
}

console.log('\n=== Deuces Wild ===');
{
    // 4 deuces + a real card -- must always be FOUR_DEUCES (payout 200) regardless of hold
    const dealt = [WILD, WILD, WILD, WILD, makeCard(5, 1)];
    const { bestMask, bestEv } = evaluateAllMasks(DeucesWild, dealt, DeucesWild.defaultPayouts);
    // With all 4 wild-deck entries already dealt, none remain in the deck -- so holding just
    // the 4 wilds and drawing any 1 real card *also* lands on Four Deuces (jokerCnt still 4).
    // Ties are expected here; only the EV is deterministic, not which mask wins the tie.
    check('four deuces: EV is exactly 200', approx(bestEv, 200));
    check(`four deuces: tying mask ${bestMask} also scores 200`, approx(bestEv, 200));
}
{
    // pat natural royal flush (no deuces involved)
    const dealt = [makeCard(T, 2), makeCard(J, 2), makeCard(Q, 2), makeCard(K, 2), makeCard(A, 2)];
    const { bestMask, bestEv } = evaluateAllMasks(DeucesWild, dealt, DeucesWild.defaultPayouts);
    check('natural royal: best mask is hold-all (31)', bestMask === 31);
    check('natural royal: EV is exactly 800', approx(bestEv, 800));
}
{
    // one deuce + 4 to a royal (suited, missing one royal rank) -> wild royal, guaranteed
    const dealt = [WILD, makeCard(J, 1), makeCard(Q, 1), makeCard(K, 1), makeCard(A, 1)];
    const { bestMask, bestEv } = evaluateAllMasks(DeucesWild, dealt, DeucesWild.defaultPayouts);
    check('1-deuce wild royal: best mask is hold-all (31)', bestMask === 31);
    check('1-deuce wild royal: EV is exactly 25', approx(bestEv, 25));
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
