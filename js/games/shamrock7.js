import { jokerDeck, isWild } from '../poker.js';
import {
    isQuints, isRF, isSF, isQuads, isFH, isFlush, isStr, is3K,
    quadsCnt, quadRank, tripsCnt, tripRank, pairsCnt, pairRank, hasJoker,
} from '../handFeatures.js';

// Rank order matches the C++ engine's Shamrock7PayTable enum (pot_of_gold.h). A Pot O' Gold
// machine game: standard 52-card deck plus one joker, and every made hand built on sevens pays
// its ordinary category plus a flat "sevens bonus" -- so trips/full house/quads/quints each
// have a paired Sevens variant. The C++ derives those as `payout[category] + sevensBonus`
// (12.1) on top of a 930 jackpot; those sums are baked into defaultPayouts below and stay
// editable in the pay table like any other payout.
const SEVENS_BONUS = 12.1, JACKPOT = 930;

const RANKS = ['Nothing', 'Two Pair', 'Three of a Kind', 'Three Sevens', 'Straight', 'Flush',
    'Full House', 'Sevens Full', 'Four of a Kind', 'Four Sevens', 'Straight Flush',
    'Royal Flush', 'Five of a Kind', 'Five Sevens'];
const NOTHING = 0, TWO_PAIRS = 1, THREE_OF_A_KIND = 2, THREE_SEVENS = 3, STRAIGHT = 4, FLUSH = 5,
    FULL_HOUSE = 6, SEVENS_FULL = 7, FOUR_OF_A_KIND = 8, FOUR_SEVENS = 9, STRAIGHT_FLUSH = 10,
    ROYAL_FLUSH = 11, FIVE_OF_A_KIND = 12, FIVE_SEVENS = 13;

const SEVEN = 5; // rank index: 0=Deuce ... 5=Seven

// Mirrors the C++ has777Bonus(): the hand's made set is sevens -- four or three real sevens, or
// a pair of sevens the joker completes into trips. Both pairs are checked because with two
// pair either one could be the sevens.
function has777Bonus(f) {
    if (quadsCnt(f) && quadRank(f) === SEVEN) return true;
    if (tripsCnt(f) && tripRank(f) === SEVEN) return true;
    if (hasJoker(f) && pairsCnt(f) > 0 && pairRank(f, 0) === SEVEN) return true;
    if (hasJoker(f) && pairsCnt(f) > 1 && pairRank(f, 1) === SEVEN) return true;
    return false;
}

export const Shamrock7 = {
    id: 'shamrock7',
    name: 'Shamrock 7s',
    deck: jokerDeck,
    ranks: RANKS,
    defaultPayouts: [
        0,                            // Nothing
        1,                            // Two Pair
        1,                            // Three of a Kind
        1 + SEVENS_BONUS,             // Three Sevens
        3,                            // Straight
        5,                            // Flush
        8,                            // Full House
        8 + SEVENS_BONUS,             // Sevens Full
        15,                           // Four of a Kind
        15 + SEVENS_BONUS,            // Four Sevens
        50,                           // Straight Flush
        100,                          // Royal Flush
        JACKPOT,                      // Five of a Kind
        JACKPOT + SEVENS_BONUS,       // Five Sevens
    ],
    wildLabel: (card) => (isWild(card) ? { rank: '', suit: '' } : null), // a real Joker, not a wild-rank card
    strategyPdf: { href: 'shamrock7.pdf', label: 'Optimal strategy (PDF)' },

    evalRank(f) {
        // The C++ writes this first test as `hasJoker() && getQuadsCnt()`; with a single-joker
        // deck that is exactly isQuints() (jokerCnt is only ever 0 or 1 here).
        if (isQuints(f)) return has777Bonus(f) ? FIVE_SEVENS : FIVE_OF_A_KIND;
        if (isRF(f)) return ROYAL_FLUSH;
        if (isSF(f)) return STRAIGHT_FLUSH;
        if (isQuads(f)) return has777Bonus(f) ? FOUR_SEVENS : FOUR_OF_A_KIND;
        if (isFH(f)) return has777Bonus(f) ? SEVENS_FULL : FULL_HOUSE;
        if (isFlush(f)) return FLUSH;
        if (isStr(f)) return STRAIGHT;
        if (is3K(f)) return has777Bonus(f) ? THREE_SEVENS : THREE_OF_A_KIND;
        if (pairsCnt(f) === 2) return TWO_PAIRS;
        return NOTHING;
    },
};
