import { makeRankBonusGame } from './potOfGoldBonus.js';

// Pot O' Gold's Shamrock 7s: sevens carry the bonus. The 12.1 bonus on a 930 jackpot are the
// values the C++ engine's Shamrock7PayTable was analyzed at.
export const Shamrock7 = makeRankBonusGame({
    id: 'shamrock7',
    name: 'Shamrock 7s',
    bonusRank: 5, // rank index: 0=Deuce ... 5=Seven
    plural: 'Sevens',
    bonus: 12.1,
    jackpot: 930,
    art: 'shamrock',
    strategyPdf: { href: 'shamrock7.pdf', label: 'Optimal strategy (PDF)' },
});
