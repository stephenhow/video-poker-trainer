import { JacksOrBetter } from './jacksOrBetter.js';
import { BonusPokerDeluxe } from './bonusPokerDeluxe.js';
import { DeucesWild } from './deucesWild.js';
import { JokerPoker } from './jokerPoker.js';
import { DoubleDoubleBonus } from './doubleDoubleBonus.js';
import { TripleDoubleBonus } from './tripleDoubleBonus.js';
import { SuperAcesBonus } from './superAcesBonus.js';
import { DoubleBonus } from './doubleBonus.js';
import { OneEyedJacks } from './oneEyedJacks.js';
import { WildJoker } from './wildJoker.js';
import { Shamrock7 } from './shamrock7.js';

// Add new game modules here -- each just needs {id, name, deck(), ranks, defaultPayouts, evalRank(features)}.
export const GAMES = [JacksOrBetter, BonusPokerDeluxe, DeucesWild, JokerPoker, DoubleDoubleBonus, TripleDoubleBonus, SuperAcesBonus, DoubleBonus, OneEyedJacks, WildJoker, Shamrock7];
