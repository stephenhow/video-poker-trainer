import { SuperAcesBonus } from './superAcesBonus.js';

// Double Bonus is exactly Super Aces Bonus -- same deck, same rank categories (the three flat
// quad tiers with no kicker sub-bonus), same evalRank -- with just 2 payouts bumped (mirrors
// the C++ engine's `class DoubleBonus : public SuperAcesBonus` in more_games.h, which only
// overrides FOUR_234 and FULL_HOUSE). So this reuses SuperAcesBonus wholesale via spread
// rather than re-deriving any hand-evaluation logic.
const payouts = SuperAcesBonus.defaultPayouts.slice();
const rankIndex = (name) => SuperAcesBonus.ranks.indexOf(name);
payouts[rankIndex('Full House')] = 7;             // 6 -> 7
payouts[rankIndex('Four 2s, 3s or 4s')] = 100;    // 80 -> 100

export const DoubleBonus = {
    ...SuperAcesBonus,
    id: 'doubleBonus',
    name: 'Double Bonus',
    defaultPayouts: payouts,
};
