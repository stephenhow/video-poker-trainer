import { shuffle, cardHtml, isWild, cardStr } from './poker.js';
import { evaluateAllMasks, applyMask } from './engine.js';
import { extractFeatures } from './handFeatures.js';
import { GAMES } from './games/index.js';

const el = (id) => document.getElementById(id);
const gameSelect = el('game-select');
const paytableEl = el('paytable');
const selectorCardsEl = el('selector-cards');
const playCardsEl = el('play-cards');
const creditMeterEl = el('credit-meter-value');
const outcomeBannerEl = el('outcome-banner');
const dealBtn = el('deal-btn');
const drawBtn = el('draw-btn');
const feedbackEl = el('feedback');
const feedbackHeadline = el('feedback-headline');
const feedbackDetail = el('feedback-detail');
const maskTableEl = el('mask-table');

let game = GAMES[0];
let payouts = game.defaultPayouts.slice();
let dealt = [];          // the 5 originally-dealt cards -- shown in the selector row, never changes mid-hand
let heldMask = 0;
let phase = 'idle';      // 'idle' | 'holding' | 'result'
let resultCards = null;  // held cards + newly-drawn replacements, set once Draw is pressed

const stats = { hands: 0, optimal: 0, evLost: 0, credits: 0 };

function fmt(n, d = 3) { return n.toFixed(d); }
function isHeld(i) { return ((heldMask >> (4 - i)) & 1) === 1; }

function buildGameSelect() {
    gameSelect.innerHTML = GAMES.map((g, i) => `<option value="${i}">${g.name}</option>`).join('');
}

function renderPaytable() {
    paytableEl.innerHTML = game.ranks
        .map((name, i) => i)
        .sort((a, b) => payouts[b] - payouts[a] || b - a)
        .map(i => `
            <tr>
                <td>${game.ranks[i]}</td>
                <td><input type="number" min="0" step="1" data-rank="${i}" value="${payouts[i]}"></td>
            </tr>`)
        .join('');
    paytableEl.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
            const r = Number(inp.dataset.rank);
            const v = Number(inp.value);
            payouts[r] = Number.isFinite(v) && v >= 0 ? v : 0;
        });
    });
}

function switchGame(index) {
    game = GAMES[index];
    payouts = game.defaultPayouts.slice();
    renderPaytable();
    resetHand();
    resetStats();
}

function resetHand() {
    dealt = [];
    heldMask = 0;
    phase = 'idle';
    resultCards = null;
    selectorCardsEl.innerHTML = '';
    playCardsEl.innerHTML = '';
    outcomeBannerEl.classList.add('hidden');
    outcomeBannerEl.textContent = '';
    feedbackEl.classList.add('hidden');
    dealBtn.disabled = false;
    drawBtn.disabled = true;
}

function makeCardDiv(card, { held = false, isBack = false, drawn = false, interactive = false, onToggle = null } = {}) {
    const div = document.createElement('div');
    div.className = 'card' + (held ? ' held' : '') + (isBack ? ' back' : '');
    if (isBack) {
        div.setAttribute('aria-label', 'face-down card');
    } else {
        div.innerHTML = cardHtml(card, game.wildLabel) + (drawn ? '<span class="badge">drawn</span>' : '');
        div.setAttribute('aria-label', (isWild(card) ? 'Wild' : cardStr(card)) + (held ? ', held' : ''));
    }
    if (interactive) {
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-pressed', String(held));
        div.addEventListener('click', onToggle);
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
        });
    } else {
        div.classList.add('disabled');
    }
    return div;
}

// The selector row always shows the original dealt hand, unchanged for the whole round --
// this is what the player clicks to hold/discard, and what they can compare their choice
// against afterward without it having been altered by the draw.
function renderSelectorCards() {
    selectorCardsEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const held = isHeld(i);
        const toggle = () => {
            heldMask ^= (1 << (4 - i));
            renderSelectorCards();
            renderPlayCards();
        };
        selectorCardsEl.appendChild(makeCardDiv(dealt[i], {
            held, interactive: phase === 'holding', onToggle: toggle,
        }));
    }
}

// The play row mirrors the selector: held cards flip face-up immediately, everything else
// stays a face-down back until Draw is pressed, at which point the discarded positions
// reveal the actual replacement cards that were drawn.
function renderPlayCards() {
    playCardsEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const held = isHeld(i);
        if (phase === 'result') {
            playCardsEl.appendChild(makeCardDiv(resultCards[i], { held, drawn: !held }));
        } else if (held) {
            playCardsEl.appendChild(makeCardDiv(dealt[i], { held }));
        } else {
            playCardsEl.appendChild(makeCardDiv(null, { isBack: true }));
        }
    }
}

function dealHand() {
    const deck = shuffle(game.deck());
    dealt = deck.slice(0, 5);
    heldMask = 0;
    phase = 'holding';
    resultCards = null;
    feedbackEl.classList.add('hidden');
    outcomeBannerEl.classList.add('hidden');
    outcomeBannerEl.textContent = '';
    dealBtn.disabled = true;
    drawBtn.disabled = false;
    renderSelectorCards();
    renderPlayCards();
}

function shuffleRemaining() {
    const rem = game.deck();
    for (const c of dealt) {
        const idx = rem.indexOf(c);
        if (idx !== -1) rem.splice(idx, 1);
    }
    return shuffle(rem);
}

function doDraw() {
    const { masks, bestMask, bestEv } = evaluateAllMasks(game, dealt, payouts);
    const yourResult = masks[heldMask];
    const heldCards = applyMask(dealt, heldMask);
    const drawnCards = shuffleRemaining().slice(0, 5 - heldCards.length);

    resultCards = [];
    let di = 0;
    for (let i = 0; i < 5; i++) {
        resultCards.push(isHeld(i) ? dealt[i] : drawnCards[di++]);
    }
    const resultRank = game.evalRank(extractFeatures(resultCards));
    const resultPayout = payouts[resultRank];

    phase = 'result';
    dealBtn.disabled = false;
    drawBtn.disabled = true;
    renderSelectorCards();
    renderPlayCards();

    const isOptimal = Math.abs(yourResult.ev - bestEv) < 1e-9;
    const evLoss = bestEv - yourResult.ev;

    stats.hands++;
    if (isOptimal) stats.optimal++;
    stats.evLost += evLoss;
    stats.credits += resultPayout - 1;
    renderStats();

    outcomeBannerEl.classList.remove('hidden');
    outcomeBannerEl.classList.toggle('zero', resultPayout === 0);
    outcomeBannerEl.textContent = resultPayout > 0
        ? `${game.ranks[resultRank]} -- WIN ${resultPayout}`
        : `${game.ranks[resultRank]} -- no win`;

    feedbackEl.classList.remove('hidden');
    feedbackHeadline.className = isOptimal ? 'good' : 'bad';
    feedbackHeadline.textContent = isOptimal
        ? `Optimal! You made a ${game.ranks[resultRank]} -- paid ${resultPayout}.`
        : `Not quite. You made a ${game.ranks[resultRank]} -- paid ${resultPayout}.`;
    feedbackDetail.innerHTML = isOptimal
        ? `Your hold (EV ${fmt(yourResult.ev)}) was the mathematically best play.`
        : `Your hold's EV was ${fmt(yourResult.ev)}. The best play was to hold `
          + `${describeMask(bestMask)} (EV ${fmt(bestEv)}) -- you gave up ${fmt(evLoss)} in expected value.`;

    renderMaskTable(masks, bestMask, heldMask);
}

function describeMask(mask) {
    const cards = applyMask(dealt, mask);
    if (cards.length === 0) return 'nothing (discard all)';
    return cards.map(c => cardHtml(c, game.wildLabel)).join(' ');
}

function renderMaskTable(masks, bestMask, yourMask) {
    const sorted = masks.slice().sort((a, b) => b.ev - a.ev);
    maskTableEl.innerHTML = '<tr><th>Hold</th><th>EV</th></tr>' + sorted.slice(0, 10).map(m => {
        const cls = [];
        if (m.mask === bestMask) cls.push('best-row');
        if (m.mask === yourMask) cls.push('your-row');
        const label = m.mask === 0 ? '<em>discard all</em>' : describeMask(m.mask);
        const tag = m.mask === bestMask ? ' ★' : (m.mask === yourMask ? ' ← you' : '');
        return `<tr class="${cls.join(' ')}"><td>${label}${tag}</td><td>${fmt(m.ev)}</td></tr>`;
    }).join('');
}

function renderStats() {
    el('stat-hands').textContent = stats.hands;
    el('stat-optimal').textContent = stats.optimal;
    el('stat-accuracy').textContent = stats.hands ? `${(100 * stats.optimal / stats.hands).toFixed(1)}%` : '—';
    el('stat-evlost').textContent = fmt(stats.evLost);
    el('stat-credits').textContent = stats.credits.toFixed(2);
    creditMeterEl.textContent = stats.credits.toFixed(2);
}

function resetStats() {
    stats.hands = 0; stats.optimal = 0; stats.evLost = 0; stats.credits = 0;
    renderStats();
}

gameSelect.addEventListener('change', () => switchGame(Number(gameSelect.value)));
dealBtn.addEventListener('click', dealHand);
drawBtn.addEventListener('click', doDraw);
el('reset-stats').addEventListener('click', resetStats);

buildGameSelect();
renderPaytable();
renderStats();
resetHand();
