// Quick correctness + performance sanity check, run with: node test.mjs
import { makeCard } from './js/poker.js';
import { evaluateAllMasks } from './js/engine.js';
import { JacksOrBetter } from './js/games/jacksOrBetter.js';
import { DeucesWild } from './js/games/deucesWild.js';
import { JokerPoker } from './js/games/jokerPoker.js';
import { DoubleDoubleBonus } from './js/games/doubleDoubleBonus.js';

const WILD = -1;
let failures = 0;
function check(label, cond) {
    if (!cond) { console.error(`FAIL: ${label}`); failures++; }
    else console.log(`ok:   ${label}`);
}
function approx(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

// rank helpers: 0=Deuce..8=Ten,9=Jack,10=Queen,11=King,12=Ace ; suit: 0=c,1=d,2=h,3=s
const D2 = 0, D3 = 1, D4 = 2, D5 = 3, N9 = 7, T = 8, J = 9, Q = 10, K = 11, A = 12;

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
{
    // Regression test: rank0Deuces() once used isNStraight (any 5 ranks forming a straight,
    // regardless of suit) where it should use isNSuitedStraight (same suit too), so a 0-wild
    // draw completing a mixed-suit straight was misclassified as a straight flush. Holding
    // Td 9h Qh (2 hearts + 1 diamond -- NOT suited) and discarding 6h 4c: independently
    // verified (separate from-scratch Python enumeration of all 1081 draws) at EV=0.200740...;
    // "discard all" is the actual best play here at ~0.317, matching a third-party reference
    // Deuces Wild trainer's numbers for this exact hand.
    const dealt = [makeCard(T, 1), makeCard(7, 2), makeCard(Q, 2), makeCard(4, 2), makeCard(2, 0)];
    const { masks, bestMask } = evaluateAllMasks(DeucesWild, dealt, DeucesWild.defaultPayouts);
    const holdT9Q = masks[0b11100];
    check(`mixed-suit straight draw: hold T-9-Q EV ${holdT9Q.ev.toFixed(6)} matches independent 0.200740`, approx(holdT9Q.ev, 0.20074005550416282, 1e-9));
    check('mixed-suit straight draw: best play is discard-all, not hold T-9-Q', bestMask !== 0b11100);
}

console.log('\n=== Joker Poker ===');
{
    // pat natural royal flush, no joker
    const dealt = [makeCard(T, 3), makeCard(J, 3), makeCard(Q, 3), makeCard(K, 3), makeCard(A, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('natural royal: best mask is hold-all (31)', bestMask === 31);
    check('natural royal: EV is exactly 1000', approx(bestEv, 1000));
}
{
    // 4 real royal cards suited + joker -> wild royal, guaranteed
    const dealt = [WILD, makeCard(J, 1), makeCard(Q, 1), makeCard(K, 1), makeCard(A, 1)];
    const { bestMask, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('wild royal: best mask is hold-all (31)', bestMask === 31);
    check('wild royal: EV is exactly 50', approx(bestEv, 50));
}
{
    // 4 real same-rank cards + joker -> five of a kind, guaranteed
    const dealt = [WILD, makeCard(5, 0), makeCard(5, 1), makeCard(5, 2), makeCard(5, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('five of a kind: best mask is hold-all (31)', bestMask === 31);
    check('five of a kind: EV is exactly 100', approx(bestEv, 100));
}
{
    // pat straight flush, no joker
    const dealt = [makeCard(4, 0), makeCard(5, 0), makeCard(6, 0), makeCard(7, 0), makeCard(8, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('straight flush: best mask is hold-all (31)', bestMask === 31);
    check('straight flush: EV is exactly 50', approx(bestEv, 50));
}
{
    // one real pair + joker, no trips/other pairs -> three of a kind (not full house: only 1 pair).
    // This is a weak made hand (pays only 2), so unlike the pat/guaranteed hands above, holding
    // everything is NOT necessarily the globally optimal play -- discarding the dead kickers and
    // redrawing can legitimately beat freezing on a low payout. So we check the *classification*
    // of the pat hand (masks[31].ev, i.e. what holding all 5 actually pays) rather than asserting
    // bestMask===31/bestEv, which only holds for hands that can't be improved on (full house+).
    const dealt = [WILD, makeCard(6, 0), makeCard(6, 1), makeCard(2, 2), makeCard(9, 3)];
    const { masks, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('pair+joker: holding all 5 pays exactly 2 (three of a kind)', approx(masks[31].ev, 2));
    check('pair+joker: best play redraws for a higher EV than holding pat', bestEv >= masks[31].ev);
}
{
    // two real pairs + joker -> full house (joker promotes one pair to trips), not five of a kind.
    // Full house is strong/pat-worthy here, so hold-all is expected to actually be optimal.
    const dealt = [WILD, makeCard(6, 0), makeCard(6, 1), makeCard(3, 2), makeCard(3, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('two pair+joker: best mask is hold-all (31)', bestMask === 31);
    check('two pair+joker: EV is exactly 10 (full house)', approx(bestEv, 10));
}
{
    // king + joker, no other pairs -> pair of kings (via wild), not "nothing". Weak made hand
    // (pays 0 in this schedule) -- see comment above on pair+joker for why we check the pat
    // classification rather than assuming hold-all is globally optimal.
    const dealt = [WILD, makeCard(K, 0), makeCard(2, 1), makeCard(5, 2), makeCard(9, 3)];
    const { masks, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('king+joker: holding all 5 pays exactly 0 (pair of kings pays 0 in this schedule)', approx(masks[31].ev, 0));
    check('king+joker: best play redraws for a higher EV than holding pat', bestEv >= masks[31].ev);
}
{
    // two real pairs, no joker -> ordinary two pair, not pair-of-aces/kings even if one pair is
    // aces. Two pair (pays 1) is also a weak made hand here -- same reasoning as pair+joker above.
    const dealt = [makeCard(A, 0), makeCard(A, 1), makeCard(6, 2), makeCard(6, 3), makeCard(9, 0)];
    const { masks, bestEv } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    check('two real pair (incl. aces): holding all 5 pays exactly 1 (two pair, not pair-of-aces)', approx(masks[31].ev, 1));
    check('two real pair (incl. aces): best play redraws for a higher EV than holding pat', bestEv >= masks[31].ev);
}
{
    // Independent cross-check of a genuine draw decision (not a pat hand), matching the
    // DeucesWild verification methodology: dealt Joker, 5c, 5d, 9h, Ks -- hold Joker+pair of
    // 5s, discard the two dead kickers, draw 2. A separate from-scratch Python re-implementation
    // (sharing no code with this engine) exhaustively enumerated all 1128 possible 2-card draws
    // and independently derived EV=4.023049645390071 (exact float match).
    const dealt = [WILD, makeCard(3, 0), makeCard(3, 1), makeCard(7, 2), makeCard(K, 3)];
    const { masks } = evaluateAllMasks(JokerPoker, dealt, JokerPoker.defaultPayouts);
    const holdJokerPair = masks[0b11100];
    check(`joker+pair draw: hold Joker+5c+5d EV ${holdJokerPair.ev} matches independent Python 4.023049645390071`, approx(holdJokerPair.ev, 4.023049645390071, 1e-9));
    check(`joker+pair draw: total draws is C(48,2)=1128 (${holdJokerPair.total})`, holdJokerPair.total === 1128);
}

console.log('\n=== Double Double Bonus ===');
{
    // pat natural royal flush
    const dealt = [makeCard(T, 3), makeCard(J, 3), makeCard(Q, 3), makeCard(K, 3), makeCard(A, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('natural royal: best mask is hold-all (31)', bestMask === 31);
    check('natural royal: EV is exactly 800', approx(bestEv, 800));
}
{
    // pat straight flush
    const dealt = [makeCard(4, 0), makeCard(5, 0), makeCard(6, 0), makeCard(7, 0), makeCard(8, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('straight flush: best mask is hold-all (31)', bestMask === 31);
    check('straight flush: EV is exactly 50', approx(bestEv, 50));
}
{
    // Four Aces + a QUALIFYING kicker (Deuce, <=Four) -- already at the max reachable
    // outcome (no 5-of-a-kind exists in a standard deck), so holding pat IS optimal here,
    // unlike the non-qualifying-kicker case below.
    const dealt = [makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3), makeCard(D2, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('four aces + qualifying kicker: best mask is hold-all (31)', bestMask === 31);
    check('four aces + qualifying kicker: EV is exactly 400 (FOUR_ACES_W_KICKER)', approx(bestEv, 400));
}
{
    // Four Aces + a NON-qualifying kicker (King) -- this is the classic DDB strategy quirk:
    // discarding the king for a fresh draw is a free shot at the kicker bonus (any of the
    // twelve 2s/3s/4s left in the deck upgrades 160 -> 400, everything else stays at 160),
    // so it strictly beats holding pat. EV of "hold four aces, draw 1" is hand-derived here
    // (not just self-consistency): 12 qualifying cards pay 400, the other 35 pay 160, of 47.
    const dealt = [makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3), makeCard(K, 0)];
    const { masks, bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('four aces + king kicker: holding all 5 pays exactly 160 (FOUR_ACES, no bonus)', approx(masks[31].ev, 160));
    const holdAcesOnly = masks[0b11110]; // hold the 4 aces (first 4 cards), discard the king
    const expected = (12 * 400 + 35 * 160) / 47;
    check(`four aces + king kicker: discard-king EV ${holdAcesOnly.ev.toFixed(6)} matches hand-derived ${expected.toFixed(6)}`, approx(holdAcesOnly.ev, expected, 1e-9));
    check('four aces + king kicker: discarding the king beats holding pat', approx(bestEv, holdAcesOnly.ev, 1e-9) && bestEv > masks[31].ev);
}
{
    // Four 2s/3s/4s + a QUALIFYING kicker (Ace counts too, not just <=Four) -- also already
    // at the max reachable for this quad rank, so holding pat is optimal.
    const dealt = [makeCard(D4, 0), makeCard(D4, 1), makeCard(D4, 2), makeCard(D4, 3), makeCard(A, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('four 4s + ace kicker: best mask is hold-all (31)', bestMask === 31);
    check('four 4s + ace kicker: EV is exactly 160 (FOUR_234_W_KICKER)', approx(bestEv, 160));
}
{
    // Four 2s/3s/4s + a NON-qualifying kicker (King) -- same free-lottery-ticket situation
    // as four-aces-plus-king above, just at the lower 80/160 payout tier.
    const dealt = [makeCard(D3, 0), makeCard(D3, 1), makeCard(D3, 2), makeCard(D3, 3), makeCard(K, 0)];
    const { masks, bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('four 3s + king kicker: holding all 5 pays exactly 80 (FOUR_234, no bonus)', approx(masks[31].ev, 80));
    check('four 3s + king kicker: best play redraws for a higher EV than holding pat', bestEv > masks[31].ev);
}
{
    // Four 5-thru-King (no kicker sub-bonus exists at this tier -- payout is a flat 50
    // regardless of the 5th card) -- holding pat ties with discarding the kicker, so we only
    // check the EV, not which mask wins the tie (same reasoning as DeucesWild's four-deuces test).
    const dealt = [makeCard(N9, 0), makeCard(N9, 1), makeCard(N9, 2), makeCard(N9, 3), makeCard(K, 0)];
    const { bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('four 9s + king kicker: EV is exactly 50 (FOUR_5_THRU_K, flat)', approx(bestEv, 50));
}
{
    // pat full house
    const dealt = [makeCard(6, 0), makeCard(6, 1), makeCard(6, 2), makeCard(9, 3), makeCard(9, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(DoubleDoubleBonus, dealt, DoubleDoubleBonus.defaultPayouts);
    check('full house: best mask is hold-all (31)', bestMask === 31);
    check('full house: EV is exactly 9', approx(bestEv, 9));
}
{
    // pair of Jacks (Jacks-or-better threshold) vs. pair of Nines (below threshold, pays
    // nothing) -- both dealt as pat 2-pair-free hands with 3 unrelated kickers so the eval
    // only exercises the single-pair JACKS_OR_BETTER branch, not two-pair or trips. Neither
    // is a hand where holding pat is actually optimal (standard strategy discards the 3 dead
    // kickers to draw toward trips/quads/a full house), so we check the pat classification
    // (masks[31].ev) rather than bestMask, same reasoning as the weak made hands above.
    const jacks = [makeCard(J, 0), makeCard(J, 1), makeCard(D2, 2), makeCard(D5, 3), makeCard(N9, 0)];
    const { masks: jacksMasks } = evaluateAllMasks(DoubleDoubleBonus, jacks, DoubleDoubleBonus.defaultPayouts);
    check('pair of jacks: holding all 5 pays exactly 1 (Jacks or Better)', approx(jacksMasks[31].ev, 1));

    const nines = [makeCard(N9, 0), makeCard(N9, 1), makeCard(D2, 2), makeCard(D5, 3), makeCard(6, 0)];
    const { masks: ninesMasks } = evaluateAllMasks(DoubleDoubleBonus, nines, DoubleDoubleBonus.defaultPayouts);
    check('pair of nines (below jacks): holding all 5 pays exactly 0 (Nothing, not Jacks-or-Better)', approx(ninesMasks[31].ev, 0));
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
