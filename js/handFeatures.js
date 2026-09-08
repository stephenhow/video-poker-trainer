// Hand-feature extraction, mirroring the C++ engine's VPHand: build per-suit rank
// bitmasks once per 5-card hand, then answer flush/straight/pair/trip/quad questions
// via cheap bit tricks and precomputed lookup tables.
//
// This is called up to ~2.6 million times per hand evaluated (once per possible draw,
// summed over all 32 hold masks), so `extractFeatures` returns a plain reused object
// (no per-call closures/methods) and the predicate functions below take that object as
// a plain argument -- keeps this hot path allocation-free and V8-friendly.

import { isWild, rankOf, suitOf, popcount } from './poker.js';

const TEN = 8; // rank index of Ten -- royal ranks are TEN..ACE

// straightWindow[k][mask13] === 1 iff some 5-consecutive-rank window (including the
// ace-low wheel, A-2-3-4-5) over the 13-bit rank mask `mask13` contains exactly k set bits.
// k=5 is an ordinary made straight; k<5 is "k real ranks toward a straight, needs (5-k) wilds".
const straightWindow = [0, 1, 2, 3, 4, 5].map(() => new Uint8Array(8192));
for (let mask13 = 0; mask13 < 8192; mask13++) {
    const hasAce = (mask13 & (1 << 12)) ? 1 : 0;
    const strMask = ((mask13 << 1) | hasAce) & 0x3fff; // 14 bits: bit0=ace-low, bit(r+1)=rank r
    for (let j = 0; j <= 9; j++) {
        const cnt = popcount((strMask >> j) & 0x1f);
        if (cnt >= 1 && cnt <= 5) straightWindow[cnt][mask13] = 1;
    }
}

// reused scratch object -- extractFeatures overwrites and returns this same object every call
const F = {
    rankMask: [0, 0, 0, 0],
    rankCount: new Array(13).fill(0),
    jokerCnt: 0,
    pairs: [], trips: [], quads: [], kickers: [],
    unionMask: 0, maxSuitCnt: 0, maxSuit: -1, suitsCnt: 0, realCnt: 0,
};

export function extractFeatures(cards) {
    F.rankMask[0] = F.rankMask[1] = F.rankMask[2] = F.rankMask[3] = 0;
    F.pairs.length = 0; F.trips.length = 0; F.quads.length = 0; F.kickers.length = 0;
    F.jokerCnt = 0;
    for (let r = 0; r < 13; r++) F.rankCount[r] = 0;

    for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (isWild(c)) { F.jokerCnt++; continue; }
        const r = rankOf(c), s = suitOf(c);
        F.rankMask[s] |= (1 << r);
        F.rankCount[r]++;
    }
    for (let r = 0; r < 13; r++) {
        const n = F.rankCount[r];
        if (n === 2) F.pairs.push(r);
        else if (n === 3) F.trips.push(r);
        else if (n === 4) F.quads.push(r);
        else if (n === 1) F.kickers.push(r);
    }
    F.kickers.sort((a, b) => b - a); // highest rank first, mirroring the C++ engine's kickers vector
    F.unionMask = F.rankMask[0] | F.rankMask[1] | F.rankMask[2] | F.rankMask[3];
    F.maxSuitCnt = 0; F.maxSuit = -1; F.suitsCnt = 0;
    for (let s = 0; s < 4; s++) {
        const cnt = popcount(F.rankMask[s]);
        if (cnt > 0) F.suitsCnt++;
        if (cnt > F.maxSuitCnt) { F.maxSuitCnt = cnt; F.maxSuit = s; }
    }
    F.realCnt = cards.length - F.jokerCnt;
    return F;
}

export function hasJoker(f) { return f.jokerCnt > 0; }
export function pairsCnt(f) { return f.pairs.length; }
export function tripsCnt(f) { return f.trips.length; }
export function quadsCnt(f) { return f.quads.length; }
export function pairRank(f, i = 0) { return f.pairs[i]; }
export function tripRank(f) { return f.trips[0]; }
export function quadRank(f) { return f.quads[0]; }
export function hasRank(f, r) { return ((f.unionMask >> r) & 1) === 1; }
export function hasKicker(f) { return f.kickers.length > 0; }
export function kickerRank(f, i = 0) { return f.kickers[i]; }

// exactly n of the 5 royal ranks (T,J,Q,K,A) present in some ONE suit
export function isNRoyal(f, n) {
    for (let s = 0; s < 4; s++) {
        const shifted = (f.rankMask[s] >> TEN) & 0x1f;
        if (popcount(shifted) === n) return true;
    }
    return false;
}
export function isRF(f) { return isNRoyal(f, 5 - f.jokerCnt); }

// n real cards (across the whole hand) sit in a straight-completable window
export function isNStraight(f, n) { return straightWindow[n][f.unionMask] === 1; }
export function isStr(f) { return isNStraight(f, 5 - f.jokerCnt); }

// n real cards, ALL of one suit, sit in a straight-completable window (straight flush)
export function isNSuitedStraight(f, n) {
    for (let s = 0; s < 4; s++) if (straightWindow[n][f.rankMask[s]] === 1) return true;
    return false;
}
export function isSF(f) { return isNSuitedStraight(f, 5 - f.jokerCnt); }

export function isFlush(f) { return (f.maxSuitCnt + f.jokerCnt) === 5; }

export function hasPair(f) { return f.pairs.length > 0; }

// Five of a kind: n real cards of one rank + (5-n) wilds complete it.
export function isQuints(f) {
    switch (f.jokerCnt) {
        case 4: return true;
        case 3: return pairsCnt(f) > 0;
        case 2: return tripsCnt(f) > 0;
        case 1: return quadsCnt(f) > 0;
        default: return false; // impossible with 0 wilds in a single deck
    }
}

// Four of a kind, wildcard-aware.
export function isQuads(f) {
    switch (f.jokerCnt) {
        case 4: return true;
        case 3: return true;
        case 2: return pairsCnt(f) > 0;
        case 1: return tripsCnt(f) > 0;
        default: return quadsCnt(f) > 0;
    }
}

// Full house, wildcard-aware. (jokerCnt>=2 can't actually reach here in practice --
// isQuints/isQuads already claim those hands earlier in any sane rank-priority order --
// but the fallback is still correct if ever reached.)
export function isFH(f) {
    if (f.jokerCnt === 1) return pairsCnt(f) === 2;
    return tripsCnt(f) > 0 && pairsCnt(f) > 0;
}

// Three of a kind, wildcard-aware. For jokerCnt===2, any one of the 3 real cards plus
// both wilds always makes trips -- this is only reached when isQuads/isQuints (pair-of-
// reals or trip-of-reals cases) have already been ruled out earlier in rank priority.
export function is3K(f) {
    switch (f.jokerCnt) {
        case 2: return true;
        case 1: return pairsCnt(f) > 0;
        default: return tripsCnt(f) > 0;
    }
}
