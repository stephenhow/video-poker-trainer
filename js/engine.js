import { forEachCombination, removeCards } from './poker.js';
import { extractFeatures } from './handFeatures.js';

// Applies a 5-bit hold mask to a dealt hand. Bit convention matches the C++ engine:
// MSB (bit 4) = leftmost card, LSB (bit 0) = rightmost card.
export function applyMask(dealt, mask) {
    const held = [];
    for (let i = 0; i < 5; i++) {
        if ((mask >> (4 - i)) & 1) held.push(dealt[i]);
    }
    return held;
}

// For every one of the 32 possible hold masks, exhaustively enumerates every possible
// draw from the remaining deck and tallies the resulting hand-rank distribution, then
// computes that mask's EV under `payouts`.
// Returns { masks: [{mask, counts:[...], total, ev}, ...32 of them], bestMask, bestEv }.
export function evaluateAllMasks(game, dealt, payouts) {
    const remaining = removeCards(game.deck(), dealt);
    const numRanks = game.ranks.length;
    const results = new Array(32);
    let bestMask = 0, bestEv = -1;
    const handBuf = new Array(5);

    for (let mask = 0; mask < 32; mask++) {
        const held = applyMask(dealt, mask);
        const heldCount = held.length;
        for (let i = 0; i < heldCount; i++) handBuf[i] = held[i];
        const replacements = 5 - heldCount;
        const counts = new Array(numRanks).fill(0);
        let total = 0;

        forEachCombination(remaining, replacements, (drawn) => {
            for (let i = 0; i < replacements; i++) handBuf[heldCount + i] = drawn[i];
            const features = extractFeatures(handBuf);
            counts[game.evalRank(features)]++;
            total++;
        });

        let ev = 0;
        for (let r = 0; r < numRanks; r++) ev += counts[r] * payouts[r];
        ev /= total;

        results[mask] = { mask, counts, total, ev };
        if (ev > bestEv) { bestEv = ev; bestMask = mask; }
    }

    return { masks: results, bestMask, bestEv };
}
