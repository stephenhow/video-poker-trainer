import { JacksOrBetter } from './jacksOrBetter.js';

// Bonus Poker Deluxe is exactly Jacks or Better -- same deck, same rank categories, same
// evalRank logic -- with just 2 payouts bumped (mirrors the C++ engine's
// `class BonusPokerDeluxe : public JacksOrBetter` in video_poker.h, which only overrides
// FOUR_OF_A_KIND and TWO_PAIRS). So this reuses JacksOrBetter wholesale via spread rather than
// re-deriving any hand-evaluation logic.
const payouts = JacksOrBetter.defaultPayouts.slice();
const rankIndex = (name) => JacksOrBetter.ranks.indexOf(name);
payouts[rankIndex('Two Pair')] = 1;       // 2 -> 1
payouts[rankIndex('Four of a Kind')] = 80; // 25 -> 80

export const BonusPokerDeluxe = {
    ...JacksOrBetter,
    id: 'bonusPokerDeluxe',
    name: 'Bonus Poker Deluxe',
    defaultPayouts: payouts,
    strategyPdf: { href: 'bonusPokerDeluxe.pdf', label: 'Optimal strategy (PDF)' },
};
