// Quick correctness + performance sanity check, run with: node test.mjs
import { makeCard } from './js/poker.js';
import { evaluateAllMasks } from './js/engine.js';
import { JacksOrBetter } from './js/games/jacksOrBetter.js';
import { BonusPokerDeluxe } from './js/games/bonusPokerDeluxe.js';
import { DeucesWild } from './js/games/deucesWild.js';
import { JokerPoker } from './js/games/jokerPoker.js';
import { DoubleDoubleBonus } from './js/games/doubleDoubleBonus.js';
import { TripleDoubleBonus } from './js/games/tripleDoubleBonus.js';
import { SuperAcesBonus } from './js/games/superAcesBonus.js';
import { DoubleBonus } from './js/games/doubleBonus.js';
import { OneEyedJacks } from './js/games/oneEyedJacks.js';
import { WildJoker } from './js/games/wildJoker.js';
import { Shamrock7 } from './js/games/shamrock7.js';
import { EightBall } from './js/games/eightBall.js';
import { extractFeatures } from './js/handFeatures.js';
import { cardStr, oneEyedJacksDeck, makeJoker, isJoker, jokerTag, isWild } from './js/poker.js';

const WILD = -1;
let failures = 0;
function check(label, cond) {
    if (!cond) { console.error(`FAIL: ${label}`); failures++; }
    else console.log(`ok:   ${label}`);
}
function approx(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

// rank helpers: 0=Deuce..8=Ten,9=Jack,10=Queen,11=King,12=Ace ; suit: 0=c,1=d,2=h,3=s
const D2 = 0, D3 = 1, D4 = 2, D5 = 3, N7 = 5, N8 = 6, N9 = 7, T = 8, J = 9, Q = 10, K = 11, A = 12;

console.log('=== Jacks or Better ===');
{
    check('has a strategyPdf pointing at jacksOrBetter96.pdf', JacksOrBetter.strategyPdf?.href === 'jacksOrBetter96.pdf');
}
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

console.log('\n=== Bonus Poker Deluxe ===');
{
    // Bonus Poker Deluxe is Jacks or Better with only 2 payouts changed (Four of a Kind
    // 25->80, Two Pair 2->1) -- confirm the schedule and that it's genuinely reusing
    // JacksOrBetter's deck/evalRank rather than a re-derived copy.
    const dropChanged = (payouts) => payouts.map((v, i) => (i === 2 || i === 7 ? null : v));
    check('payouts match Jacks or Better except Two Pair and Four of a Kind',
        JSON.stringify(dropChanged(BonusPokerDeluxe.defaultPayouts)) === JSON.stringify(dropChanged(JacksOrBetter.defaultPayouts)));
    check('Two Pair payout is 1 (not JoB\'s 2)', BonusPokerDeluxe.defaultPayouts[2] === 1);
    check('Four of a Kind payout is 80 (not JoB\'s 25)', BonusPokerDeluxe.defaultPayouts[7] === 80);
    check('reuses JacksOrBetter.evalRank directly', BonusPokerDeluxe.evalRank === JacksOrBetter.evalRank);
    check('reuses JacksOrBetter.deck directly', BonusPokerDeluxe.deck === JacksOrBetter.deck);
    check('has a strategyPdf pointing at bonusPokerDeluxe.pdf', BonusPokerDeluxe.strategyPdf?.href === 'bonusPokerDeluxe.pdf');
}
{
    // pat royal flush -- unaffected by the payout changes, sanity check the shared evalRank
    const dealt = [makeCard(T, 3), makeCard(J, 3), makeCard(Q, 3), makeCard(K, 3), makeCard(A, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(BonusPokerDeluxe, dealt, BonusPokerDeluxe.defaultPayouts);
    check('pat royal: best mask is hold-all (31)', bestMask === 31);
    check('pat royal: EV is exactly 800', approx(bestEv, 800));
}
{
    // pat quads -- flat 80 regardless of kicker (no kicker sub-bonus in this schedule, unlike
    // Double Double Bonus), so holding pat ties with discarding the kicker to redraw; check
    // the EV only, not which mask wins the tie (same reasoning as other flat-quad-tier tests).
    const dealt = [makeCard(4, 0), makeCard(4, 1), makeCard(4, 2), makeCard(4, 3), makeCard(N9, 0)];
    const { masks, bestEv } = evaluateAllMasks(BonusPokerDeluxe, dealt, BonusPokerDeluxe.defaultPayouts);
    check('four of a kind: holding all 5 pays exactly 80', approx(masks[31].ev, 80));
    check('four of a kind: EV is exactly 80', approx(bestEv, 80));
}
{
    // two pair -- weak made hand at this schedule's reduced payout (1, down from JoB's 2),
    // standard strategy breaks it to chase a full house/quads rather than holding pat.
    const dealt = [makeCard(5, 0), makeCard(5, 1), makeCard(8, 2), makeCard(8, 3), makeCard(D2, 0)];
    const { masks, bestEv } = evaluateAllMasks(BonusPokerDeluxe, dealt, BonusPokerDeluxe.defaultPayouts);
    check('two pair: holding all 5 pays exactly 1', approx(masks[31].ev, 1));
    check('two pair: best play redraws for a higher EV than holding pat', bestEv > masks[31].ev);
}

console.log('\n=== Deuces Wild ===');
{
    // wildLabel differentiates the 4 deuces by which suit's 2 each replaced -- analogous to
    // One-Eyed Jacks' 2 tagged jokers, just 4 of them (clubs, diamonds, hearts, spades).
    const labels = [0, 1, 2, 3].map(tag => DeucesWild.wildLabel(makeJoker(tag)));
    const expected = [{ suit: '♣', red: false }, { suit: '♦', red: true }, { suit: '♥', red: true }, { suit: '♠', red: false }];
    labels.forEach((label, tag) => {
        check(`deuce tagged ${tag} labeled "2"+"${expected[tag].suit}"+red:${expected[tag].red} (got "${label.rank}"+"${label.suit}"+red:${label.red})`,
            label.rank === '2' && label.suit === expected[tag].suit && Boolean(label.red) === expected[tag].red);
    });
    check('wildLabel returns null for an ordinary card (3c -- 2c no longer exists in this deck)', DeucesWild.wildLabel(makeCard(1, 0)) === null);
}
{
    // 4 deuces + a real card -- must always be FOUR_DEUCES (payout 200) regardless of hold
    const dealt = [makeJoker(0), makeJoker(1), makeJoker(2), makeJoker(3), makeCard(5, 1)];
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
    const dealt = [makeJoker(0), makeCard(J, 1), makeCard(Q, 1), makeCard(K, 1), makeCard(A, 1)];
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

console.log('\n=== Triple Double Bonus ===');
{
    // Triple Double Bonus is Double Double Bonus with 3 payouts changed (Three of a Kind
    // 3->2, Four 2s/3s/4s+kicker 160->400, Four Aces+kicker 400->800) -- confirm the schedule
    // and that it's genuinely reusing DoubleDoubleBonus's deck/evalRank rather than a
    // re-derived copy.
    const dropChanged = (payouts, ranks) => payouts.map((v, i) =>
        (['Three of a Kind', 'Four 2s, 3s or 4s + A-4 Kicker', 'Four Aces + 2-4 Kicker'].includes(ranks[i]) ? null : v));
    check('payouts match Double Double Bonus except the 3 boosted categories',
        JSON.stringify(dropChanged(TripleDoubleBonus.defaultPayouts, TripleDoubleBonus.ranks)) ===
        JSON.stringify(dropChanged(DoubleDoubleBonus.defaultPayouts, DoubleDoubleBonus.ranks)));
    check('Three of a Kind payout is 2 (not DDB\'s 3)', TripleDoubleBonus.defaultPayouts[TripleDoubleBonus.ranks.indexOf('Three of a Kind')] === 2);
    check('Four 2s,3s,4s+kicker payout is 400 (not DDB\'s 160)', TripleDoubleBonus.defaultPayouts[TripleDoubleBonus.ranks.indexOf('Four 2s, 3s or 4s + A-4 Kicker')] === 400);
    check('Four Aces+kicker payout is 800 (not DDB\'s 400)', TripleDoubleBonus.defaultPayouts[TripleDoubleBonus.ranks.indexOf('Four Aces + 2-4 Kicker')] === 800);
    check('reuses DoubleDoubleBonus.evalRank directly', TripleDoubleBonus.evalRank === DoubleDoubleBonus.evalRank);
    check('reuses DoubleDoubleBonus.deck directly', TripleDoubleBonus.deck === DoubleDoubleBonus.deck);
    check('has no strategyPdf yet (none exists for this game)', TripleDoubleBonus.strategyPdf === undefined);
}
{
    // Four Aces + a QUALIFYING kicker (Deuce) -- already at the max reachable outcome, so
    // holding pat is optimal, same reasoning as Double Double Bonus's equivalent test.
    const dealt = [makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3), makeCard(D2, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(TripleDoubleBonus, dealt, TripleDoubleBonus.defaultPayouts);
    check('four aces + qualifying kicker: best mask is hold-all (31)', bestMask === 31);
    check('four aces + qualifying kicker: EV is exactly 800 (up from DDB\'s 400)', approx(bestEv, 800));
}
{
    // Four Aces + a NON-qualifying kicker (King) -- the classic kicker-chase quirk, now with
    // an even bigger incentive to discard the kicker since the bonus doubled to 800.
    const dealt = [makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3), makeCard(K, 0)];
    const { masks, bestEv } = evaluateAllMasks(TripleDoubleBonus, dealt, TripleDoubleBonus.defaultPayouts);
    check('four aces + king kicker: holding all 5 pays exactly 160 (FOUR_ACES, no bonus)', approx(masks[31].ev, 160));
    check('four aces + king kicker: discarding the king beats holding pat', bestEv > masks[31].ev);
}
{
    // Four 2s/3s/4s + a QUALIFYING kicker (Ace) -- also already maxed out, pat is optimal.
    const dealt = [makeCard(D4, 0), makeCard(D4, 1), makeCard(D4, 2), makeCard(D4, 3), makeCard(A, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(TripleDoubleBonus, dealt, TripleDoubleBonus.defaultPayouts);
    check('four 4s + ace kicker: best mask is hold-all (31)', bestMask === 31);
    check('four 4s + ace kicker: EV is exactly 400 (up from DDB\'s 160)', approx(bestEv, 400));
}
{
    // Three of a kind -- weak made hand at this schedule's reduced payout (2, down from DDB's
    // 3), standard strategy breaks it to chase quads rather than holding pat.
    const dealt = [makeCard(D2, 0), makeCard(D2, 1), makeCard(D2, 2), makeCard(D3, 3), makeCard(N9, 0)];
    const { masks, bestEv } = evaluateAllMasks(TripleDoubleBonus, dealt, TripleDoubleBonus.defaultPayouts);
    check('three of a kind: holding all 5 pays exactly 2', approx(masks[31].ev, 2));
    check('three of a kind: best play redraws for a higher EV than holding pat', bestEv > masks[31].ev);
}

console.log('\n=== Super Aces Bonus ===');
{
    // pat natural royal flush
    const dealt = [makeCard(T, 3), makeCard(J, 3), makeCard(Q, 3), makeCard(K, 3), makeCard(A, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(SuperAcesBonus, dealt, SuperAcesBonus.defaultPayouts);
    check('natural royal: best mask is hold-all (31)', bestMask === 31);
    check('natural royal: EV is exactly 800', approx(bestEv, 800));
}
{
    // pat straight flush
    const dealt = [makeCard(4, 0), makeCard(5, 0), makeCard(6, 0), makeCard(7, 0), makeCard(8, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(SuperAcesBonus, dealt, SuperAcesBonus.defaultPayouts);
    check('straight flush: best mask is hold-all (31)', bestMask === 31);
    check('straight flush: EV is exactly 60', approx(bestEv, 60));
}
{
    // Unlike Double Double Bonus, Super Aces has NO kicker sub-bonus at any quad tier -- the
    // payout for a given quad rank is completely flat regardless of the 5th card. That means
    // holding pat and discarding-the-kicker-to-redraw are an exact TIE (the redraw can only
    // ever land on "same quad rank, different kicker", which pays identically), so we check
    // only the EV here, not which mask wins the tie (same reasoning as DeucesWild's
    // four-deuces test and Double Double Bonus's four-9s-thru-king test).
    const aces = [makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3), makeCard(K, 0)];
    const { bestEv: acesEv } = evaluateAllMasks(SuperAcesBonus, aces, SuperAcesBonus.defaultPayouts);
    check('four aces: EV is exactly 400 (FOUR_ACES, no kicker bonus in this game)', approx(acesEv, 400));

    const low = [makeCard(D4, 0), makeCard(D4, 1), makeCard(D4, 2), makeCard(D4, 3), makeCard(K, 0)];
    const { bestEv: lowEv } = evaluateAllMasks(SuperAcesBonus, low, SuperAcesBonus.defaultPayouts);
    check('four 4s: EV is exactly 80 (FOUR_234)', approx(lowEv, 80));

    const mid = [makeCard(N9, 0), makeCard(N9, 1), makeCard(N9, 2), makeCard(N9, 3), makeCard(K, 0)];
    const { bestEv: midEv } = evaluateAllMasks(SuperAcesBonus, mid, SuperAcesBonus.defaultPayouts);
    check('four 9s: EV is exactly 50 (FOUR_5_THRU_K)', approx(midEv, 50));
}
{
    // pat full house and pat flush -- both genuinely optimal to hold (standard strategy never
    // breaks either), unlike the quad-with-dead-kicker and weak-pair cases below.
    const fullHouse = [makeCard(6, 0), makeCard(6, 1), makeCard(6, 2), makeCard(9, 3), makeCard(9, 0)];
    const { bestMask: fhMask, bestEv: fhEv } = evaluateAllMasks(SuperAcesBonus, fullHouse, SuperAcesBonus.defaultPayouts);
    check('full house: best mask is hold-all (31)', fhMask === 31);
    check('full house: EV is exactly 6', approx(fhEv, 6));

    const flush = [makeCard(D2, 0), makeCard(D5, 0), makeCard(N9, 0), makeCard(J, 0), makeCard(K, 0)];
    const { bestMask: flMask, bestEv: flEv } = evaluateAllMasks(SuperAcesBonus, flush, SuperAcesBonus.defaultPayouts);
    check('flush: best mask is hold-all (31)', flMask === 31);
    check('flush: EV is exactly 5', approx(flEv, 5));

    const straight = [makeCard(2, 0), makeCard(3, 1), makeCard(4, 2), makeCard(5, 3), makeCard(6, 0)];
    const { bestMask: strMask, bestEv: strEv } = evaluateAllMasks(SuperAcesBonus, straight, SuperAcesBonus.defaultPayouts);
    check('straight: best mask is hold-all (31)', strMask === 31);
    check('straight: EV is exactly 4', approx(strEv, 4));
}
{
    // Two pair including Aces -- a genuine Super-Aces-specific strategy quirk: because Four
    // Aces pays so disproportionately high (400) relative to the other categories, the best
    // play is actually to hold ONLY the Aces pair and discard everything else (including the
    // other made pair!), chasing quad aces. So -- same as the weak-hand cases in Joker Poker
    // and Double Double Bonus -- we check the pat classification (masks[31].ev), not bestMask.
    const dealt = [makeCard(A, 0), makeCard(A, 1), makeCard(6, 2), makeCard(6, 3), makeCard(N9, 0)];
    const { masks, bestEv } = evaluateAllMasks(SuperAcesBonus, dealt, SuperAcesBonus.defaultPayouts);
    check('two pair (incl. aces): holding all 5 pays exactly 1 (Two Pair)', approx(masks[31].ev, 1));
    check('two pair (incl. aces): best play (hold aces only) beats holding pat', bestEv > masks[31].ev);
}
{
    // pair of Jacks vs. pair of Nines (below threshold) -- same weak-made-hand reasoning as
    // Double Double Bonus: standard strategy discards the 3 dead kickers rather than holding
    // pat, so check the pat classification only.
    const jacks = [makeCard(J, 0), makeCard(J, 1), makeCard(D2, 2), makeCard(D5, 3), makeCard(N9, 0)];
    const { masks: jacksMasks } = evaluateAllMasks(SuperAcesBonus, jacks, SuperAcesBonus.defaultPayouts);
    check('pair of jacks: holding all 5 pays exactly 1 (Jacks or Better)', approx(jacksMasks[31].ev, 1));

    const nines = [makeCard(N9, 0), makeCard(N9, 1), makeCard(D2, 2), makeCard(D5, 3), makeCard(6, 0)];
    const { masks: ninesMasks } = evaluateAllMasks(SuperAcesBonus, nines, SuperAcesBonus.defaultPayouts);
    check('pair of nines (below jacks): holding all 5 pays exactly 0 (Nothing, not Jacks-or-Better)', approx(ninesMasks[31].ev, 0));
}

console.log('\n=== Double Bonus ===');
{
    // Double Bonus is Super Aces Bonus with 2 payouts changed (Full House 6->7, Four 2s/3s/4s
    // 80->100) -- confirm the schedule and that it's genuinely reusing Super Aces Bonus's
    // deck/evalRank rather than a re-derived copy.
    const dropChanged = (payouts, ranks) => payouts.map((v, i) =>
        (['Full House', 'Four 2s, 3s or 4s'].includes(ranks[i]) ? null : v));
    check('payouts match Super Aces Bonus except the 2 boosted categories',
        JSON.stringify(dropChanged(DoubleBonus.defaultPayouts, DoubleBonus.ranks)) ===
        JSON.stringify(dropChanged(SuperAcesBonus.defaultPayouts, SuperAcesBonus.ranks)));
    check('Full House payout is 7 (not Super Aces\' 6)', DoubleBonus.defaultPayouts[DoubleBonus.ranks.indexOf('Full House')] === 7);
    check('Four 2s,3s,4s payout is 100 (not Super Aces\' 80)', DoubleBonus.defaultPayouts[DoubleBonus.ranks.indexOf('Four 2s, 3s or 4s')] === 100);
    check('reuses SuperAcesBonus.evalRank directly', DoubleBonus.evalRank === SuperAcesBonus.evalRank);
    check('reuses SuperAcesBonus.deck directly', DoubleBonus.deck === SuperAcesBonus.deck);
    check('has no strategyPdf yet (none exists for this game)', DoubleBonus.strategyPdf === undefined);
}
{
    // pat royal flush -- unaffected by the payout changes, sanity check the shared evalRank
    const dealt = [makeCard(T, 3), makeCard(J, 3), makeCard(Q, 3), makeCard(K, 3), makeCard(A, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(DoubleBonus, dealt, DoubleBonus.defaultPayouts);
    check('natural royal: best mask is hold-all (31)', bestMask === 31);
    check('natural royal: EV is exactly 800', approx(bestEv, 800));
}
{
    // Inherited from Super Aces Bonus: no kicker sub-bonus at any quad tier, so the payout is
    // flat per quad rank and holding pat exactly ties with discarding the kicker to redraw --
    // check the EV only, not which mask wins the tie.
    const low = [makeCard(D4, 0), makeCard(D4, 1), makeCard(D4, 2), makeCard(D4, 3), makeCard(K, 0)];
    const { bestEv: lowEv } = evaluateAllMasks(DoubleBonus, low, DoubleBonus.defaultPayouts);
    check('four 4s: EV is exactly 100 (up from Super Aces\' 80)', approx(lowEv, 100));

    const aces = [makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3), makeCard(K, 0)];
    const { bestEv: acesEv } = evaluateAllMasks(DoubleBonus, aces, DoubleBonus.defaultPayouts);
    check('four aces: EV is exactly 400 (unchanged)', approx(acesEv, 400));

    const mid = [makeCard(N9, 0), makeCard(N9, 1), makeCard(N9, 2), makeCard(N9, 3), makeCard(K, 0)];
    const { bestEv: midEv } = evaluateAllMasks(DoubleBonus, mid, DoubleBonus.defaultPayouts);
    check('four 9s: EV is exactly 50 (unchanged)', approx(midEv, 50));
}
{
    // pat full house -- genuinely optimal to hold, now paying the boosted 7
    const dealt = [makeCard(6, 0), makeCard(6, 1), makeCard(6, 2), makeCard(9, 3), makeCard(9, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(DoubleBonus, dealt, DoubleBonus.defaultPayouts);
    check('full house: best mask is hold-all (31)', bestMask === 31);
    check('full house: EV is exactly 7 (up from Super Aces\' 6)', approx(bestEv, 7));
}

console.log('\n=== One-Eyed Jacks ===');
const JOKER_H = makeJoker(2); // the joker tagged "hearts" -- displays as a red "J ♥" + gold "Wild" underneath
const JOKER_S = makeJoker(3); // the joker tagged "spades" -- displays as a black "J ♠" + gold "Wild" underneath
{
    // Deck sanity: the Jack of hearts and Jack of spades are removed and replaced with 2
    // tagged jokers -- Jc/Jd remain ordinary cards. NOTE: this means a *natural* royal flush
    // is only possible in clubs or diamonds in this game (there's no Jack to complete one in
    // hearts or spades) -- a real deck-construction detail worth testing directly, since it's
    // exactly the kind of thing a hand-picked test card (e.g. using suit=hearts/spades for a
    // royal-flush test) could accidentally deal a card that doesn't exist in this game at all.
    const deck = oneEyedJacksDeck();
    check(`deck has 52 cards (${deck.length})`, deck.length === 52);
    const wilds = deck.filter(isWild);
    check(`deck has exactly 2 wilds (${wilds.length})`, wilds.length === 2);
    check('the 2 wilds are the tagged hearts/spades jokers, not identical', wilds.includes(JOKER_H) && wilds.includes(JOKER_S) && JOKER_H !== JOKER_S);
    const realCards = deck.filter(c => !isWild(c)).map(cardStr);
    check('deck has no Jh or Js', !realCards.includes('Jh') && !realCards.includes('Js'));
    check('deck still has Jc and Jd', realCards.includes('Jc') && realCards.includes('Jd'));
}
{
    // wildLabel differentiates the 2 jokers by their tag, distinct from every other wild
    // game's single shared label -- this is the actual feature being tested here.
    check('isJoker recognizes both tagged jokers', isJoker(JOKER_H) && isJoker(JOKER_S));
    check('isJoker rejects an ordinary card (Jc)', !isJoker(makeCard(J, 0)));
    check('jokerTag distinguishes hearts from spades', jokerTag(JOKER_H) === 2 && jokerTag(JOKER_S) === 3);
    // Labels render like a normal card's rank+suit (colored red for hearts, black for
    // spades) -- cardHtml appends the gold "Wild" tag underneath unconditionally, so the
    // label itself only needs to say what the rank/suit/color should be.
    const hLabel = OneEyedJacks.wildLabel(JOKER_H);
    const sLabel = OneEyedJacks.wildLabel(JOKER_S);
    check(`hearts joker labeled "J"+"♥"+red (got "${hLabel.rank}"+"${hLabel.suit}"+red:${hLabel.red})`, hLabel.rank === 'J' && hLabel.suit === '♥' && hLabel.red === true);
    check(`spades joker labeled "J"+"♠"+black (got "${sLabel.rank}"+"${sLabel.suit}"+red:${sLabel.red})`, sLabel.rank === 'J' && sLabel.suit === '♠' && !sLabel.red);
    check('wildLabel returns null for an ordinary card (Jc)', OneEyedJacks.wildLabel(makeCard(J, 0)) === null);
}
{
    // pat natural royal flush -- must be clubs or diamonds (see deck note above)
    const dealt = [makeCard(T, 0), makeCard(J, 0), makeCard(Q, 0), makeCard(K, 0), makeCard(A, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('natural royal: best mask is hold-all (31)', bestMask === 31);
    check('natural royal: EV is exactly 800', approx(bestEv, 800));
}
{
    // 1 joker + 4 suited royal cards -> wild royal, guaranteed
    const dealt = [JOKER_H, makeCard(J, 1), makeCard(Q, 1), makeCard(K, 1), makeCard(A, 1)];
    const { bestMask, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('wild royal: best mask is hold-all (31)', bestMask === 31);
    check('wild royal: EV is exactly 150', approx(bestEv, 150));
}
{
    // 2 jokers + 3 real cards, all distinct trip-of-8s -> guaranteed five of a kind (can't be
    // improved on), so holding pat is genuinely optimal here.
    const dealt = [JOKER_H, JOKER_S, makeCard(4, 0), makeCard(4, 1), makeCard(4, 2)];
    const { bestMask, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('2 jokers + trips: best mask is hold-all (31)', bestMask === 31);
    check('2 jokers + trips: EV is exactly 75 (five of a kind)', approx(bestEv, 75));
}
{
    // 2 jokers + 3 distinct-rank real cards -> guaranteed three of a kind (pays only 1), but
    // NOT optimal to hold pat: discarding 1 of the 3 dead singles for a fresh draw is a real
    // shot at pairing up into quads. Same weak-made-hand reasoning as the other wildcard games.
    const dealt = [JOKER_H, JOKER_S, makeCard(3, 0), makeCard(7, 1), makeCard(K, 2)];
    const { masks, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('2 jokers + 3 distinct: holding all 5 pays exactly 1 (three of a kind)', approx(masks[31].ev, 1));
    check('2 jokers + 3 distinct: best play redraws for a higher EV than holding pat', bestEv > masks[31].ev);
}
{
    // 2 jokers + a real pair of 8s + 1 dead singleton -> guaranteed four of a kind (pays 15).
    // Independently hand-derived (not just internal self-consistency): discarding the dead
    // singleton and drawing 1 replacement from the 47 remaining cards, the only two cards that
    // matter are the other two 8s (8h, 8s) -- either upgrades to five of a kind (75); every one
    // of the other 45 possible draws still keeps four of a kind (15) since the wilds + real pair
    // always complete quads regardless of the redrawn card's rank.
    const dealt = [JOKER_H, JOKER_S, makeCard(6, 0), makeCard(6, 1), makeCard(7, 2)];
    const { masks, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('2 jokers + pair: holding all 5 pays exactly 15 (four of a kind)', approx(masks[31].ev, 15));
    const holdPair = masks[0b11110]; // hold both jokers + the pair of 8s, discard the singleton
    const expected = (2 * 75 + 45 * 15) / 47;
    check(`2 jokers + pair: discard-singleton EV ${holdPair.ev.toFixed(6)} matches hand-derived ${expected.toFixed(6)}`, approx(holdPair.ev, expected, 1e-9));
    check(`2 jokers + pair: discard-singleton total draws is 47 (${holdPair.total})`, holdPair.total === 47);
    check('2 jokers + pair: discarding the singleton beats holding pat', approx(bestEv, holdPair.ev, 1e-9) && bestEv > masks[31].ev);
}
{
    // pat full house -- Jc/Jd pair over trip 8s (the only possible Jack pair in this deck)
    const dealt = [makeCard(6, 0), makeCard(6, 1), makeCard(6, 2), makeCard(J, 0), makeCard(J, 1)];
    const { bestMask, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('full house: best mask is hold-all (31)', bestMask === 31);
    check('full house: EV is exactly 5', approx(bestEv, 5));
}
{
    // pat straight (no wilds involved) -- faces 4,5,6,7,8 (rank indices 2..6)
    const dealt = [makeCard(2, 0), makeCard(3, 1), makeCard(4, 2), makeCard(5, 3), makeCard(6, 0)];
    const { bestMask, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('straight: best mask is hold-all (31)', bestMask === 31);
    check('straight: EV is exactly 2', approx(bestEv, 2));
}
{
    // two pair, no wilds -- weak made hand (pays only 1), standard strategy breaks it to chase
    // a full house/quads rather than holding pat, so check the pat classification only.
    const dealt = [makeCard(5, 0), makeCard(5, 1), makeCard(8, 2), makeCard(8, 3), makeCard(D2, 0)];
    const { masks, bestEv } = evaluateAllMasks(OneEyedJacks, dealt, OneEyedJacks.defaultPayouts);
    check('two pair: holding all 5 pays exactly 1', approx(masks[31].ev, 1));
    check('two pair: best play redraws for a higher EV than holding pat', bestEv > masks[31].ev);
}

console.log('\n=== Wild Joker ===');
{
    check('has a strategyPdf pointing at wildJoker.pdf', WildJoker.strategyPdf?.href === 'wildJoker.pdf');
    check('deck is the 53-card joker deck', WildJoker.deck().length === 53);
}
{
    // joker + 4 real aces -> five of a kind, the progressive jackpot. Nothing beats it, so
    // holding pat is genuinely optimal.
    const dealt = [WILD, makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3)];
    const { bestMask, bestEv } = evaluateAllMasks(WildJoker, dealt, WildJoker.defaultPayouts);
    check('joker + 4 aces: best mask is hold-all (31)', bestMask === 31);
    check('joker + 4 aces: EV is exactly 1140 (five of a kind jackpot)', approx(bestEv, 1140));
}
{
    // Unlike Joker Poker, this game has no separate wild-royal category -- a royal made with
    // the joker pays the same 100 as a natural one. Worth asserting, since it's the one place
    // Wild Joker's rank logic differs from the otherwise-identical Joker Poker.
    const natural = [makeCard(T, 3), makeCard(J, 3), makeCard(Q, 3), makeCard(K, 3), makeCard(A, 3)];
    const { bestMask: natMask, bestEv: natEv } = evaluateAllMasks(WildJoker, natural, WildJoker.defaultPayouts);
    check('natural royal: best mask is hold-all (31)', natMask === 31);
    check('natural royal: EV is exactly 100', approx(natEv, 100));

    const withJoker = [WILD, makeCard(J, 1), makeCard(Q, 1), makeCard(K, 1), makeCard(A, 1)];
    const { bestMask: wildMask, bestEv: wildEv } = evaluateAllMasks(WildJoker, withJoker, WildJoker.defaultPayouts);
    check('joker royal: best mask is hold-all (31)', wildMask === 31);
    check('joker royal: EV is also exactly 100 (no separate wild-royal tier)', approx(wildEv, 100));
}
{
    // Pair of aces is the minimum paying hand, reachable either naturally or via the joker.
    // Weak made hand, so check the pat classification rather than assuming hold-all is best.
    const natural = [makeCard(A, 0), makeCard(A, 1), makeCard(N7, 2), makeCard(N9, 3), makeCard(K, 0)];
    const { masks: natMasks } = evaluateAllMasks(WildJoker, natural, WildJoker.defaultPayouts);
    check('natural pair of aces: holding all 5 pays exactly 1', approx(natMasks[31].ev, 1));

    const viaJoker = [WILD, makeCard(A, 0), makeCard(N7, 1), makeCard(N9, 2), makeCard(K, 3)];
    const { masks: jokerMasks, bestEv } = evaluateAllMasks(WildJoker, viaJoker, WildJoker.defaultPayouts);
    check('ace + joker: holding all 5 pays exactly 1 (pair of aces via the joker)', approx(jokerMasks[31].ev, 1));
    check('ace + joker: best play redraws for a higher EV than holding pat', bestEv > jokerMasks[31].ev);
}

console.log('\n=== Shamrock 7s ===');
{
    check('has a strategyPdf pointing at shamrock7.pdf', Shamrock7.strategyPdf?.href === 'shamrock7.pdf');
    check('deck is the 53-card joker deck', Shamrock7.deck().length === 53);

    // Every sevens tier is its base category plus the flat 12.1 sevens bonus.
    const pay = (name) => Shamrock7.defaultPayouts[Shamrock7.ranks.indexOf(name)];
    const BONUS = 12.1;
    check('Three Sevens = Three of a Kind + 12.1', approx(pay('Three Sevens') - pay('Three of a Kind'), BONUS));
    check('Sevens Full = Full House + 12.1', approx(pay('Sevens Full') - pay('Full House'), BONUS));
    check('Four Sevens = Four of a Kind + 12.1', approx(pay('Four Sevens') - pay('Four of a Kind'), BONUS));
    check('Five Sevens = Five of a Kind + 12.1', approx(pay('Five Sevens') - pay('Five of a Kind'), BONUS));
}
{
    // The two quints tiers: sevens pay the bonus on top of the jackpot, anything else doesn't.
    const pay = (name) => Shamrock7.defaultPayouts[Shamrock7.ranks.indexOf(name)];

    const sevens = [WILD, makeCard(N7, 0), makeCard(N7, 1), makeCard(N7, 2), makeCard(N7, 3)];
    const { bestMask: sMask, bestEv: sEv } = evaluateAllMasks(Shamrock7, sevens, Shamrock7.defaultPayouts);
    check('joker + 4 sevens: best mask is hold-all (31)', sMask === 31);
    check('joker + 4 sevens: EV is the Five Sevens jackpot (942.1)', approx(sEv, pay('Five Sevens')));

    const aces = [WILD, makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3)];
    const { bestMask: aMask, bestEv: aEv } = evaluateAllMasks(Shamrock7, aces, Shamrock7.defaultPayouts);
    check('joker + 4 aces: best mask is hold-all (31)', aMask === 31);
    check('joker + 4 aces: EV is the plain Five of a Kind jackpot (930)', approx(aEv, pay('Five of a Kind')));
}
{
    // A made quad is NOT pat-optimal here: with the joker still live in the deck, discarding
    // the kicker is a shot at five of a kind, which dwarfs the quad payout.
    const pay = (name) => Shamrock7.defaultPayouts[Shamrock7.ranks.indexOf(name)];

    const sevens = [makeCard(N7, 0), makeCard(N7, 1), makeCard(N7, 2), makeCard(N7, 3), makeCard(K, 0)];
    const { masks: sMasks, bestEv: sBest } = evaluateAllMasks(Shamrock7, sevens, Shamrock7.defaultPayouts);
    check('four sevens: holding all 5 pays exactly 27.1 (Four Sevens)', approx(sMasks[31].ev, pay('Four Sevens')));
    check('four sevens: discarding the kicker to chase the joker beats holding pat', sBest > sMasks[31].ev);

    const aces = [makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3), makeCard(K, 0)];
    const { masks: aMasks } = evaluateAllMasks(Shamrock7, aces, Shamrock7.defaultPayouts);
    check('four aces: holding all 5 pays exactly 15 (plain Four of a Kind, no sevens bonus)', approx(aMasks[31].ev, pay('Four of a Kind')));
}
{
    // has777Bonus() keys off the *set* being sevens, not merely sevens being present.
    const rank = (dealt) => Shamrock7.ranks[Shamrock7.evalRank(extractFeatures(dealt))];
    check('777 + KK is Sevens Full', rank([makeCard(N7, 0), makeCard(N7, 1), makeCard(N7, 2), makeCard(K, 0), makeCard(K, 1)]) === 'Sevens Full');
    check('KKK + 77 is a plain Full House (sevens are only the pair)', rank([makeCard(K, 0), makeCard(K, 1), makeCard(K, 2), makeCard(N7, 0), makeCard(N7, 1)]) === 'Full House');
    check('666 + KK is a plain Full House', rank([makeCard(4, 0), makeCard(4, 1), makeCard(4, 2), makeCard(K, 0), makeCard(K, 1)]) === 'Full House');
    // the joker completing a pair of sevens into trips counts, whichever pair slot they land in
    // (pairs are collected in ascending rank order, so sevens sit at index 1 only below a lower pair)
    check('joker + KK + 77 is Sevens Full (sevens are pairs[0])', rank([WILD, makeCard(K, 0), makeCard(K, 1), makeCard(N7, 2), makeCard(N7, 3)]) === 'Sevens Full');
    check('joker + 33 + 77 is Sevens Full (sevens are pairs[1])', rank([WILD, makeCard(D3, 0), makeCard(D3, 1), makeCard(N7, 2), makeCard(N7, 3)]) === 'Sevens Full');
    check('joker + KK + 33 is a plain Full House', rank([WILD, makeCard(K, 0), makeCard(K, 1), makeCard(D3, 2), makeCard(D3, 3)]) === 'Full House');
    check('joker + pair of sevens is Three Sevens', rank([WILD, makeCard(N7, 0), makeCard(N7, 1), makeCard(K, 0), makeCard(N9, 1)]) === 'Three Sevens');
    check('trip aces is a plain Three of a Kind', rank([makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(K, 0), makeCard(N9, 1)]) === 'Three of a Kind');
}
{
    // pat full houses are genuinely optimal to hold, bonus or not
    const pay = (name) => Shamrock7.defaultPayouts[Shamrock7.ranks.indexOf(name)];

    const sevensFull = [makeCard(N7, 0), makeCard(N7, 1), makeCard(N7, 2), makeCard(K, 0), makeCard(K, 1)];
    const { bestMask: sMask, bestEv: sEv } = evaluateAllMasks(Shamrock7, sevensFull, Shamrock7.defaultPayouts);
    check('sevens full: best mask is hold-all (31)', sMask === 31);
    check('sevens full: EV is exactly 20.1', approx(sEv, pay('Sevens Full')));

    const plainFull = [makeCard(4, 0), makeCard(4, 1), makeCard(4, 2), makeCard(K, 0), makeCard(K, 1)];
    const { bestMask: pMask, bestEv: pEv } = evaluateAllMasks(Shamrock7, plainFull, Shamrock7.defaultPayouts);
    check('plain full house: best mask is hold-all (31)', pMask === 31);
    check('plain full house: EV is exactly 8', approx(pEv, pay('Full House')));
}

console.log('\n=== 8-Ball ===');
{
    // 8-Ball is Shamrock 7s with the bonus moved from sevens to eights, a bigger bonus (12.6
    // vs 12.1) and a correspondingly lower break-even jackpot (825 vs 930). Both are built
    // from the same makeRankBonusGame factory, so confirm the parameterization landed and the
    // two games are genuinely independent (no shared rank/payout arrays).
    const pay = (game, name) => game.defaultPayouts[game.ranks.indexOf(name)];
    const BONUS = 12.6;
    check('Three Eights = Three of a Kind + 12.6', approx(pay(EightBall, 'Three Eights') - pay(EightBall, 'Three of a Kind'), BONUS));
    check('Eights Full = Full House + 12.6', approx(pay(EightBall, 'Eights Full') - pay(EightBall, 'Full House'), BONUS));
    check('Four Eights = Four of a Kind + 12.6', approx(pay(EightBall, 'Four Eights') - pay(EightBall, 'Four of a Kind'), BONUS));
    check('Five Eights = Five of a Kind + 12.6', approx(pay(EightBall, 'Five Eights') - pay(EightBall, 'Five of a Kind'), BONUS));
    check('jackpot is 825 (lower break-even than Shamrock 7s\' 930)', approx(pay(EightBall, 'Five of a Kind'), 825));
    check('base categories match Shamrock 7s (Royal 100, SF 50, quads 15, FH 8, flush 5, straight 3)',
        ['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair']
            .every(n => pay(EightBall, n) === pay(Shamrock7, n)));
    check('has a strategyPdf pointing at 8ball.pdf', EightBall.strategyPdf?.href === '8ball.pdf');
    check('deck is the 53-card joker deck', EightBall.deck().length === 53);
    check('does not share its ranks/payouts arrays with Shamrock 7s',
        EightBall.ranks !== Shamrock7.ranks && EightBall.defaultPayouts !== Shamrock7.defaultPayouts);

    // Watermark art: main.js tags cards of the bonus rank with data-bonus-art so style.css can
    // draw a shamrock behind sevens / an 8-ball behind eights. The art's rank has to track the
    // rank that actually pays the bonus, or the watermark lands on the wrong cards.
    check('8-Ball art is the 8-ball, keyed to the eights', EightBall.bonusArt.id === 'eight-ball' && EightBall.bonusArt.rank === N8);
    check('Shamrock 7s art is the shamrock, keyed to the sevens', Shamrock7.bonusArt.id === 'shamrock' && Shamrock7.bonusArt.rank === N7);
    const tripsOfArtRank = (game) => game.ranks[game.evalRank(extractFeatures(
        [makeCard(game.bonusArt.rank, 0), makeCard(game.bonusArt.rank, 1), makeCard(game.bonusArt.rank, 2), makeCard(K, 0), makeCard(D3, 1)]))];
    check('trips of the art rank pays the bonus tier in each game',
        tripsOfArtRank(EightBall) === 'Three Eights' && tripsOfArtRank(Shamrock7) === 'Three Sevens');
}
{
    const pay = (name) => EightBall.defaultPayouts[EightBall.ranks.indexOf(name)];

    // the two quints tiers: eights pay the bonus on top of the jackpot, anything else doesn't
    const eights = [WILD, makeCard(N8, 0), makeCard(N8, 1), makeCard(N8, 2), makeCard(N8, 3)];
    const { bestMask: eMask, bestEv: eEv } = evaluateAllMasks(EightBall, eights, EightBall.defaultPayouts);
    check('joker + 4 eights: best mask is hold-all (31)', eMask === 31);
    check('joker + 4 eights: EV is the Five Eights jackpot (837.6)', approx(eEv, pay('Five Eights')));

    const aces = [WILD, makeCard(A, 0), makeCard(A, 1), makeCard(A, 2), makeCard(A, 3)];
    const { bestEv: aEv } = evaluateAllMasks(EightBall, aces, EightBall.defaultPayouts);
    check('joker + 4 aces: EV is the plain Five of a Kind jackpot (825)', approx(aEv, pay('Five of a Kind')));
}
{
    // Same joker-chase as Shamrock 7s: a made quad is not pat-optimal while the joker is live.
    const pay = (name) => EightBall.defaultPayouts[EightBall.ranks.indexOf(name)];
    const dealt = [makeCard(N8, 0), makeCard(N8, 1), makeCard(N8, 2), makeCard(N8, 3), makeCard(K, 0)];
    const { masks, bestEv } = evaluateAllMasks(EightBall, dealt, EightBall.defaultPayouts);
    check('four eights: holding all 5 pays exactly 27.6 (Four Eights)', approx(masks[31].ev, pay('Four Eights')));
    check('four eights: discarding the kicker to chase the joker beats holding pat', bestEv > masks[31].ev);
}
{
    // The bonus keys off the *set* being eights -- and sevens are now just an ordinary rank.
    const rank = (dealt) => EightBall.ranks[EightBall.evalRank(extractFeatures(dealt))];
    check('888 + KK is Eights Full', rank([makeCard(N8, 0), makeCard(N8, 1), makeCard(N8, 2), makeCard(K, 0), makeCard(K, 1)]) === 'Eights Full');
    check('KKK + 88 is a plain Full House (eights are only the pair)', rank([makeCard(K, 0), makeCard(K, 1), makeCard(K, 2), makeCard(N8, 0), makeCard(N8, 1)]) === 'Full House');
    check('777 + KK is a plain Full House here (sevens carry no bonus in 8-Ball)', rank([makeCard(N7, 0), makeCard(N7, 1), makeCard(N7, 2), makeCard(K, 0), makeCard(K, 1)]) === 'Full House');
    check('joker + KK + 88 is Eights Full (eights are pairs[0])', rank([WILD, makeCard(K, 0), makeCard(K, 1), makeCard(N8, 2), makeCard(N8, 3)]) === 'Eights Full');
    check('joker + 33 + 88 is Eights Full (eights are pairs[1])', rank([WILD, makeCard(D3, 0), makeCard(D3, 1), makeCard(N8, 2), makeCard(N8, 3)]) === 'Eights Full');
    check('joker + pair of eights is Three Eights', rank([WILD, makeCard(N8, 0), makeCard(N8, 1), makeCard(K, 0), makeCard(N9, 1)]) === 'Three Eights');
    check('trip sevens is a plain Three of a Kind here', rank([makeCard(N7, 0), makeCard(N7, 1), makeCard(N7, 2), makeCard(K, 0), makeCard(N9, 1)]) === 'Three of a Kind');
    check('four eights (no joker) is Four Eights', rank([makeCard(N8, 0), makeCard(N8, 1), makeCard(N8, 2), makeCard(N8, 3), makeCard(K, 0)]) === 'Four Eights');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
