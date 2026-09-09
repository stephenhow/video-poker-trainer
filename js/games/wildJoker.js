import { jokerDeck, isWild } from '../poker.js';
import {
    isQuints, isRF, isSF, isQuads, isFH, isFlush, isStr, is3K,
    pairsCnt, pairRank, hasPair, hasJoker, hasRank,
} from '../handFeatures.js';

// Rank order matches the C++ engine's WildJokerPayTable enum (pot_of_gold.h). A Pot O' Gold
// machine game: standard 52-card deck plus one joker, no separate wild-royal category (a royal
// made with the joker pays the same 100 as a natural one), and a progressive five-of-a-kind
// jackpot -- 1140 is the jackpot value the C++ paytable was analyzed at, and is editable in
// the pay table like any other payout.
const RANKS = ['Nothing', 'Pair of Aces', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush',
    'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush', 'Five of a Kind'];
const NOTHING = 0, PAIR_ACES = 1, TWO_PAIRS = 2, THREE_OF_A_KIND = 3, STRAIGHT = 4, FLUSH = 5,
    FULL_HOUSE = 6, FOUR_OF_A_KIND = 7, STRAIGHT_FLUSH = 8, ROYAL_FLUSH = 9, FIVE_OF_A_KIND = 10;

const ACE = 12;

export const WildJoker = {
    id: 'wildJoker',
    name: 'Wild Joker',
    deck: jokerDeck,
    ranks: RANKS,
    defaultPayouts: [0, 1, 1, 2, 3, 5, 8, 15, 50, 100, 1140],
    wildLabel: (card) => (isWild(card) ? { rank: '', suit: '' } : null), // a real Joker, not a wild-rank card
    // The joker is the whole point of these games, so give it a dancing jester
    // watermark (see style.css's [data-card-art]); every other card renders plain.
    cardArt: (card) => (isWild(card) ? 'jester' : null),
    strategyPdf: { href: 'wildJoker.pdf', label: 'Optimal strategy (PDF)' },

    evalRank(f) {
        // The C++ writes this first test as `hasJoker() && getQuadsCnt()`; with a single-joker
        // deck that is exactly isQuints() (jokerCnt is only ever 0 or 1 here).
        if (isQuints(f)) return FIVE_OF_A_KIND;
        if (isRF(f)) return ROYAL_FLUSH;
        if (isSF(f)) return STRAIGHT_FLUSH;
        if (isQuads(f)) return FOUR_OF_A_KIND;
        if (isFH(f)) return FULL_HOUSE;
        if (isFlush(f)) return FLUSH;
        if (isStr(f)) return STRAIGHT;
        if (is3K(f)) return THREE_OF_A_KIND;
        if (pairsCnt(f) === 2) return TWO_PAIRS;
        if ((hasPair(f) && pairRank(f) === ACE) || (hasJoker(f) && hasRank(f, ACE))) return PAIR_ACES;
        return NOTHING;
    },
};
