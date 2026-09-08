import { JacksOrBetter } from './jacksOrBetter.js';
import { DeucesWild } from './deucesWild.js';
import { JokerPoker } from './jokerPoker.js';
import { DoubleDoubleBonus } from './doubleDoubleBonus.js';

// Add new game modules here -- each just needs {id, name, deck(), ranks, defaultPayouts, evalRank(features)}.
export const GAMES = [JacksOrBetter, DeucesWild, JokerPoker, DoubleDoubleBonus];
