import { jokerDeck, isWild } from '../poker.js';
import {
    isQuints, isRF, isSF, isQuads, isFH, isFlush, isStr, is3K,
    pairsCnt, pairRank, hasJoker, hasRank, hasPair,
} from '../handFeatures.js';

// Rank order matches the C++ engine's JokerPokerPayTable enum. Note PAIR_KINGS comes
// before PAIR_ACES -- that's the original enum's order, preserved here since it's what
// the payout array below is indexed by.
const RANKS = ['Nothing', 'Pair of Kings', 'Pair of Aces', 'Two Pair', 'Three of a Kind', 'Straight',
    'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Five of a Kind',
    'Wild Royal Flush', 'Natural Royal Flush'];
const NOTHING = 0, PAIR_KINGS = 1, PAIR_ACES = 2, TWO_PAIRS = 3, THREE_OF_A_KIND = 4, STRAIGHT = 5,
    FLUSH = 6, FULL_HOUSE = 7, FOUR_OF_A_KIND = 8, STRAIGHT_FLUSH = 9, FIVE_OF_A_KIND = 10,
    WILD_ROYAL = 11, NATURAL_ROYAL = 12;

const KING = 11, ACE = 12;

export const JokerPoker = {
    id: 'jokerPoker',
    name: 'Joker Poker (Two Pair or Better)',
    deck: jokerDeck,
    ranks: RANKS,
    defaultPayouts: [0, 0, 0, 1, 2, 5, 6, 10, 20, 50, 100, 50, 1000],
    wildLabel: (card) => (isWild(card) ? { rank: '', suit: 'Wild' } : null), // a real Joker, not a wild-rank card

    evalRank(f) {
        if (isQuints(f)) return FIVE_OF_A_KIND;
        if (isRF(f)) return hasJoker(f) ? WILD_ROYAL : NATURAL_ROYAL;
        if (isSF(f)) return STRAIGHT_FLUSH;
        if (isQuads(f)) return FOUR_OF_A_KIND;
        if (isFH(f)) return FULL_HOUSE;
        if (isFlush(f)) return FLUSH;
        if (isStr(f)) return STRAIGHT;
        if (is3K(f)) return THREE_OF_A_KIND;
        if (pairsCnt(f) === 2) return TWO_PAIRS;
        if ((hasPair(f) && pairRank(f) === ACE) || (hasJoker(f) && hasRank(f, ACE))) return PAIR_ACES;
        if ((hasPair(f) && pairRank(f) === KING) || (hasJoker(f) && hasRank(f, KING))) return PAIR_KINGS;
        return NOTHING;
    },
};
