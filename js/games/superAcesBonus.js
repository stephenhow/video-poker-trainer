import { standardDeck } from '../poker.js';
import { isRF, isSF, isFH, isStr, quadsCnt, quadRank, tripsCnt, pairsCnt, pairRank } from '../handFeatures.js';

// Rank order matches the C++ engine's SuperAcesBonusPayTable enum.
const RANKS = ['Nothing', 'Jacks or Better', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush',
    'Full House', 'Four 5s thru Kings', 'Four 2s, 3s or 4s', 'Four Aces', 'Straight Flush', 'Royal Flush'];
const NOTHING = 0, JACKS_OR_BETTER = 1, TWO_PAIRS = 2, THREE_OF_A_KIND = 3, STRAIGHT = 4, FLUSH = 5,
    FULL_HOUSE = 6, FOUR_5_THRU_K = 7, FOUR_234 = 8, FOUR_ACES = 9, STRAIGHT_FLUSH = 10, ROYAL_FLUSH = 11;

const FIVE = 3, JACK = 9, ACE = 12;

export const SuperAcesBonus = {
    id: 'superAcesBonus',
    name: 'Super Aces Bonus',
    deck: standardDeck,
    ranks: RANKS,
    defaultPayouts: [0, 1, 1, 3, 4, 5, 6, 50, 80, 400, 60, 800],

    evalRank(f) {
        if (isRF(f)) return ROYAL_FLUSH;
        if (isSF(f)) return STRAIGHT_FLUSH;
        if (quadsCnt(f)) {
            const qr = quadRank(f);
            if (qr === ACE) return FOUR_ACES;
            if (qr >= FIVE) return FOUR_5_THRU_K;
            return FOUR_234; // quads rank is 2, 3, or 4
        }
        if (isFH(f)) return FULL_HOUSE;
        if (f.maxSuitCnt === 5) return FLUSH;
        if (isStr(f)) return STRAIGHT;
        if (tripsCnt(f)) return THREE_OF_A_KIND;
        if (pairsCnt(f) === 2) return TWO_PAIRS;
        if (pairsCnt(f) === 1 && pairRank(f) >= JACK) return JACKS_OR_BETTER;
        return NOTHING;
    },
};
