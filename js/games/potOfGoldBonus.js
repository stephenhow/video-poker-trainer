import { jokerDeck, isWild, rankOf } from '../poker.js';
import {
    isQuints, isRF, isSF, isQuads, isFH, isFlush, isStr, is3K,
    quadsCnt, quadRank, tripsCnt, tripRank, pairsCnt, pairRank, hasJoker,
} from '../handFeatures.js';

// Shared shape for the Pot O' Gold "rank bonus" games (Shamrock 7s, 8-Ball). Each is the same
// joker-deck game on the same base pay schedule, differing only in which rank carries the
// bonus, how big that flat bonus is, and the jackpot the machine breaks even at. Every made
// hand whose *set* is the bonus rank pays its ordinary category plus the bonus, giving paired
// Three/Four/Five and "<Plural> Full" tiers alongside the ordinary ones.
//
// Mirrors the C++ engine's Shamrock7PayTable/setShamrock7Rank (pot_of_gold.h/.cpp) with the
// bonus rank, bonus amount and jackpot lifted out as parameters.
export function makeRankBonusGame({ id, name, bonusRank, plural, bonus, jackpot, art, strategyPdf }) {
    // Rank order matches the C++ Shamrock7PayTable enum.
    const RANKS = ['Nothing', 'Two Pair', 'Three of a Kind', `Three ${plural}`, 'Straight', 'Flush',
        'Full House', `${plural} Full`, 'Four of a Kind', `Four ${plural}`, 'Straight Flush',
        'Royal Flush', 'Five of a Kind', `Five ${plural}`];
    const NOTHING = 0, TWO_PAIRS = 1, THREE_OF_A_KIND = 2, THREE_BONUS = 3, STRAIGHT = 4, FLUSH = 5,
        FULL_HOUSE = 6, BONUS_FULL = 7, FOUR_OF_A_KIND = 8, FOUR_BONUS = 9, STRAIGHT_FLUSH = 10,
        ROYAL_FLUSH = 11, FIVE_OF_A_KIND = 12, FIVE_BONUS = 13;

    // Mirrors the C++ has777Bonus(): the hand's made set is the bonus rank -- four or three real
    // cards of it, or a pair the joker completes into trips. Note this keys off the quads/trips
    // rank rather than the rank merely being present, so (e.g. for sevens) 777+KK earns it but
    // KKK+77 does not. Both pair slots are checked because with two pair either could be it.
    function hasBonus(f) {
        if (quadsCnt(f) && quadRank(f) === bonusRank) return true;
        if (tripsCnt(f) && tripRank(f) === bonusRank) return true;
        if (hasJoker(f) && pairsCnt(f) > 0 && pairRank(f, 0) === bonusRank) return true;
        if (hasJoker(f) && pairsCnt(f) > 1 && pairRank(f, 1) === bonusRank) return true;
        return false;
    }

    return {
        id,
        name,
        deck: jokerDeck,
        ranks: RANKS,
        defaultPayouts: [
            0,                    // Nothing
            1,                    // Two Pair
            1,                    // Three of a Kind
            1 + bonus,            // Three <Plural>
            3,                    // Straight
            5,                    // Flush
            8,                    // Full House
            8 + bonus,            // <Plural> Full
            15,                   // Four of a Kind
            15 + bonus,           // Four <Plural>
            50,                   // Straight Flush
            100,                  // Royal Flush
            jackpot,              // Five of a Kind
            jackpot + bonus,      // Five <Plural>
        ],
        wildLabel: (card) => (isWild(card) ? { rank: '', suit: '' } : null), // a real Joker
        strategyPdf,
        // Watermark art: the joker gets the same dancing jester as the other joker-deck games,
        // and the cards carrying the bonus get this game's own symbol, so a dealt seven/eight
        // is obvious at a glance. main.js tags matching cards with data-card-art="<id>";
        // style.css supplies the image. Purely decorative -- no effect on evaluation.
        cardArt: (card) => {
            if (isWild(card)) return 'jester';
            return rankOf(card) === bonusRank ? art : null;
        },

        evalRank(f) {
            // The C++ writes this first test as `hasJoker() && getQuadsCnt()`; with a
            // single-joker deck that is exactly isQuints() (jokerCnt is only ever 0 or 1 here).
            if (isQuints(f)) return hasBonus(f) ? FIVE_BONUS : FIVE_OF_A_KIND;
            if (isRF(f)) return ROYAL_FLUSH;
            if (isSF(f)) return STRAIGHT_FLUSH;
            if (isQuads(f)) return hasBonus(f) ? FOUR_BONUS : FOUR_OF_A_KIND;
            if (isFH(f)) return hasBonus(f) ? BONUS_FULL : FULL_HOUSE;
            if (isFlush(f)) return FLUSH;
            if (isStr(f)) return STRAIGHT;
            if (is3K(f)) return hasBonus(f) ? THREE_BONUS : THREE_OF_A_KIND;
            if (pairsCnt(f) === 2) return TWO_PAIRS;
            return NOTHING;
        },
    };
}
