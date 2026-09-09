import { makeRankBonusGame } from './potOfGoldBonus.js';

// Pot O' Gold's 8-Ball: identical to Shamrock 7s except eights carry the bonus instead of
// sevens. The bonus is larger (12.6 vs 12.1), which is why the machine breaks even at a lower
// 825 jackpot -- the higher average 888 bonus makes up the difference.
export const EightBall = makeRankBonusGame({
    id: 'eightBall',
    name: '8-Ball',
    bonusRank: 6, // rank index: 0=Deuce ... 6=Eight
    plural: 'Eights',
    bonus: 12.6,
    jackpot: 825,
    strategyPdf: { href: '8ball.pdf', label: 'Optimal strategy (PDF)' },
});
