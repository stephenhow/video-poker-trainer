import { deucesWildDeck } from '../poker.js';
import { isNRoyal, isNStraight, quadsCnt, tripsCnt, pairsCnt } from '../handFeatures.js';

// Rank order matches the C++ engine's DeucesWildPayTable enum.
const RANKS = ['Nothing', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind',
    'Straight Flush', 'Five of a Kind', 'Wild Royal Flush', 'Four Deuces', 'Natural Royal Flush'];
const NOTHING = 0, THREE_OF_A_KIND = 1, STRAIGHT = 2, FLUSH = 3, FULL_HOUSE = 4, FOUR_OF_A_KIND = 5,
    STRAIGHT_FLUSH = 6, FIVE_OF_A_KIND = 7, WILD_ROYAL = 8, FOUR_DEUCES = 9, NATURAL_ROYAL = 10;

// This game's rank logic doesn't generalize across joker counts with one shared rule set --
// it's ported directly from the C++ engine's setDeucesWildRank_{0,1,2,3}Deuces, which are
// each hand-written for their exact wild-card count (deliberately, not an oversight -- see
// the C++ engine's video_poker.cpp for the source of truth this mirrors).

function rank0Deuces(f) {
    if (isNRoyal(f, 5)) return NATURAL_ROYAL;
    if (isNStraight(f, 5)) return STRAIGHT_FLUSH; // note: isSF() with jokerCnt=0 == isNSuitedStraight(5), same as this for a 5-real-card suited hand
    if (quadsCnt(f)) return FOUR_OF_A_KIND;
    if (tripsCnt(f) === 1 && pairsCnt(f) === 1) return FULL_HOUSE;
    if (f.maxSuitCnt === 5) return FLUSH;
    if (isNStraight(f, 5)) return STRAIGHT;
    if (tripsCnt(f)) return THREE_OF_A_KIND;
    return NOTHING;
}

function rank1Deuce(f) {
    const suited = f.maxSuitCnt === 4;
    if (isNRoyal(f, 4)) return WILD_ROYAL;
    if (suited && isNStraight(f, 4)) return STRAIGHT_FLUSH;
    if (quadsCnt(f)) return FIVE_OF_A_KIND;
    if (tripsCnt(f)) return FOUR_OF_A_KIND;
    if (pairsCnt(f) === 2) return FULL_HOUSE;
    if (suited) return FLUSH;
    if (isNStraight(f, 4)) return STRAIGHT;
    if (pairsCnt(f)) return THREE_OF_A_KIND;
    return NOTHING;
}

function rank2Deuces(f) {
    const suited = f.maxSuitCnt === 3;
    if (isNRoyal(f, 3)) return WILD_ROYAL;
    if (tripsCnt(f)) return FIVE_OF_A_KIND;
    if (suited && isNStraight(f, 3)) return STRAIGHT_FLUSH;
    if (pairsCnt(f)) return FOUR_OF_A_KIND;
    if (suited) return FLUSH;
    if (isNStraight(f, 3)) return STRAIGHT;
    return THREE_OF_A_KIND; // any 1 of the 3 real cards + 2 wilds always makes trips
}

function rank3Deuces(f) {
    const suited = f.maxSuitCnt === 2;
    if (isNRoyal(f, 2)) return WILD_ROYAL;
    if (pairsCnt(f)) return FIVE_OF_A_KIND;
    if (suited && isNStraight(f, 2)) return STRAIGHT_FLUSH;
    return FOUR_OF_A_KIND; // either of the 2 real cards + 3 wilds always makes quads
}

export const DeucesWild = {
    id: 'deucesWild',
    name: 'Deuces Wild',
    deck: deucesWildDeck,
    ranks: RANKS,
    defaultPayouts: [0, 1, 2, 3, 4, 4, 9, 15, 25, 200, 800],
    wildLabel: { rank: '2', suit: 'Wild' },

    evalRank(f) {
        switch (f.jokerCnt) {
            case 4: return FOUR_DEUCES;
            case 3: return rank3Deuces(f);
            case 2: return rank2Deuces(f);
            case 1: return rank1Deuce(f);
            default: return rank0Deuces(f);
        }
    },
};
