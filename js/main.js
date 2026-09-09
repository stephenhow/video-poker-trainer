import { shuffle, cardHtml, cardStr, defaultWildLabel } from './poker.js';
import { evaluateAllMasks, applyMask } from './engine.js';
import { extractFeatures } from './handFeatures.js';
import { GAMES } from './games/index.js';

const el = (id) => document.getElementById(id);
const gameSelect = el('game-select');
const paytableEl = el('paytable');
const strategyDownloadEl = el('strategy-download');
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
let handOutcome = null;  // {rank, payout} of the drawn hand, as actually paid at draw time
let analysisTimer = null; // debounce for re-analysing after a pay table edit

const stats = { hands: 0, optimal: 0, evLost: 0, credits: 0 };

function fmt(n, d = 3) { return n.toFixed(d); }
function isHeld(i) { return ((heldMask >> (4 - i)) & 1) === 1; }

// Games that declare a `group` are wrapped in a labeled <optgroup>, which the browser renders
// as a non-selectable heading separating them from what came before -- currently the
// Pot O' Gold cabinet games. Option values stay the GAMES index either way, so grouping is
// purely presentational. Games sharing a group need to be adjacent in GAMES, or they'd render
// as two separate headings with the same label (see test.mjs).
function buildGameSelect() {
    let html = '';
    let openGroup = null;
    GAMES.forEach((g, i) => {
        const group = g.group || null;
        if (group !== openGroup) {
            if (openGroup) html += '</optgroup>';
            if (group) html += `<optgroup label="${group}">`;
            openGroup = group;
        }
        html += `<option value="${i}">${g.name}</option>`;
    });
    if (openGroup) html += '</optgroup>';
    gameSelect.innerHTML = html;
}

function renderPaytable() {
    paytableEl.innerHTML = game.ranks
        .map((name, i) => i)
        .sort((a, b) => payouts[b] - payouts[a] || b - a)
        .map(i => `
            <tr>
                <td>${game.ranks[i]}</td>
                <td><input type="number" min="0" step="any" data-rank="${i}" value="${payouts[i]}"></td>
            </tr>`)
        .join('');
    paytableEl.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
            const r = Number(inp.dataset.rank);
            const v = Number(inp.value);
            payouts[r] = Number.isFinite(v) && v >= 0 ? v : 0;
            // Re-analyse the hand on screen under the edited schedule. The table itself is left
            // as-is rather than re-rendered -- it's sorted by payout, so rebuilding it here
            // would yank the row out from under the cursor mid-edit.
            scheduleAnalysisRefresh();
        });
    });
}

const DOWNLOAD_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" '
    + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5v8M4.5 6.5 8 10l3.5-3.5M2.5 12.5h11"/></svg>';

// Only games that name a strategy PDF (see js/games/*.js's `strategyPdf`) get a download link
// here -- most games don't have one yet, so this stays hidden for them.
function renderStrategyLink() {
    if (!game.strategyPdf) {
        strategyDownloadEl.classList.add('hidden');
        strategyDownloadEl.innerHTML = '';
        return;
    }
    const { href, label } = game.strategyPdf;
    strategyDownloadEl.classList.remove('hidden');
    strategyDownloadEl.innerHTML = `<a class="strategy-link" href="${href}" download>${DOWNLOAD_ICON}<span>${label}</span></a>`;
}

function switchGame(index) {
    game = GAMES[index];
    payouts = game.defaultPayouts.slice();
    renderPaytable();
    renderStrategyLink();
    resetHand();
    resetStats();
}

function resetHand() {
    clearTimeout(analysisTimer); // don't let a queued re-analysis fire against a cleared hand
    dealt = [];
    heldMask = 0;
    phase = 'idle';
    resultCards = null;
    handOutcome = null;
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
        const wildLabelFn = game.wildLabel || defaultWildLabel;
        div.innerHTML = cardHtml(card, wildLabelFn) + (drawn ? '<span class="badge">drawn</span>' : '');
        const label = wildLabelFn(card);
        const ariaLabel = label ? [label.rank, label.suit, 'Wild'].filter(Boolean).join(' ') : cardStr(card);
        div.setAttribute('aria-label', ariaLabel + (held ? ', held' : ''));
        // A game can watermark particular cards -- Shamrock 7s' sevens, 8-Ball's eights, the
        // joker games' jokers. cardArt() names the artwork for a card (or returns null);
        // style.css keys the image off this attribute. Decorative only.
        const art = game.cardArt?.(card);
        if (art) div.dataset.cardArt = art;
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

// Re-runs the 32-mask analysis of the current hand against the pay table as it stands right
// now, and repaints the feedback panel. Called once after a draw, and again whenever a payout
// is edited, so the EV table always reflects the schedule on screen. Returns the figures the
// caller needs for session stats.
//
// Deliberately does not touch the outcome banner, the credit meter or the session stats: those
// record the hand as it was actually played and paid. Editing the pay table afterwards asks
// "what would the right play have been under this schedule?", which shouldn't rewrite history.
function renderAnalysis() {
    const { masks, bestMask, bestEv } = evaluateAllMasks(game, dealt, payouts);
    const yourResult = masks[heldMask];
    const isOptimal = Math.abs(yourResult.ev - bestEv) < 1e-9;
    const evLoss = bestEv - yourResult.ev;

    feedbackEl.classList.remove('hidden');
    feedbackHeadline.className = isOptimal ? 'good' : 'bad';
    feedbackHeadline.textContent = isOptimal
        ? `Optimal! You made a ${game.ranks[handOutcome.rank]} -- paid ${handOutcome.payout}.`
        : `Not quite. You made a ${game.ranks[handOutcome.rank]} -- paid ${handOutcome.payout}.`;
    feedbackDetail.innerHTML = isOptimal
        ? `Your hold (EV ${fmt(yourResult.ev)}) was the mathematically best play.`
        : `Your hold's EV was ${fmt(yourResult.ev)}. The best play was to hold `
          + `${describeMask(bestMask)} (EV ${fmt(bestEv)}) -- you gave up ${fmt(evLoss)} in expected value.`;

    renderMaskTable(masks, bestMask, heldMask);
    return { isOptimal, evLoss };
}

// A full sweep takes a few hundred ms (longer on the 53-card joker decks) and blocks the UI,
// so wait for a pause in typing rather than recomputing on every keystroke.
function scheduleAnalysisRefresh() {
    if (phase !== 'result') return; // nothing on screen to refresh yet
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(renderAnalysis, 250);
}

function doDraw() {
    const heldCards = applyMask(dealt, heldMask);
    const drawnCards = shuffleRemaining().slice(0, 5 - heldCards.length);

    resultCards = [];
    let di = 0;
    for (let i = 0; i < 5; i++) {
        resultCards.push(isHeld(i) ? dealt[i] : drawnCards[di++]);
    }
    const resultRank = game.evalRank(extractFeatures(resultCards));
    const resultPayout = payouts[resultRank];
    handOutcome = { rank: resultRank, payout: resultPayout };

    phase = 'result';
    dealBtn.disabled = false;
    drawBtn.disabled = true;
    renderSelectorCards();
    renderPlayCards();

    const { isOptimal, evLoss } = renderAnalysis();

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
renderStrategyLink();
renderStats();
resetHand();
