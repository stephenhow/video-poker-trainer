import { standardDeck } from '../poker.js';
import {
    isRF, isSF, isFH, isStr, is3K,
    quadsCnt, quadRank, pairsCnt, pairRank, hasKicker, kickerRank,
} from '../handFeatures.js';

// Rank order matches the C++ engine's DoubleDoubleBonusPayTable enum.
const RANKS = ['Nothing', 'Jacks or Better', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush',
    'Full House', 'Four 5s thru Kings', 'Four 2s, 3s or 4s', 'Four Aces',
    'Four 2s, 3s or 4s + A-4 Kicker', 'Four Aces + 2-4 Kicker', 'Straight Flush', 'Royal Flush'];
const NOTHING = 0, JACKS_OR_BETTER = 1, TWO_PAIRS = 2, THREE_OF_A_KIND = 3, STRAIGHT = 4, FLUSH = 5,
    FULL_HOUSE = 6, FOUR_5_THRU_K = 7, FOUR_234 = 8, FOUR_ACES = 9, FOUR_234_W_KICKER = 10,
    FOUR_ACES_W_KICKER = 11, STRAIGHT_FLUSH = 12, ROYAL_FLUSH = 13;

const FOUR = 2, FIVE = 3, JACK = 9, ACE = 12;

export const DoubleDoubleBonus = {
    id: 'doubleDoubleBonus',
    name: 'Double Double Bonus',
    deck: standardDeck,
    ranks: RANKS,
    defaultPayouts: [0, 1, 1, 3, 4, 6, 9, 50, 80, 160, 160, 400, 50, 800],

    evalRank(f) {
        if (isRF(f)) return ROYAL_FLUSH;
        if (isSF(f)) return STRAIGHT_FLUSH;
        if (quadsCnt(f)) {
            const qr = quadRank(f);
            const kr = hasKicker(f) ? kickerRank(f) : -1;
            if (qr === ACE) {
                return (kr !== -1 && kr <= FOUR) ? FOUR_ACES_W_KICKER : FOUR_ACES;
            } else if (qr >= FIVE) {
                return FOUR_5_THRU_K;
            } else { // quads rank is 2, 3, or 4
                return (kr !== -1 && (kr <= FOUR || kr === ACE)) ? FOUR_234_W_KICKER : FOUR_234;
            }
        }
        if (isFH(f)) return FULL_HOUSE;
        if (f.maxSuitCnt === 5) return FLUSH;
        if (isStr(f)) return STRAIGHT;
        if (is3K(f)) return THREE_OF_A_KIND;
        if (pairsCnt(f) === 2) return TWO_PAIRS;
        if (pairsCnt(f) === 1 && pairRank(f) >= JACK) return JACKS_OR_BETTER;
        return NOTHING;
    },
};
