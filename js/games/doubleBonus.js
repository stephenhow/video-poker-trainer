import { SuperAcesBonus } from './superAcesBonus.js';

// Double Bonus is exactly Super Aces Bonus -- same deck, same rank categories (the three flat
// quad tiers with no kicker sub-bonus), same evalRank -- with a different pay table layered on
// top (mirrors the C++ engine's `class DoubleBonus : public SuperAcesBonus` in more_games.h).
// This is the 9/7/5 full-pay schedule from doubleBonus9911.pdf (EV 0.991065); Four 2s/3s/4s
// stays at the base's 80. So this reuses SuperAcesBonus wholesale via spread rather than
// re-deriving any hand-evaluation logic.
const payouts = SuperAcesBonus.defaultPayouts.slice();
const rankIndex = (name) => SuperAcesBonus.ranks.indexOf(name);
payouts[rankIndex('Four Aces')] = 160;            // 400 -> 160
payouts[rankIndex('Straight Flush')] = 50;        // 60 -> 50
payouts[rankIndex('Full House')] = 9;             // 6 -> 9
payouts[rankIndex('Flush')] = 7;                  // 5 -> 7
payouts[rankIndex('Straight')] = 5;               // 4 -> 5

export const DoubleBonus = {
    ...SuperAcesBonus,
    id: 'doubleBonus',
    name: 'Double Bonus',
    defaultPayouts: payouts,
    strategyPdf: { href: 'doubleBonus9911.pdf', label: 'Optimal strategy (PDF)' },
};
