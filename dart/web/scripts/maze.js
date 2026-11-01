// Momentum Maze — daily edition.
//
// Every day has a fixed set of puzzles, generated deterministically from the
// player's local date, so everyone who plays on a given day sees the same set.
// Puzzles get progressively harder (optimal solution length follows
// DIFFICULTY_RAMP). The score is the total number of moves over par across
// the set, golf-style. Undo is free; using "Solve" marks a puzzle as assisted.
//
// IMPORTANT: anything that affects puzzle generation (grid size, wall
// probability, the ramp, the RNG, candidate ordering, ...) changes every
// day's puzzles. If you change generation, bump GENERATOR_VERSION and avoid
// deploying mid-day.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROWS = 8;
const COLS = 8;
const NUM_CELLS = ROWS * COLS;
const NUM_ORBS = 4;
const WALL_PROBABILITY = 0.15;
const DIFFICULTY_RAMP = [3, 4, 5, 6]; // optimal moves for each puzzle of the day
// From this optimal length up, a puzzle must not be solvable by moving only
// the goal orb in that many moves (forces using other orbs as blockers).
const MIN_TARGET_FOR_BLOCKER_RULE = 4;
const GENERATOR_VERSION = 1;
const MAX_BOARD_ATTEMPTS = 500;

// Puzzle #1 is November 1st, 2026.
const EPOCH_UTC_MS = Date.UTC(2026, 10, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STORAGE_KEY = "momentumMaze.daily.v1";
const HELP_SEEN_KEY = "momentumMaze.helpSeen";

const COLORS = [
    "#D32F2F", // red
    "#1976D2", // blue
    "#FBC02D", // yellow
    "#388E3C", // green
];

// Directions: index -> name / delta
const DIRS = ["left", "right", "up", "down"];
const DIR_DX = [-1, 1, 0, 0];
const DIR_DY = [0, 0, -1, 1];

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

function hashString(str) { // FNV-1a, 32-bit
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function localDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function puzzleNumberForDateKey(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC_MS) / MS_PER_DAY) + 1;
}

// ---------------------------------------------------------------------------
// Board model
//
// verticalWalls[x][y]: wall on the left edge of cell (x, y)  (x in 0..COLS)
// horizontalWalls[y][x]: wall on the top edge of cell (x, y) (y in 0..ROWS)
// Cells are indexed as y * COLS + x.
// ---------------------------------------------------------------------------

function generateWalls(rng) {
    const verticalWalls = Array.from({ length: COLS + 1 }, () => Array(ROWS).fill(false));
    const horizontalWalls = Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(false));
    for (let y = 0; y < ROWS; y++) { verticalWalls[0][y] = true; verticalWalls[COLS][y] = true; }
    for (let x = 0; x < COLS; x++) { horizontalWalls[0][x] = true; horizontalWalls[ROWS][x] = true; }
    for (let x = 1; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (rng() < WALL_PROBABILITY) verticalWalls[x][y] = true;
    for (let y = 1; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (rng() < WALL_PROBABILITY) horizontalWalls[y][x] = true;
    return { verticalWalls, horizontalWalls };
}

// blocked[cell * 4 + dir] is true if a wall stops movement out of `cell` in `dir`.
function buildBlockedTable(walls) {
    const blocked = new Uint8Array(NUM_CELLS * 4);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const c = y * COLS + x;
            blocked[c * 4 + 0] = walls.verticalWalls[x][y] ? 1 : 0;
            blocked[c * 4 + 1] = walls.verticalWalls[x + 1][y] ? 1 : 0;
            blocked[c * 4 + 2] = walls.horizontalWalls[y][x] ? 1 : 0;
            blocked[c * 4 + 3] = walls.horizontalWalls[y + 1][x] ? 1 : 0;
        }
    }
    return blocked;
}

// positions: array of NUM_ORBS cell indices. Returns the cell where orb `orbIndex`
// stops when pushed in `dir` (equal to its current cell if it can't move).
function slideCell(blocked, positions, orbIndex, dir) {
    const delta = DIR_DX[dir] + DIR_DY[dir] * COLS;
    let c = positions[orbIndex];
    while (!blocked[c * 4 + dir]) {
        const n = c + delta;
        let occupied = false;
        for (let j = 0; j < positions.length; j++) {
            if (j !== orbIndex && positions[j] === n) { occupied = true; break; }
        }
        if (occupied) break;
        c = n;
    }
    return c;
}

// State encoding: 6 bits per orb.
function encodeState(positions) {
    let s = 0;
    for (let i = NUM_ORBS - 1; i >= 0; i--) s = s * 64 + positions[i];
    return s;
}
function decodeState(s, out) {
    for (let i = 0; i < NUM_ORBS; i++) { out[i] = s % 64; s = Math.floor(s / 64); }
    return out;
}

// Breadth-first search over full board states up to maxDepth moves.
// Returns, for every (orb, cell), the minimal number of moves needed for that
// orb to stop on that cell (-1 if not reachable within maxDepth), along with
// enough bookkeeping to reconstruct an optimal path.
function exploreBoard(blocked, startPositions, maxDepth) {
    const reachDepth = new Int8Array(NUM_ORBS * NUM_CELLS).fill(-1);
    const reachState = new Float64Array(NUM_ORBS * NUM_CELLS);
    const parent = new Map(); // state -> prevState * 16 + move  (move = orb * 4 + dir)
    const start = encodeState(startPositions);
    parent.set(start, -1);

    let frontier = [start];
    const pos = new Array(NUM_ORBS);
    for (let depth = 0; depth <= maxDepth && frontier.length > 0; depth++) {
        const next = [];
        for (const s of frontier) {
            decodeState(s, pos);
            for (let i = 0; i < NUM_ORBS; i++) {
                const k = i * NUM_CELLS + pos[i];
                if (reachDepth[k] === -1) { reachDepth[k] = depth; reachState[k] = s; }
            }
            if (depth === maxDepth) continue;
            for (let i = 0; i < NUM_ORBS; i++) {
                const original = pos[i];
                for (let dir = 0; dir < 4; dir++) {
                    const end = slideCell(blocked, pos, i, dir);
                    if (end === original) continue;
                    pos[i] = end;
                    const ns = encodeState(pos);
                    pos[i] = original;
                    if (!parent.has(ns)) {
                        parent.set(ns, s * 16 + i * 4 + dir);
                        next.push(ns);
                    }
                }
            }
        }
        frontier = next;
    }
    return { reachDepth, reachState, parent };
}

function reconstructPath(parent, endState) {
    const path = [];
    let s = endState;
    while (true) {
        const p = parent.get(s);
        if (p === -1 || p === undefined) break;
        const move = p % 16;
        path.push({ orbIndex: move >> 2, dir: DIRS[move & 3] });
        s = Math.floor(p / 16);
    }
    return path.reverse();
}

// Minimal moves for orb `orbIndex` to reach `goalCell` moving only that orb.
function singleOrbDistance(blocked, startPositions, orbIndex, goalCell) {
    const pos = startPositions.slice();
    const dist = new Int16Array(NUM_CELLS).fill(-1);
    dist[pos[orbIndex]] = 0;
    let queue = [pos[orbIndex]];
    while (queue.length) {
        const next = [];
        for (const c of queue) {
            if (c === goalCell) return dist[c];
            pos[orbIndex] = c;
            for (let dir = 0; dir < 4; dir++) {
                const end = slideCell(blocked, pos, orbIndex, dir);
                if (dist[end] === -1) { dist[end] = dist[c] + 1; next.push(end); }
            }
        }
        queue = next;
    }
    return Infinity;
}

function generatePuzzle(rng, targetMoves) {
    for (let attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
        const walls = generateWalls(rng);
        const blocked = buildBlockedTable(walls);
        const positions = [];
        while (positions.length < NUM_ORBS) {
            const c = Math.floor(rng() * NUM_CELLS);
            if (!positions.includes(c)) positions.push(c);
        }

        const { reachDepth, reachState, parent } = exploreBoard(blocked, positions, targetMoves);
        const candidates = [];
        for (let i = 0; i < NUM_ORBS; i++) {
            for (let c = 0; c < NUM_CELLS; c++) {
                if (reachDepth[i * NUM_CELLS + c] !== targetMoves) continue;
                if (positions.includes(c)) continue;
                if (targetMoves >= MIN_TARGET_FOR_BLOCKER_RULE &&
                    singleOrbDistance(blocked, positions, i, c) <= targetMoves) continue;
                candidates.push({ orbIndex: i, cell: c });
            }
        }
        if (candidates.length === 0) continue;

        const pick = candidates[Math.floor(rng() * candidates.length)];
        const solution = reconstructPath(parent, reachState[pick.orbIndex * NUM_CELLS + pick.cell]);
        return {
            walls,
            orbs: positions.map(c => ({ cellX: c % COLS, cellY: Math.floor(c / COLS) })),
            goal: { orbIndex: pick.orbIndex, cellX: pick.cell % COLS, cellY: Math.floor(pick.cell / COLS) },
            par: targetMoves,
            solution,
        };
    }
    throw new Error("Could not generate a puzzle with " + targetMoves + " moves");
}

function generateDailySet(dateKey) {
    const rng = mulberry32(hashString(`momentum-maze-v${GENERATOR_VERSION}-${dateKey}`));
    return DIFFICULTY_RAMP.map(target => generatePuzzle(rng, target));
}

// ---------------------------------------------------------------------------
// Scoring & sharing
// ---------------------------------------------------------------------------

function formatOverPar(n) { return "+" + n; }

function summarizeResults(results) {
    const solved = results.filter(r => !r.assisted);
    const overPar = solved.reduce((sum, r) => sum + (r.moves - r.par), 0);
    return { overPar, solvedCount: solved.length, total: results.length };
}

function resultEmoji(r) {
    if (r.assisted) return "💡";
    const over = r.moves - r.par;
    if (over === 0) return "🟩";
    if (over <= 2) return "🟨";
    return "🟥";
}

function buildShareText(puzzleNumber, results, url) {
    const { overPar, solvedCount, total } = summarizeResults(results);
    let header = `Momentum Maze #${puzzleNumber}`;
    if (solvedCount < total) header += ` ${solvedCount}/${total}`;
    header += ` ${formatOverPar(overPar)}`;
    const lines = [header, results.map(resultEmoji).join("")];
    if (url) lines.push(url);
    return lines.join("\n");
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        generateDailySet, generatePuzzle, exploreBoard, buildBlockedTable, slideCell,
        singleOrbDistance, mulberry32, hashString, puzzleNumberForDateKey, localDateKey,
        buildShareText, summarizeResults, DIRS, DIFFICULTY_RAMP, NUM_CELLS, COLS,
    };
}

// ---------------------------------------------------------------------------
// Game state (browser)
// ---------------------------------------------------------------------------

let CELL_SIZE;
let ORB_RADIUS;
const MAX_CANVAS_WIDTH_CONFIG = 640;

let todayKey, puzzleNumber, dailyPuzzles;
let progress; // { date, results: [{moves, par, assisted}], history: [{o, d}], assisted }
let currentPuzzleIndex = 0;

let verticalWalls, horizontalWalls;
let orbs = [];
let goal = { cellX: 0, cellY: 0, color: COLORS[0] };
let goalActive = false;

let moveHistory = []; // [{ orbIndex, dir, fromX, fromY }]
let selectedOrbIndex = -1;
let isAnyOrbMoving = false;
let solvingInProgress = false;
let assistedThisPuzzle = false;
let solutionMovesQueue = [];
let inputLocked = false;
let pendingCompletion = false;

let canvas, ctx;
let lastTouchX = 0;
let lastTouchY = 0;

let puzzleDisplayElem, moveDisplayElem;
let gameContainerElem, controlsElem, infoPanelElem;
let undoButtonElem, solveButtonElem;
let overlayElem, overlayContentElem, helpOverlayElem;
let countdownTimer = null;

if (typeof window !== "undefined") {
    window.onload = onLoad;
}

function onLoad() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;

    puzzleDisplayElem = document.getElementById("puzzleDisplay");
    moveDisplayElem = document.getElementById("moveDisplay");
    undoButtonElem = document.getElementById("undoButton");
    solveButtonElem = document.getElementById("solveButton");
    gameContainerElem = document.getElementById("gameContainer");
    controlsElem = document.querySelector(".controls");
    infoPanelElem = document.querySelector(".infoPanel");
    overlayElem = document.getElementById("overlay");
    overlayContentElem = document.getElementById("overlayContent");
    helpOverlayElem = document.getElementById("helpOverlay");

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    undoButtonElem.addEventListener("click", undoMove);
    solveButtonElem.addEventListener("click", onSolveClick);
    document.getElementById("helpButton").addEventListener("click", showHelp);
    document.getElementById("helpCloseButton").addEventListener("click", hideHelp);
    helpOverlayElem.addEventListener("click", e => { if (e.target === helpOverlayElem) hideHelp(); });
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", resizeCanvas);

    // Old "share puzzle" links carried the board in the hash; no longer used.
    if (window.location.hash && history.replaceState) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }

    todayKey = localDateKey(new Date());
    puzzleNumber = puzzleNumberForDateKey(todayKey);
    dailyPuzzles = generateDailySet(todayKey);
    progress = loadProgress(todayKey);

    resizeCanvas();
    if (progress.results.length >= dailyPuzzles.length) {
        loadPuzzle(dailyPuzzles.length - 1, []);
        goalActive = false;
        inputLocked = true;
        showResults();
    } else {
        loadPuzzle(progress.results.length, progress.history || []);
        // Using Solve sticks to the puzzle, even across a refresh.
        assistedThisPuzzle = progress.assisted;
        if (!hasSeenHelp()) showHelp();
    }
    requestAnimationFrame(gameLoop);
}

// --- Persistence ---

function loadProgress(dateKey) {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            if (saved && saved.date === dateKey && Array.isArray(saved.results)) {
                return {
                    date: dateKey,
                    results: saved.results,
                    history: Array.isArray(saved.history) ? saved.history : [],
                    assisted: saved.assisted === true,
                };
            }
        }
    } catch (e) {
        console.warn("Could not load saved progress:", e);
    }
    return { date: dateKey, results: [], history: [], assisted: false };
}

function saveProgress() {
    progress.history = moveHistory.map(m => ({ o: m.orbIndex, d: m.dir }));
    progress.assisted = assistedThisPuzzle;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.warn("Could not save progress:", e);
    }
}

// --- How-to-play screen ---

function hasSeenHelp() {
    try {
        return window.localStorage.getItem(HELP_SEEN_KEY) === "1";
    } catch (e) {
        return false;
    }
}

function showHelp() {
    clearSelection();
    helpOverlayElem.hidden = false;
    document.getElementById("helpCloseButton").focus();
}

function hideHelp() {
    helpOverlayElem.hidden = true;
    try {
        window.localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch (e) {
        console.warn("Could not save help preference:", e);
    }
}

function isHelpOpen() { return helpOverlayElem && !helpOverlayElem.hidden; }

// --- Puzzle lifecycle ---

function loadPuzzle(index, savedHistory) {
    currentPuzzleIndex = index;
    const puzzle = dailyPuzzles[index];
    verticalWalls = puzzle.walls.verticalWalls;
    horizontalWalls = puzzle.walls.horizontalWalls;
    resetOrbsToStart();
    goal = { cellX: puzzle.goal.cellX, cellY: puzzle.goal.cellY, color: COLORS[puzzle.goal.orbIndex] };
    goalActive = true;
    moveHistory = [];
    selectedOrbIndex = -1;
    solvingInProgress = false;
    solutionMovesQueue = [];
    assistedThisPuzzle = false;
    inputLocked = false;
    pendingCompletion = false;

    // Replay saved (non-undone) moves instantly so a refresh resumes where you were.
    for (const m of savedHistory) {
        const orb = orbs[m.o];
        if (!orb || !DIRS.includes(m.d)) break;
        const r = findMoveDestination(m.o, m.d);
        if (r.cellsToMove === 0) break;
        moveHistory.push({ orbIndex: m.o, dir: m.d, fromX: orb.cellX, fromY: orb.cellY });
        orb.cellX = r.endX; orb.cellY = r.endY;
    }
    updateDisplays();
    drawGame();
}

function resetOrbsToStart() {
    const puzzle = dailyPuzzles[currentPuzzleIndex];
    orbs = puzzle.orbs.map((o, i) => ({ cellX: o.cellX, cellY: o.cellY, color: COLORS[i], selected: false, anim: null }));
}

function completePuzzle() {
    goalActive = false;
    inputLocked = true;
    const puzzle = dailyPuzzles[currentPuzzleIndex];
    const result = assistedThisPuzzle
        ? { moves: puzzle.par, par: puzzle.par, assisted: true }
        : { moves: moveHistory.length, par: puzzle.par, assisted: false };
    progress.results.push(result);
    moveHistory = [];
    assistedThisPuzzle = false; // the next puzzle starts unassisted
    saveProgress();
    updateDisplays();
    showPuzzleComplete(result);
}

function advanceToNextPuzzle() {
    hideOverlay();
    if (progress.results.length >= dailyPuzzles.length) {
        showResults();
    } else {
        loadPuzzle(progress.results.length, []);
    }
}

// --- Overlay screens ---

function showOverlay(html) {
    overlayContentElem.innerHTML = html;
    overlayElem.hidden = false;
}

function hideOverlay() {
    overlayElem.hidden = true;
    overlayContentElem.innerHTML = "";
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
}

function showPuzzleComplete(result) {
    const isLast = progress.results.length >= dailyPuzzles.length;
    let detail;
    if (result.assisted) {
        detail = `<p class="overlayBig">💡</p><p>Solved with help — this puzzle won't count toward your score.</p>`;
    } else {
        const over = result.moves - result.par;
        detail = `<p class="overlayBig">${formatOverPar(over)}</p>` +
            `<p>${result.moves} move${result.moves === 1 ? "" : "s"} · par ${result.par}</p>`;
    }
    showOverlay(
        `<h2>Puzzle ${currentPuzzleIndex + 1} of ${dailyPuzzles.length}</h2>` +
        detail +
        `<button id="overlayNextButton">${isLast ? "See results" : "Next puzzle"}</button>`
    );
    document.getElementById("overlayNextButton").addEventListener("click", advanceToNextPuzzle);
}

function showResults() {
    const results = progress.results;
    const { overPar, solvedCount, total } = summarizeResults(results);
    const rows = results.map((r, i) => {
        const value = r.assisted ? "helped" : `${formatOverPar(r.moves - r.par)} <span class="muted">(${r.moves}/${r.par})</span>`;
        return `<li><span>${resultEmoji(r)} Puzzle ${i + 1}</span><span>${value}</span></li>`;
    }).join("");
    showOverlay(
        `<h2>Momentum Maze #${puzzleNumber}</h2>` +
        `<p class="overlayBig">${formatOverPar(overPar)}</p>` +
        (solvedCount < total ? `<p>${solvedCount} of ${total} solved without help</p>` : "") +
        `<ul class="resultList">${rows}</ul>` +
        `<button id="overlayShareButton">Share</button>` +
        `<p class="muted">Next puzzles in <span id="countdown"></span></p>`
    );
    document.getElementById("overlayShareButton").addEventListener("click", onShareClick);
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const el = document.getElementById("countdown");
    if (!el) return;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const remaining = midnight - now;
    if (remaining <= 0 || localDateKey(now) !== todayKey) { window.location.reload(); return; }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    el.textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function onShareClick() {
    const url = window.location.origin + window.location.pathname;
    const text = buildShareText(puzzleNumber, progress.results, url);
    const button = document.getElementById("overlayShareButton");
    const flash = (label) => {
        if (!button) return;
        button.textContent = label;
        setTimeout(() => { button.textContent = "Share"; }, 1500);
    };
    const copy = () => navigator.clipboard.writeText(text)
        .then(() => flash("Copied!"))
        .catch(() => { window.prompt("Copy your result:", text); });

    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        navigator.share({ text }).catch(err => { if (err && err.name !== "AbortError") copy(); });
    } else if (navigator.clipboard) {
        copy();
    } else {
        window.prompt("Copy your result:", text);
    }
}

// --- Layout ---

function resizeCanvas() {
    const controlsStyle = window.getComputedStyle(controlsElem);
    const infoPanelStyle = window.getComputedStyle(infoPanelElem);
    const containerStyle = window.getComputedStyle(gameContainerElem);
    const controlsHeight = controlsElem.offsetHeight + parseFloat(controlsStyle.marginTop) + parseFloat(controlsStyle.marginBottom);
    const infoPanelHeight = infoPanelElem.offsetHeight + parseFloat(infoPanelStyle.marginTop) + parseFloat(infoPanelStyle.marginBottom);
    const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);
    const availableWidth = Math.max(0, gameContainerElem.clientWidth - paddingX);
    const availableHeight = Math.max(0, gameContainerElem.clientHeight - paddingY - controlsHeight - infoPanelHeight);
    let size = Math.min(availableWidth, availableHeight, MAX_CANVAS_WIDTH_CONFIG);
    size = Math.max(100, size);
    canvas.width = size;
    canvas.height = size;
    CELL_SIZE = canvas.width / COLS;
    ORB_RADIUS = CELL_SIZE * 0.3;
    if (orbs.length > 0) drawGame();
}

function updateDisplays() {
    puzzleDisplayElem.textContent = `Puzzle ${Math.min(currentPuzzleIndex + 1, dailyPuzzles.length)} of ${dailyPuzzles.length}`;
    const par = dailyPuzzles[currentPuzzleIndex].par;
    moveDisplayElem.textContent = `Moves: ${moveHistory.length} · Par: ${par}`;
    const busy = inputLocked || solvingInProgress;
    undoButtonElem.disabled = busy || moveHistory.length === 0;
    solveButtonElem.disabled = busy;
}

// --- Main loop ---

function gameLoop(timestamp) {
    updateAnimation(timestamp);
    drawGame();
    if (solvingInProgress && !isAnyOrbMoving && !pendingCompletion) {
        if (solutionMovesQueue.length > 0) {
            const move = solutionMovesQueue.shift();
            moveOrb(move.orbIndex, move.dir);
        } else {
            solvingInProgress = false;
            updateDisplays();
        }
    }
    if (pendingCompletion && !isAnyOrbMoving) {
        pendingCompletion = false;
        solvingInProgress = false;
        solutionMovesQueue = [];
        completePuzzle();
    }
    requestAnimationFrame(gameLoop);
}

function updateAnimation(now) {
    isAnyOrbMoving = false;
    orbs.forEach(orb => {
        if (!orb.anim) return;
        const frac = (now - orb.anim.startTime) / orb.anim.duration;
        if (frac >= 1) {
            orb.cellX = orb.animEndCellX; orb.cellY = orb.animEndCellY; orb.anim = null;
            checkGoal(orb);
        } else {
            orb.animFraction = Math.max(0, frac);
            isAnyOrbMoving = true;
        }
    });
}

function checkGoal(orb) {
    if (goalActive && orb.cellX === goal.cellX && orb.cellY === goal.cellY && orb.color === goal.color) {
        pendingCompletion = true;
    }
}

// --- Drawing ---

function drawGame() {
    if (!ctx || !verticalWalls) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridLines();
    drawWalls();
    if (goalActive) drawGoal();
    drawOrbs();
}

function drawGridLines() {
    ctx.save(); ctx.strokeStyle = "#e0e0e0"; ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL_SIZE); ctx.lineTo(COLS * CELL_SIZE, r * CELL_SIZE); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL_SIZE, 0); ctx.lineTo(c * CELL_SIZE, ROWS * CELL_SIZE); ctx.stroke(); }
    ctx.restore();
}

function drawWalls() {
    ctx.save(); ctx.strokeStyle = "#333"; ctx.lineWidth = Math.max(2, CELL_SIZE * 0.075); ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let x = 0; x < COLS + 1; x++) for (let y = 0; y < ROWS; y++) if (verticalWalls[x][y]) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, y * CELL_SIZE); ctx.lineTo(x * CELL_SIZE, (y + 1) * CELL_SIZE); ctx.stroke(); }
    for (let y = 0; y < ROWS + 1; y++) for (let x = 0; x < COLS; x++) if (horizontalWalls[y][x]) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, y * CELL_SIZE); ctx.lineTo((x + 1) * CELL_SIZE, y * CELL_SIZE); ctx.stroke(); }
    ctx.restore();
}

function drawGoal() {
    const m = CELL_SIZE * 0.2, x1 = goal.cellX * CELL_SIZE, y1 = goal.cellY * CELL_SIZE, x2 = x1 + CELL_SIZE, y2 = y1 + CELL_SIZE;
    ctx.save(); ctx.strokeStyle = goal.color; ctx.lineWidth = Math.max(2, CELL_SIZE * 0.075); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1 + m, y1 + m); ctx.lineTo(x2 - m, y2 - m); ctx.moveTo(x2 - m, y1 + m); ctx.lineTo(x1 + m, y2 - m); ctx.stroke();
    ctx.restore();
}

function drawOrbs() { orbs.forEach(drawOrb); }
function drawOrb(orb) {
    let cx, cy;
    if (orb.anim) {
        const f = orb.animFraction, sx = orb.animStartCellX, sy = orb.animStartCellY, ex = orb.animEndCellX, ey = orb.animEndCellY;
        cx = (sx + (ex - sx) * f + 0.5) * CELL_SIZE; cy = (sy + (ey - sy) * f + 0.5) * CELL_SIZE;
    } else { cx = (orb.cellX + 0.5) * CELL_SIZE; cy = (orb.cellY + 0.5) * CELL_SIZE; }
    ctx.save();
    ctx.lineWidth = orb.selected ? Math.max(3, ORB_RADIUS * 0.2) : Math.max(2, ORB_RADIUS * 0.1);
    ctx.strokeStyle = "#000"; ctx.fillStyle = orb.color;
    ctx.beginPath(); ctx.arc(cx, cy, ORB_RADIUS, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.restore();
}

// --- Input ---

function canInteract() { return !isAnyOrbMoving && !solvingInProgress && !inputLocked && !pendingCompletion && !isHelpOpen(); }

function getCanvasCoordinates(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { mx: (clientX - rect.left) * (canvas.width / rect.width), my: (clientY - rect.top) * (canvas.height / rect.height) };
}

function onMouseMove(e) {
    if (!canInteract()) return;
    const { mx, my } = getCanvasCoordinates(e.clientX, e.clientY);
    handleSelection(mx, my);
}
function onClick(e) {
    if (!canInteract() || selectedOrbIndex < 0) return;
    const { mx, my } = getCanvasCoordinates(e.clientX, e.clientY);
    handleClick(mx, my);
}
function onMouseLeave() { clearSelection(); }
function onTouchStart(e) {
    e.preventDefault();
    if (!canInteract() || e.touches.length === 0) return;
    const { mx, my } = getCanvasCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    lastTouchX = mx; lastTouchY = my;
    handleSelection(mx, my);
}
function onTouchMove(e) {
    e.preventDefault();
    if (!canInteract() || e.touches.length === 0) return;
    const { mx, my } = getCanvasCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    lastTouchX = mx; lastTouchY = my;
}
function onTouchEnd(e) {
    e.preventDefault();
    if (!canInteract() || selectedOrbIndex < 0) return;
    handleClick(lastTouchX, lastTouchY);
}
function onKeyDown(e) {
    if (isHelpOpen()) {
        if (e.key === "Escape") hideHelp();
        return;
    }
    const isUndoKey = e.key === "Backspace" || e.key === "z" || e.key === "Z";
    if (isUndoKey && !e.altKey) {
        e.preventDefault();
        undoMove();
    }
}

function clearSelection() {
    if (selectedOrbIndex >= 0 && orbs[selectedOrbIndex]) orbs[selectedOrbIndex].selected = false;
    selectedOrbIndex = -1;
}

function handleSelection(mx, my) {
    for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        if (o.anim) continue;
        const dx = mx - (o.cellX + 0.5) * CELL_SIZE, dy = my - (o.cellY + 0.5) * CELL_SIZE;
        if (dx * dx + dy * dy <= ORB_RADIUS * ORB_RADIUS) {
            if (selectedOrbIndex !== i) {
                clearSelection();
                selectedOrbIndex = i;
                o.selected = true;
            }
            return;
        }
    }
}

function handleClick(mx, my) {
    const orb = orbs[selectedOrbIndex];
    const dx = mx - (orb.cellX + 0.5) * CELL_SIZE, dy = my - (orb.cellY + 0.5) * CELL_SIZE;
    if (dx * dx + dy * dy <= ORB_RADIUS * ORB_RADIUS) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    moveOrb(selectedOrbIndex, dir);
}

// --- Moves ---

function moveOrb(idx, dir) {
    if (idx < 0 || idx >= orbs.length || isAnyOrbMoving) return;
    const orb = orbs[idx];
    const result = findMoveDestination(idx, dir);
    if (result.cellsToMove === 0) return;
    moveHistory.push({ orbIndex: idx, dir, fromX: orb.cellX, fromY: orb.cellY });
    startOrbAnimation(orb, result.endX, result.endY, result.cellsToMove);
    clearSelection();
    if (!solvingInProgress) saveProgress();
    updateDisplays();
}

function undoMove() {
    if (!canInteract() || moveHistory.length === 0) return;
    const last = moveHistory.pop();
    const orb = orbs[last.orbIndex];
    const steps = Math.abs(orb.cellX - last.fromX) + Math.abs(orb.cellY - last.fromY);
    startOrbAnimation(orb, last.fromX, last.fromY, steps);
    clearSelection();
    saveProgress();
    updateDisplays();
}

function findMoveDestination(orbIndex, dir) {
    const dirIndex = DIRS.indexOf(dir);
    const orb = orbs[orbIndex];
    let cx = orb.cellX, cy = orb.cellY, steps = 0;
    while (true) {
        if ((dirIndex === 1 && verticalWalls[cx + 1][cy]) || (dirIndex === 0 && verticalWalls[cx][cy]) ||
            (dirIndex === 3 && horizontalWalls[cy + 1][cx]) || (dirIndex === 2 && horizontalWalls[cy][cx])) break;
        const nx = cx + DIR_DX[dirIndex], ny = cy + DIR_DY[dirIndex];
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
        if (isCellOccupied(nx, ny, orbIndex)) break;
        cx = nx; cy = ny; steps++;
    }
    return { endX: cx, endY: cy, cellsToMove: steps };
}

function isCellOccupied(x, y, excludeIndex) {
    for (let i = 0; i < orbs.length; i++) {
        if (i === excludeIndex) continue;
        const o = orbs[i];
        if (o.anim ? (o.animEndCellX === x && o.animEndCellY === y) : (o.cellX === x && o.cellY === y)) return true;
    }
    return false;
}

function startOrbAnimation(orb, ex, ey, steps) {
    if (steps === 0) return;
    orb.anim = { startTime: performance.now(), duration: steps * 60 };
    orb.animStartCellX = orb.cellX; orb.animStartCellY = orb.cellY;
    orb.animEndCellX = ex; orb.animEndCellY = ey; orb.animFraction = 0;
    isAnyOrbMoving = true;
}

// --- Solve ---

function onSolveClick() {
    if (!canInteract() || !goalActive) return;
    if (!window.confirm("Show the solution? This puzzle will be marked as solved with help and won't count toward your score.")) return;
    assistedThisPuzzle = true;
    // Undo all of the player's moves, then play the optimal solution.
    moveHistory = [];
    resetOrbsToStart();
    clearSelection();
    solutionMovesQueue = dailyPuzzles[currentPuzzleIndex].solution.slice();
    solvingInProgress = true;
    saveProgress();
    updateDisplays();
}
