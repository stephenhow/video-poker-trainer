// Card representation: integer 0-51 = rank*4 + suit. WILD is a sentinel for a wild card (deuce/joker).
// Rank: 0=Deuce, 1=Trey, 2=Four, ... 8=Ten, 9=Jack, 10=Queen, 11=King, 12=Ace
// Suit: 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
// (This numbering mirrors the C++ engine's poker::Card::Rank/Suit enums.)

export const WILD = -1;

const RANK_CHARS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUIT_CHARS = ['c', 'd', 'h', 's'];
const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠']; // club, diamond, heart, spade
const RANK_NAMES = ['Deuce', 'Trey', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];

export function makeCard(rank, suit) { return rank * 4 + suit; }
export function rankOf(card) { return card >> 2; }
export function suitOf(card) { return card & 3; }
export function isWild(card) { return card === WILD; }

export function cardStr(card) {
    if (isWild(card)) return '*';
    return RANK_CHARS[rankOf(card)] + SUIT_CHARS[suitOf(card)];
}

// `wildLabel` lets each game say what its wild card actually represents: a wild deuce
// (Deuces Wild: rank "2", so it reads like a real card that happens to be wild) vs. an
// actual joker (games with a real Joker card: no rank, just "Wild"). Defaults to the
// joker case.
export function cardHtml(card, wildLabel = { rank: '', suit: 'Wild' }) {
    if (isWild(card)) return `<span class="rank">${wildLabel.rank}</span><span class="suit wild">${wildLabel.suit}</span>`;
    const suit = suitOf(card);
    const red = (suit === 1 || suit === 2);
    return `<span class="rank">${RANK_CHARS[rankOf(card)]}</span><span class="suit${red ? ' red' : ''}">${SUIT_SYMBOLS[suit]}</span>`;
}

export function rankName(rank) { return RANK_NAMES[rank]; }

// Standard 52-card deck (no wilds).
export function standardDeck() {
    const deck = [];
    for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) deck.push(makeCard(r, s));
    return deck;
}

// 52-card deck for Deuces Wild: the 4 deuces are removed and replaced with 4 WILD entries
// (mirrors the C++ engine's FULL_DW_DECK -- deuces never appear as literal cards, so the
// combinatorics/compression naturally treat them as fully generic wild cards).
export function deucesWildDeck() {
    const deck = [];
    for (let r = 1; r < 13; r++) for (let s = 0; s < 4; s++) deck.push(makeCard(r, s));
    for (let i = 0; i < 4; i++) deck.push(WILD);
    return deck;
}

// Standard 52-card deck plus a single real Joker (mirrors the C++ engine's poker::JOKER_DECK)
// -- for games with exactly one wild card, an actual joker rather than a wild rank.
export function jokerDeck() {
    return [...standardDeck(), WILD];
}

// 52-card deck for One-Eyed Jacks: the Jack of hearts and Jack of spades are removed and
// replaced with 2 real Jokers (mirrors the C++ engine's ONE_EYED_JACKS_DECK) -- Jc/Jd remain
// ordinary cards, so up to 2 wilds can appear in a hand.
const JACK = 9, HEARTS = 2, SPADES = 3;
export function oneEyedJacksDeck() {
    const deck = [];
    for (let r = 0; r < 13; r++) {
        for (let s = 0; s < 4; s++) {
            if (r === JACK && (s === HEARTS || s === SPADES)) continue;
            deck.push(makeCard(r, s));
        }
    }
    deck.push(WILD, WILD);
    return deck;
}

// Fisher-Yates shuffle (in place), returns the array for convenience.
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function removeCards(deck, cards) {
    const remaining = deck.slice();
    for (const c of cards) {
        const idx = remaining.indexOf(c);
        if (idx !== -1) remaining.splice(idx, 1);
    }
    return remaining;
}

// Calls callback(comboArray) for every k-combination of items, reusing one buffer array
// (the callback must not retain a reference to it past the call) to avoid allocation
// pressure -- this runs up to ~2.6 million times per hand evaluated.
export function forEachCombination(items, k, callback) {
    const n = items.length;
    if (k === 0) { callback([]); return; }
    if (k > n) return;
    const combo = new Array(k);
    function recurse(start, depth) {
        const remaining = k - depth;
        const lastStart = n - remaining;
        if (depth === k) { callback(combo); return; }
        for (let i = start; i <= lastStart; i++) {
            combo[depth] = items[i];
            recurse(i + 1, depth + 1);
        }
    }
    recurse(0, 0);
}

export function popcount(x) {
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f;
    return (x * 0x01010101) >> 24;
}
