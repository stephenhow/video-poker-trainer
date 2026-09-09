import { oneEyedJacksDeck } from '../poker.js';
import { isQuints, isRF, isSF, isQuads, isFH, isFlush, isStr, is3K, pairsCnt, hasJoker } from '../handFeatures.js';

// Rank order matches the C++ engine's OneEyedJacksPayTable enum (more_games.h). The Jack of
// hearts and Jack of spades are removed from the deck and replaced with 2 real Jokers, so up
// to 2 wilds can appear in a single hand -- unlike Joker Poker's single-joker deck.
const RANKS = ['Nothing', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House',
    'Four of a Kind', 'Straight Flush', 'Five of a Kind', 'Wild Royal Flush', 'Natural Royal Flush'];
const NOTHING = 0, TWO_PAIRS = 1, THREE_OF_A_KIND = 2, STRAIGHT = 3, FLUSH = 4, FULL_HOUSE = 5,
    FOUR_OF_A_KIND = 6, STRAIGHT_FLUSH = 7, FIVE_OF_A_KIND = 8, WILD_ROYAL = 9, NATURAL_ROYAL = 10;

export const OneEyedJacks = {
    id: 'oneEyedJacks',
    name: 'One-Eyed Jacks',
    deck: oneEyedJacksDeck,
    ranks: RANKS,
    defaultPayouts: [0, 1, 1, 2, 3, 5, 15, 45, 75, 150, 800],
    wildLabel: { rank: '', suit: 'Wild' }, // 2 real Jokers, not a wild rank

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
        return NOTHING;
    },
};
