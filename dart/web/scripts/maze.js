// Grid constants
const ROWS = 8;
const COLS = 8;
let CELL_SIZE; 
let ORB_RADIUS; // Renamed from PUCK_RADIUS

const WALL_PROBABILITY = 0.15; // Used for random wall generation

// Orb colors (Renamed from PUCK_COLORS)
const COLORS = [
    "#D32F2F", // red
    "#1976D2", // blue
    "#FBC02D", // yellow
    "#388E3C", // green
];

// Walls data - these will be populated by createWalls or deserializeGameState
let verticalWalls = Array(COLS + 1).fill(null).map(() => Array(ROWS).fill(false));
let horizontalWalls = Array(ROWS + 1).fill(null).map(() => Array(COLS).fill(false));
const TOTAL_VERTICAL_WALL_BITS = (COLS + 1) * ROWS;
const TOTAL_HORIZONTAL_WALL_BITS = (ROWS + 1) * COLS;
const TOTAL_WALL_BITS = TOTAL_VERTICAL_WALL_BITS + TOTAL_HORIZONTAL_WALL_BITS;


// Orbs - populated by initGame or deserializeGameState (Renamed from pucks)
let orbs = [];

// Goal - populated by placeNewGoal or deserializeGameState
let goal = { cellX: 0, cellY: 0, color: COLORS[0] };
let goalActive = true;
let goalReached = false;

// Animation & Interaction states
let selectedOrbIndex = -1; // Renamed from selectedPuckIndex
let isAnyOrbMoving = false; // Renamed from isAnyPuckMoving
let solvingInProgress = false;
let solutionMovesQueue = [];

// Scoring & game logic
let goalsCompleted = 0; 

// Move counters
let userMoves = 0; // Moves for the current goal
let optimalMovesForCurrentGoal = 0;

// Canvas & context
let canvas, ctx;
const MAX_CANVAS_WIDTH_CONFIG = 640; 

// Touch tracking
let lastTouchX = 0;
let lastTouchY = 0;

// UI Elements
let scoreDisplayElem, moveDisplayElem; 
let gameContainerElem, controlsElem, infoPanelElem;
let shareButtonElem, resetButtonElem; 

// Base64 characters for custom encoding/decoding
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";


window.onload = () => {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;

    scoreDisplayElem = document.getElementById("scoreDisplay");
    moveDisplayElem = document.getElementById("moveDisplay");
    shareButtonElem = document.getElementById("shareButton"); 
    resetButtonElem = document.getElementById("resetButton");

    gameContainerElem = document.getElementById('gameContainer');
    controlsElem = document.querySelector('.controls');
    infoPanelElem = document.querySelector('.infoPanel');

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    document.getElementById("cheatButton").addEventListener("click", onCheatClick);
    document.getElementById("newGameButton").addEventListener("click", onNewGameClick);
    resetButtonElem.addEventListener("click", onResetClick);
    shareButtonElem.addEventListener("click", onShareClick); 
    window.addEventListener('resize', resizeCanvas);

    resizeCanvas(); 
    initGame(); 
    requestAnimationFrame(gameLoop);
};

function resizeCanvas() {
    const controlsStyle = window.getComputedStyle(controlsElem);
    const infoPanelStyle = window.getComputedStyle(infoPanelElem);
    const containerStyle = window.getComputedStyle(gameContainerElem);
    const controlsHeight = controlsElem.offsetHeight + parseFloat(controlsStyle.marginTop) + parseFloat(controlsStyle.marginBottom);
    const infoPanelHeight = infoPanelElem.offsetHeight + parseFloat(infoPanelStyle.marginTop) + parseFloat(infoPanelStyle.marginBottom);
    const containerPaddingTop = parseFloat(containerStyle.paddingTop);
    const containerPaddingBottom = parseFloat(containerStyle.paddingBottom);
    const containerPaddingLeft = parseFloat(containerStyle.paddingLeft);
    const containerPaddingRight = parseFloat(containerStyle.paddingRight);
    let availableWidthForCanvas = gameContainerElem.clientWidth - containerPaddingLeft - containerPaddingRight;
    let availableHeightForCanvas = gameContainerElem.clientHeight - containerPaddingTop - containerPaddingBottom - controlsHeight - infoPanelHeight;
    availableWidthForCanvas = Math.max(0, availableWidthForCanvas);
    availableHeightForCanvas = Math.max(0, availableHeightForCanvas);
    let newCanvasSize = Math.min(availableWidthForCanvas, availableHeightForCanvas);
    newCanvasSize = Math.min(newCanvasSize, MAX_CANVAS_WIDTH_CONFIG); 
    newCanvasSize = Math.max(100, newCanvasSize); 
    canvas.width = newCanvasSize;
    canvas.height = newCanvasSize;
    CELL_SIZE = canvas.width / COLS;
    ORB_RADIUS = CELL_SIZE * 0.3; // Renamed
    if (ctx && typeof drawGame === 'function' && orbs && orbs.length > 0) { // Changed pucks to orbs
        drawGame();
    }
}

function getCanvasCoordinatesFromMouseEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { mx: (e.clientX - rect.left) * scaleX, my: (e.clientY - rect.top) * scaleY };
}

function getCanvasCoordinatesFromTouch(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { mx: (touch.clientX - rect.left) * scaleX, my: (touch.clientY - rect.top) * scaleY };
}

// --- Serialization / Deserialization ---
// Strategy:
// The game state for a specific puzzle is serialized into a URL fragment (hash).
// This allows sharing a link to a specific puzzle configuration.
// The format is: [Base64WallString]_[GoalX]_[GoalY]_[GoalColorIndex]_[Orb0Coords][Orb1Coords][Orb2Coords][Orb3Coords]
// Example:  `AbCdEfGhIjKlMnOpQrStUvWx_3_4_1_01234567`
//
// [Base64WallString]:
//   - Vertical walls and horizontal walls are first converted into a single long binary string (0s and 1s).
//   - This binary string represents TOTAL_WALL_BITS (currently (9*8) + (9*8) = 72 + 72 = 144 bits).
//   - This long binary string is then encoded into Base64.
//   - Each Base64 character represents 6 bits. So, 144 bits / 6 bits/char = 24 Base64 characters.
//   - This is a significant reduction from 144 '0'/'1' characters.
//
// [GoalX]_[GoalY]_[GoalColorIndex]: Single digits representing goal's X, Y, and color index in COLORS array.
//
// [OrbCoords]: A sequence of 8 digits: O0X, O0Y, O1X, O1Y, O2X, O2Y, O3X, O3Y.
//   - Orb colors are implicit by their order (Orb0 is COLORS[0], Orb1 is COLORS[1], etc.).
//   - Each coordinate is a single digit.

function wallsToBinaryString() {
    let binaryString = "";
    for (let x = 0; x <= COLS; x++) { // Vertical walls
        for (let y = 0; y < ROWS; y++) {
            binaryString += verticalWalls[x][y] ? "1" : "0";
        }
    }
    for (let y = 0; y <= ROWS; y++) { // Horizontal walls
        for (let x = 0; x < COLS; x++) {
            binaryString += horizontalWalls[y][x] ? "1" : "0";
        }
    }
    return binaryString;
}

function binaryStringToBase64(binaryStr) {
    let base64 = "";
    let paddedBinaryStr = binaryStr;
    while (paddedBinaryStr.length % 6 !== 0) {
        paddedBinaryStr += "0";
    }
    for (let i = 0; i < paddedBinaryStr.length; i += 6) {
        const chunk = paddedBinaryStr.substring(i, i + 6);
        const decimalValue = parseInt(chunk, 2);
        base64 += BASE64_CHARS[decimalValue];
    }
    return base64;
}

function base64ToBinaryString(base64Str, expectedOriginalLength) {
    let binaryString = "";
    for (let i = 0; i < base64Str.length; i++) {
        const char = base64Str[i];
        const decimalValue = BASE64_CHARS.indexOf(char);
        if (decimalValue === -1) {
            console.error("Deserialize ERROR: Invalid Base64 character encountered:", char);
            return null; 
        }
        binaryString += decimalValue.toString(2).padStart(6, '0');
    }
    const result = binaryString.substring(0, expectedOriginalLength);
    return result;
}

function binaryStringToWalls(fullBinaryWallStr) {
    if (!fullBinaryWallStr || fullBinaryWallStr.length !== TOTAL_WALL_BITS) {
        return false;
    }
    let currentBit = 0;
    for (let x = 0; x <= COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            verticalWalls[x][y] = fullBinaryWallStr[currentBit++] === "1";
        }
    }
    for (let y = 0; y <= ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            horizontalWalls[y][x] = fullBinaryWallStr[currentBit++] === "1";
        }
    }
    return true;
}


function serializeGameState() {
    const wallBinaryString = wallsToBinaryString();
    const base64WallString = binaryStringToBase64(wallBinaryString);

    const goalColorIndex = COLORS.indexOf(goal.color);
    if (goalColorIndex === -1) { 
        console.error("Serialize ERROR: Goal color not found in COLORS array."); return ""; 
    }
    
    let orbsDataString = ""; // Renamed from pucksDataString
    for (let i = 0; i < COLORS.length; i++) {
        const orb = orbs.find(o => o.color === COLORS[i]); // Changed p to o for orb
        if (orb) {
            orbsDataString += `${orb.cellX}${orb.cellY}`;
        } else {
            console.error(`Serialize ERROR: Orb for color ${COLORS[i]} not found. Using 00.`);
            orbsDataString += "00"; 
        }
    }
    const finalString = `${base64WallString}_${goal.cellX}_${goal.cellY}_${goalColorIndex}_${orbsDataString}`;
    return finalString;
}

function deserializeGameState(stateString) {
    try {
        const parts = stateString.split('_');
        if (parts.length !== 5) { 
            console.error("Deserialize ERROR: Invalid parts count. Expected 5, got " + parts.length); 
            return false; 
        }

        const base64WallString = parts[0];
        const goalX = parseInt(parts[1]);
        const goalY = parseInt(parts[2]);
        const goalColorIndex = parseInt(parts[3]);
        const orbsStr = parts[4]; // Renamed from pucksStr

        if (base64WallString.length !== TOTAL_WALL_BITS / 6) {
            console.error("Deserialize ERROR: Base64 wall string has incorrect length. Expected:", TOTAL_WALL_BITS / 6, "Got:", base64WallString.length);
            return false;
        }

        const fullBinaryWallStr = base64ToBinaryString(base64WallString, TOTAL_WALL_BITS);
        if (!fullBinaryWallStr) { 
             console.error("Deserialize ERROR: base64ToBinaryString failed."); return false;
        }
        if (!binaryStringToWalls(fullBinaryWallStr)) {
            console.error("Deserialize ERROR: binaryStringToWalls failed."); return false;
        }
        
        if (orbsStr.length !== 4 * 2) { // Check length for orbs
            console.error("Deserialize ERROR: Invalid orbs string length. Expected 8, Got:", orbsStr.length); return false;
        }
        if (isNaN(goalX) || isNaN(goalY) || isNaN(goalColorIndex) ||
            goalX < 0 || goalX >= COLS || goalY < 0 || goalY >= ROWS ||
            goalColorIndex < 0 || goalColorIndex >= COLORS.length) {
            console.error("Deserialize ERROR: Invalid goal parameters after parsing."); return false;
        }

        goal.cellX = goalX;
        goal.cellY = goalY;
        goal.color = COLORS[goalColorIndex];
        goalActive = true;
        goalReached = false;

        orbs = []; // Clear existing orbs
        let currentOrbStrIndex = 0; // Renamed
        for (let i = 0; i < 4; i++) { 
            if (currentOrbStrIndex + 1 >= orbsStr.length) { 
                console.error("Deserialize ERROR: Orbs string too short while parsing orb", i); return false; 
            }
            const oX = parseInt(orbsStr[currentOrbStrIndex++]); // Renamed pX to oX
            const oY = parseInt(orbsStr[currentOrbStrIndex++]); // Renamed pY to oY
            if (isNaN(oX) || isNaN(oY) || oX < 0 || oX >= COLS || oY < 0 || oY >= ROWS) {
                console.error(`Deserialize ERROR: Invalid position for orb ${i} (X=${oX}, Y=${oY}).`); return false;
            }
            orbs.push({ // Changed pucks.push to orbs.push
                cellX: oX, cellY: oY, color: COLORS[i], 
                selected: false, anim: null
            });
        }
        return true;
    } catch (e) {
        console.error("Deserialize CATCH ERROR:", e);
        return false;
    }
}

function updateURLFragmentWithCurrentState() {
    const stateString = serializeGameState();
    if (stateString) { 
        if (history.replaceState) {
            history.replaceState(null, null, '#' + stateString);
        } else {
            window.location.hash = stateString; 
        }
    } else {
        console.warn("Failed to serialize game state, URL fragment not updated.");
    }
}


function initGame() {
    let loadedFromHash = false;
    if (window.location.hash && window.location.hash.length > 1) {
        if (deserializeGameState(window.location.hash.substring(1))) {
            loadedFromHash = true;
            goalsCompleted = 0; 
            userMoves = 0;      
            let goalOrbIndex = orbs.findIndex(o => o.color === goal.color); // Renamed
            if (goalOrbIndex !== -1) {
                optimalMovesForCurrentGoal = computeMinimalMovesForStateGoal(getCurrentState(), goalOrbIndex, goal.cellX, goal.cellY);
            } else {
                optimalMovesForCurrentGoal = Math.max(ROWS, COLS); 
                console.error("Could not find goal orb in loaded state to calculate optimal moves.");
            }
        } else {
            console.warn("Invalid URL hash, could not deserialize. Generating random puzzle.");
            if (history.replaceState) history.replaceState(null, null, window.location.pathname + window.location.search);
            else window.location.hash = ""; 
        }
    }

    if (!loadedFromHash) {
        createWalls(); 
        orbs = []; // Renamed
        let usedCells = new Set();
        for (let i = 0; i < 4; i++) {
            let { x, y } = getRandomEmptyCell(usedCells);
            orbs.push({ cellX: x, cellY: y, color: COLORS[i], selected: false, anim: null }); // Renamed
            usedCells.add(x + "," + y);
        }
        goalsCompleted = 0; 
        placeNewGoal(); 
    }
    
    selectedOrbIndex = -1; // Renamed
    solvingInProgress = false; 
    solutionMovesQueue = [];
    
    updateScoreDisplay();
    updateMoveDisplay(); 
    
    resizeCanvas(); 
    drawGame(); 
}

function createWalls() {
    verticalWalls = Array(COLS + 1).fill(null).map(() => Array(ROWS).fill(false));
    horizontalWalls = Array(ROWS + 1).fill(null).map(() => Array(COLS).fill(false));
    for (let y = 0; y < ROWS; y++) { verticalWalls[0][y] = true; verticalWalls[COLS][y] = true; }
    for (let x = 0; x < COLS; x++) { horizontalWalls[0][x] = true; horizontalWalls[ROWS][x] = true; }
    for (let x = 1; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (Math.random() < WALL_PROBABILITY) verticalWalls[x][y] = true;
    for (let y = 1; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (Math.random() < WALL_PROBABILITY) horizontalWalls[y][x] = true;
}

function getRandomEmptyCell(usedCells) {
    let x, y;
    do {
        x = Math.floor(Math.random() * COLS);
        y = Math.floor(Math.random() * ROWS);
    } while (usedCells.has(x + "," + y));
    return { x, y };
}

function placeNewGoal() {
    goalActive = true; goalReached = false;
    userMoves = 0; 

    let candidates = [];
    for (let c of COLORS) {
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (!orbs.some(o => o.cellX === x && o.cellY === y)) { // Renamed
                    candidates.push({ color: c, x, y });
                }
            }
        }
    }
    shuffleArray(candidates);
    let startState = getCurrentState(); 
    let foundSuitableGoal = false;

    for (let cand of candidates) {
        let orbIndex = orbs.findIndex(o => o.color === cand.color); // Renamed
        if (orbIndex < 0) continue; 
        let path = boundedIdaStar(startState, orbIndex, cand.x, cand.y, 6);
        if (path && (path.length === 5 || path.length === 6) && !hasTripleConsecutiveSameOrb(path)) { // Renamed
            goal.cellX = cand.x; goal.cellY = cand.y; goal.color = cand.color;
            optimalMovesForCurrentGoal = computeMinimalMovesForStateGoal(startState, orbIndex, cand.x, cand.y);
            foundSuitableGoal = true; break;
        }
    }

    if (!foundSuitableGoal) { 
        if (candidates.length > 0) {
            let cand = candidates[0]; 
            goal.cellX = cand.x; goal.cellY = cand.y; goal.color = cand.color;
            let gIdx = orbs.findIndex(o => o.color === goal.color); // Renamed
            optimalMovesForCurrentGoal = (gIdx !== -1) ? computeMinimalMovesForStateGoal(startState, gIdx, goal.cellX, goal.cellY) : Math.max(ROWS,COLS);
        } else { 
            let { x, y } = getRandomEmptyCell(new Set(orbs.map(o => `${o.cellX},${o.cellY}`))); // Renamed
            goal.cellX = x; goal.cellY = y; goal.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            let gIdx = orbs.findIndex(o => o.color === goal.color); // Renamed
            optimalMovesForCurrentGoal = (gIdx !== -1) ? computeMinimalMovesForStateGoal(startState, gIdx, goal.cellX, goal.cellY) : Math.max(ROWS,COLS);
        }
    }
    updateMoveDisplay(); 
    updateURLFragmentWithCurrentState(); 
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function hasTripleConsecutiveSameOrb(path) { // Renamed
    if (!path || path.length < 3) return false;
    for (let i = 0; i < path.length - 2; i++) {
        if (path[i].orbIndex === path[i+1].orbIndex && path[i].orbIndex === path[i+2].orbIndex) return true; // Renamed
    }
    return false;
}

function gameLoop(timestamp) {
    updateAnimation(timestamp);
    drawGame();
    if (solvingInProgress && !isAnyOrbMoving) { // Renamed
        if (solutionMovesQueue.length > 0) {
            let move = solutionMovesQueue.shift();
            moveOrb(move.orbIndex, move.dir, true); // Renamed
        } else { solvingInProgress = false; }
    }
    if (goalReached) {
        goalReached = false; 
        goalsCompleted++; 
        updateScoreDisplay();
        goalActive = false;
        requestAnimationFrame(() => { placeNewGoal(); }); 
    }
    requestAnimationFrame(gameLoop); 
}


function updateAnimation(now) {
    isAnyOrbMoving = false; // Renamed
    orbs.forEach(orb => { // Renamed
        if (orb.anim) {
            let frac = (now - orb.anim.startTime) / orb.anim.duration;
            if (frac >= 1) {
                orb.cellX = orb.animEndCellX; orb.cellY = orb.animEndCellY; orb.anim = null;
                checkGoal(orb); // Renamed
            } else {
                orb.animFraction = Math.max(0, frac); isAnyOrbMoving = true; // Renamed
            }
        }
    });
}

function checkGoal(orb) { // Renamed
    if (goalActive && orb.cellX === goal.cellX && orb.cellY === goal.cellY && orb.color === goal.color) { // Renamed
        goalReached = true;
    }
}

function drawGame() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridLines();
    drawWalls();
    if (goalActive) drawGoal(); 
    drawOrbs(); // Renamed
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
    let m = CELL_SIZE * 0.2, x1 = goal.cellX*CELL_SIZE, y1 = goal.cellY*CELL_SIZE, x2 = x1+CELL_SIZE, y2 = y1+CELL_SIZE;
    ctx.save(); ctx.strokeStyle = goal.color; ctx.lineWidth = Math.max(2, CELL_SIZE * 0.075); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1+m, y1+m); ctx.lineTo(x2-m, y2-m); ctx.moveTo(x2-m, y1+m); ctx.lineTo(x1+m, y2-m); ctx.stroke();
    ctx.restore();
}

function drawOrbs() { orbs.forEach(drawOrb); } // Renamed
function drawOrb(orb) { // Renamed
    let cx, cy;
    if (orb.anim) { // Renamed
        let f = orb.animFraction, sx=orb.animStartCellX, sy=orb.animStartCellY, ex=orb.animEndCellX, ey=orb.animEndCellY; // Renamed
        cx = (sx + (ex - sx) * f + 0.5) * CELL_SIZE; cy = (sy + (ey - sy) * f + 0.5) * CELL_SIZE;
    } else { cx = (orb.cellX + 0.5) * CELL_SIZE; cy = (orb.cellY + 0.5) * CELL_SIZE; } // Renamed
    ctx.save();
    ctx.lineWidth = orb.selected ? Math.max(3, ORB_RADIUS * 0.2) : Math.max(2, ORB_RADIUS * 0.1); // Renamed
    ctx.strokeStyle = "#000"; ctx.fillStyle = orb.color; // Renamed
    ctx.beginPath(); ctx.arc(cx, cy, ORB_RADIUS, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); // Renamed
    ctx.restore();
}

function onMouseMove(e) {
    if (isAnyOrbMoving || solvingInProgress) return; // Renamed
    const { mx, my } = getCanvasCoordinatesFromMouseEvent(e); 
    handleSelection(mx, my);
}
function onClick(e) {
    if (isAnyOrbMoving || solvingInProgress || selectedOrbIndex < 0) return; // Renamed
    const { mx, my } = getCanvasCoordinatesFromMouseEvent(e); 
    handleClick(mx, my);
}
function onMouseLeave(e) {
    if (selectedOrbIndex >= 0 && orbs[selectedOrbIndex]) { // Renamed
        orbs[selectedOrbIndex].selected = false; // Renamed
        selectedOrbIndex = -1; // Renamed
        drawGame(); 
    }
}
function onTouchStart(e) {
    e.preventDefault(); 
    if (isAnyOrbMoving || solvingInProgress) return; // Renamed
    if (e.touches.length > 0) {
        const { mx, my } = getCanvasCoordinatesFromTouch(e.touches[0]);
        lastTouchX = mx; lastTouchY = my; 
        handleSelection(mx, my); 
    }
}
function onTouchMove(e) {
    e.preventDefault(); 
    if (isAnyOrbMoving || solvingInProgress) return; // Renamed
    if (e.touches.length > 0) {
        const { mx, my } = getCanvasCoordinatesFromTouch(e.touches[0]);
        lastTouchX = mx; lastTouchY = my; 
    }
}
function onTouchEnd(e) {
    e.preventDefault(); 
    if (isAnyOrbMoving || solvingInProgress || selectedOrbIndex < 0) return; // Renamed
    handleClick(lastTouchX, lastTouchY); 
}

function handleSelection(mx, my) {
    if (isAnyOrbMoving || solvingInProgress) return; // Renamed
    let orbUnderMouseIndex = -1; // Renamed
    for (let i = 0; i < orbs.length; i++) { // Renamed
        let o = orbs[i]; if (o.anim) continue;  // Renamed
        let orbCenterX = (o.cellX + 0.5) * CELL_SIZE; // Renamed
        let orbCenterY = (o.cellY + 0.5) * CELL_SIZE; // Renamed
        let distanceSquared = (mx - orbCenterX) * (mx - orbCenterX) + (my - orbCenterY) * (my - orbCenterY); // Renamed
        if (distanceSquared <= ORB_RADIUS * ORB_RADIUS) { orbUnderMouseIndex = i; break; } // Renamed
    }
    if (orbUnderMouseIndex !== -1) { // Renamed
        if (selectedOrbIndex !== orbUnderMouseIndex) { // Renamed
            if (selectedOrbIndex >= 0 && orbs[selectedOrbIndex]) { // Renamed
                orbs[selectedOrbIndex].selected = false;  // Renamed
            }
            selectedOrbIndex = orbUnderMouseIndex; // Renamed
            orbs[selectedOrbIndex].selected = true;     // Renamed
            drawGame(); 
        }
    } 
}

function handleClick(mx, my) {
    if (selectedOrbIndex < 0 || isAnyOrbMoving || solvingInProgress) return; // Renamed
    const orb = orbs[selectedOrbIndex]; // Renamed
    const ocx = (orb.cellX + 0.5)*CELL_SIZE, ocy = (orb.cellY + 0.5)*CELL_SIZE; // Renamed
    const dx = mx - ocx, dy = my - ocy; // Renamed
    if (dx*dx + dy*dy <= ORB_RADIUS*ORB_RADIUS) return;  // Renamed
    let dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    moveOrb(selectedOrbIndex, dir, false); // Renamed
}

function moveOrb(idx, dir, isCheatMove) { // Renamed
    if (idx < 0 || idx >= orbs.length || isAnyOrbMoving) return; // Renamed
    if (!isCheatMove && solvingInProgress) return; 
    let orb = orbs[idx]; // Renamed
    let result = findMoveDestination(orb.cellX, orb.cellY, dir); // Renamed
    if (result.cellsToMove > 0) {
        startOrbAnimation(orb, result.endX, result.endY, result.cellsToMove); // Renamed
        if (!isCheatMove) { userMoves++; updateMoveDisplay(); }
        if (orbs[idx].selected) { orbs[idx].selected = false; } // Renamed
        if (selectedOrbIndex === idx) { selectedOrbIndex = -1; } // Renamed
    }
}

function findMoveDestination(x, y, dir) {
    let dx = 0, dy = 0;
    if (dir === "left") dx = -1; else if (dir === "right") dx = 1;
    else if (dir === "up") dy = -1; else if (dir === "down") dy = 1;
    let cx = x, cy = y, steps = 0;
    const movingOrbOriginalIndex = orbs.findIndex(o => o.cellX === x && o.cellY === y && !o.anim);  // Renamed
    while (true) {
        if ((dx > 0 && verticalWalls[cx+1][cy]) || (dx < 0 && verticalWalls[cx][cy]) ||
            (dy > 0 && horizontalWalls[cy+1][cx]) || (dy < 0 && horizontalWalls[cy][cx])) break;
        let nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
        if (isCellOccupied(nx, ny, movingOrbOriginalIndex)) break;  // Renamed
        cx = nx; cy = ny; steps++;
        if (steps > Math.max(ROWS,COLS)) break; 
    }
    return { endX: cx, endY: cy, cellsToMove: steps };
}

function isCellOccupied(x, y, movingOrbIndex = -1) {  // Renamed
    for (let i = 0; i < orbs.length; i++) { // Renamed
        if (i === movingOrbIndex) continue;  // Renamed
        let o = orbs[i]; // Renamed
        if (o.anim ? (o.animEndCellX === x && o.animEndCellY === y) : (o.cellX === x && o.cellY === y)) return true; // Renamed
    }
    return false;
}

function startOrbAnimation(orb, ex, ey, steps) { // Renamed
    if (steps === 0) return;
    orb.anim = { startTime: performance.now(), duration: steps * 60 };  // Renamed
    orb.animStartCellX = orb.cellX; orb.animStartCellY = orb.cellY; // Renamed
    orb.animEndCellX = ex; orb.animEndCellY = ey; orb.animFraction = 0; // Renamed
    isAnyOrbMoving = true; // Renamed
}

function onCheatClick() {
    if (isAnyOrbMoving || solvingInProgress || !goalActive) { // Renamed
        if (!goalActive) alert("No active goal to solve!"); return;
    }
    let goalOrbIndex = orbs.findIndex(o => o.color === goal.color); // Renamed
    if (goalOrbIndex < 0) { alert("Error: No orb of the goal color found!"); return; } // Renamed
    let solutionPath = idaStar(getCurrentState(), goalOrbIndex, goal.cellX, goal.cellY); // Renamed
    if (!solutionPath || solutionPath.length === 0) {
        alert("No solution found by Cheat function."); return;
    }
    // In solutionPath, puckIndex should now be orbIndex
    solutionPath.forEach(move => { if(move.puckIndex !== undefined) { move.orbIndex = move.puckIndex; delete move.puckIndex; }});
    solutionMovesQueue = solutionPath.slice(); solvingInProgress = true;
}

function onShareClick() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        const originalText = shareButtonElem.textContent;
        shareButtonElem.textContent = "Copied!";
        setTimeout(() => {
            shareButtonElem.textContent = originalText;
        }, 1500); 
    }).catch(err => {
        console.error('Failed to copy URL: ', err);
        alert("Failed to copy link. Please copy it manually from the address bar.");
    });
}

function onResetClick() {
    if (isAnyOrbMoving || solvingInProgress) { // Renamed
        console.log("Reset prevented: Animation or solving in progress.");
        return;
    }
    const currentHash = window.location.hash.substring(1);
    if (!currentHash) {
        console.log("Reset: No current puzzle state in URL to reset to.");
        return;
    }

    console.log("Reset: Attempting to reset to state from hash:", currentHash);
    if (deserializeGameState(currentHash)) {
        userMoves = 0;
        let goalOrbIndex = orbs.findIndex(o => o.color === goal.color); // Renamed
        if (goalOrbIndex !== -1) { // Renamed
            optimalMovesForCurrentGoal = computeMinimalMovesForStateGoal(getCurrentState(), goalOrbIndex, goal.cellX, goal.cellY); // Renamed
        } else {
            optimalMovesForCurrentGoal = Math.max(ROWS, COLS); 
        }
        
        selectedOrbIndex = -1; // Renamed
        solvingInProgress = false;
        solutionMovesQueue = [];
        isAnyOrbMoving = false; // Renamed
        orbs.forEach(o => o.anim = null); // Renamed

        goalActive = true; 
        goalReached = false;

        updateMoveDisplay();
        drawGame();
        console.log("Reset: Puzzle reset successfully.");
    } else {
        console.error("Reset: Failed to deserialize state from hash. Puzzle not reset.");
    }
}


function getCurrentState() { return orbs.map(o => [o.cellX, o.cellY]); } // Renamed
function isGoalState(state, gpIdx, gx, gy) { return gpIdx >= 0 && gpIdx < state.length && state[gpIdx][0] === gx && state[gpIdx][1] === gy; }

function heuristic(state, goalOrbIndex, gx, gy) { // Renamed goalPuckIndex
    if (goalOrbIndex < 0 || goalOrbIndex >= state.length) return Infinity;  // Renamed
    const [orbX, orbY] = state[goalOrbIndex]; // Renamed
    if (orbX === gx && orbY === gy) return 0;  // Renamed
    if (orbX === gx || orbY === gy) return 1; // Renamed
    return 2; 
}


function idaStar(rootState, goalOrbIndex, gx, gy) { // Renamed
    let bound = heuristic(rootState, goalOrbIndex, gx, gy); // Renamed
    let path = []; const MAX_ITER = 50; 
    for (let iter = 0; iter < MAX_ITER; iter++) {
        path = []; 
        let t = searchIda(rootState, 0, bound, path, goalOrbIndex, gx, gy); // Renamed
        if (t === true) return path.slice(); 
        if (t === Infinity) { return null; }
        bound = t;                          
    }
    console.warn("IDA* reached max iterations for cheat/optimal calculation.");
    return null; 
}
function searchIda(currState, g, bound, path, gpIdx, gx, gy) {
    let f = g + heuristic(currState, gpIdx, gx, gy);
    if (f > bound) return f;
    if (isGoalState(currState, gpIdx, gx, gy)) return true;
    let minOver = Infinity;
    for (let oi = 0; oi < currState.length; oi++) { // Renamed pi to oi for orbIndex
        for (let dir of ["left", "right", "up", "down"]) {
            let { endX, endY, cellsToMove } = findDestinationForState(currState, currState[oi][0], currState[oi][1], dir, oi); // Renamed
            if (cellsToMove > 0) {
                let nextState = currState.map(o_pos => [...o_pos]); // Renamed
                nextState[oi] = [endX, endY]; // Renamed
                path.push({ orbIndex: oi, dir }); // Renamed puckIndex to orbIndex
                let t = searchIda(nextState, g + 1, bound, path, gpIdx, gx, gy);
                if (t === true) return true; 
                path.pop(); 
                if (t < minOver) minOver = t;
            }
        }
    }
    return minOver;
}

function boundedIdaStar(rootState, goalOrbIndex, gx, gy, maxDepth) { // Renamed
    let startH = heuristic(rootState, goalOrbIndex, gx, gy); // Renamed
    let path = [];
    for (let currentBound = startH; currentBound <= maxDepth; currentBound++) {
        path = []; 
        if (searchBounded(rootState, 0, currentBound, path, goalOrbIndex, gx, gy, maxDepth) === true) return path.slice(); // Renamed
    }
    return null;
}
function searchBounded(currState, g, bound, path, gpIdx, gx, gy, maxDepth) {
    if (g > maxDepth) return Infinity; 
    let f = g + heuristic(currState, gpIdx, gx, gy);
    if (f > bound) return f;
    if (isGoalState(currState, gpIdx, gx, gy)) return true;
    let minOver = Infinity;
    for (let oi = 0; oi < currState.length; oi++) { // Renamed
        for (let dir of ["left", "right", "up", "down"]) {
            let { endX, endY, cellsToMove } = findDestinationForState(currState, currState[oi][0], currState[oi][1], dir, oi); // Renamed
            if (cellsToMove > 0) {
                let nextState = currState.map(o_pos => [...o_pos]); // Renamed
                nextState[oi] = [endX, endY]; // Renamed
                path.push({ orbIndex: oi, dir }); // Renamed
                let t = searchBounded(nextState, g + 1, bound, path, gpIdx, gx, gy, maxDepth);
                if (t === true) return true;
                path.pop();
                if (t < minOver) minOver = t;
            }
        }
    }
    return minOver;
}

function findDestinationForState(state, x, y, dir, movingOrbIndexInState) { // Renamed
    let dx = 0, dy = 0;
    if (dir === "left") dx = -1; else if (dir === "right") dx = 1;
    else if (dir === "up") dy = -1; else if (dir === "down") dy = 1;
    let cx = x, cy = y, steps = 0;
    while (true) {
        if ((dx > 0 && verticalWalls[cx+1][cy]) || (dx < 0 && verticalWalls[cx][cy]) ||
            (dy > 0 && horizontalWalls[cy+1][cx]) || (dy < 0 && horizontalWalls[cy][cx])) break;
        let nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
        if (occupiedInState(state, nx, ny, movingOrbIndexInState)) break; // Renamed
        cx = nx; cy = ny; steps++;
        if (steps > Math.max(ROWS,COLS)) break; 
    }
    return { endX: cx, endY: cy, cellsToMove: steps };
}
function occupiedInState(state, xx, yy, excludeIndexInState = -1) {
    for (let i = 0; i < state.length; i++) {
        if (i === excludeIndexInState) continue;
        if (state[i][0] === xx && state[i][1] === yy) return true;
    }
    return false;
}

function computeMinimalMovesForStateGoal(startState, goalOrbIndex, gx, gy) { // Renamed
    if (isGoalState(startState, goalOrbIndex, gx, gy)) return 0; // Renamed
    const solutionPath = idaStar(startState, goalOrbIndex, gx, gy); // Renamed
    if (solutionPath) {
        return solutionPath.length;
    } else {
        return Math.max(ROWS, COLS) * 2; 
    }
}

// --- UI Update Functions ---
function updateScoreDisplay() { scoreDisplayElem.textContent = `Goals Completed: ${goalsCompleted}`; }
function updateMoveDisplay() { 
    moveDisplayElem.textContent = `Moves: ${userMoves} (Optimal: ${optimalMovesForCurrentGoal})`; 
}
function onNewGameClick() { 
    if (history.replaceState) { 
        history.replaceState(null, null, window.location.pathname + window.location.search);
    } else {
        window.location.hash = "";
    }
    initGame(); 
}