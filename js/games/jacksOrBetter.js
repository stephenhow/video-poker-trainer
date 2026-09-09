import { standardDeck } from '../poker.js';
import { isRF, isSF, quadsCnt, tripsCnt, pairsCnt, pairRank, isStr } from '../handFeatures.js';

// Rank order matches the C++ engine's JoBPayTable enum (index = payout table row).
const RANKS = ['Nothing', 'Jacks or Better', 'Two Pair', 'Three of a Kind', 'Straight',
    'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
const NOTHING = 0, JACKS_OR_BETTER = 1, TWO_PAIRS = 2, THREE_OF_A_KIND = 3, STRAIGHT = 4,
    FLUSH = 5, FULL_HOUSE = 6, FOUR_OF_A_KIND = 7, STRAIGHT_FLUSH = 8, ROYAL_FLUSH = 9;

export const JacksOrBetter = {
    id: 'jacksOrBetter',
    name: 'Jacks or Better (9/6)',
    deck: standardDeck,
    ranks: RANKS,
    defaultPayouts: [0, 1, 2, 3, 4, 6, 9, 25, 50, 800],
    strategyPdf: { href: 'jacksOrBetter96.pdf', label: 'Optimal strategy (PDF)' },

    evalRank(f) {
        if (isRF(f)) return ROYAL_FLUSH;
        if (isSF(f)) return STRAIGHT_FLUSH;
        if (quadsCnt(f)) return FOUR_OF_A_KIND;
        if (tripsCnt(f) === 1 && pairsCnt(f) === 1) return FULL_HOUSE;
        if (f.maxSuitCnt === 5) return FLUSH;
        if (isStr(f)) return STRAIGHT;
        if (tripsCnt(f)) return THREE_OF_A_KIND;
        if (pairsCnt(f) === 2) return TWO_PAIRS;
        if (pairsCnt(f) === 1 && pairRank(f) >= 9) return JACKS_OR_BETTER; // rank 9 = Jack
        return NOTHING;
    },
};
