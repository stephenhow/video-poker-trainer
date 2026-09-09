import { DoubleDoubleBonus } from './doubleDoubleBonus.js';

// Triple Double Bonus is exactly Double Double Bonus -- same deck, same rank categories
// (including the quad-kicker sub-bonus logic), same evalRank -- with just 3 payouts bumped
// (mirrors the C++ engine's `class TripleDoubleBonus : public DoubleDoubleBonus` in
// video_poker.h, which only overrides FOUR_ACES_W_KICKER, FOUR_234_W_KICKER, and
// THREE_OF_A_KIND). So this reuses DoubleDoubleBonus wholesale via spread rather than
// re-deriving any hand-evaluation logic.
const payouts = DoubleDoubleBonus.defaultPayouts.slice();
const rankIndex = (name) => DoubleDoubleBonus.ranks.indexOf(name);
payouts[rankIndex('Three of a Kind')] = 2;                        // 3 -> 2
payouts[rankIndex('Four 2s, 3s or 4s + A-4 Kicker')] = 400;        // 160 -> 400
payouts[rankIndex('Four Aces + 2-4 Kicker')] = 800;                // 400 -> 800

export const TripleDoubleBonus = {
    ...DoubleDoubleBonus,
    id: 'tripleDoubleBonus',
    name: 'Triple Double Bonus',
    defaultPayouts: payouts,
};
