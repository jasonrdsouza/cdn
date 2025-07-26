// DOM Elements
const timeDisplay = document.getElementById('time-display');
const teaLiquid = document.getElementById('tea-liquid');
const customMinutesInput = document.getElementById('custom-minutes');
const messageArea = document.getElementById('message-area');
const pauseBtn = document.getElementById('pause-btn');
const steamGroup = document.getElementById('steam-group');

// Timer state variables
let timerInterval = null;
let totalSeconds = 0;
let initialTotalSeconds = 0; 
let isPaused = false;
let isCountingUp = false;

// The standard duration for the full color transition (5 minutes)
const COLOR_TRANSITION_DURATION = 300;

// Multi-stage color range for steeping effect
const START_COLOR = { r: 232, g: 241, b: 245 }; // #e8f1f5 (Very light blue-grey)
const MID_COLOR   = { r: 255, g: 235, b: 150 }; // #ffeb96 (Light yellow)
const END_COLOR   = { r: 139, g: 69,  b: 19  }; // #8b4513 (Saddle brown)

/**
 * Displays a message to the user for a short duration.
 * @param {string} text - The message to display.
 * @param {boolean} isError - If true, displays the message in red.
 */
function showMessage(text, isError = false) {
    messageArea.textContent = text;
    messageArea.style.color = isError ? '#ef4444' : '#4b5563';
    setTimeout(() => {
        messageArea.textContent = '';
    }, 3000);
}

/**
 * Interpolates between two colors.
 * @param {object} color1 - The starting RGB color object.
 * @param {object} color2 - The ending RGB color object.
 * @param {number} factor - The interpolation factor (0 to 1).
 * @returns {string} The resulting CSS hex color string.
 */
function interpolateColor(color1, color2, factor) {
    let result = {r: 0, g: 0, b: 0};
    Object.keys(result).forEach(key => {
        result[key] = Math.round(color1[key] + factor * (color2[key] - color1[key]));
    });
    // Convert RGB to hex
    return `#${Object.values(result).map(val => val.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Updates the tea visualization using a multi-stage color transition.
 * @param {number} percent - The completion percentage (0-100).
 */
function updateTeaVisuals(percent) {
    // The cup is full at y=20 to show a lip.
    teaLiquid.setAttribute('y', 20);
    const cappedPercent = Math.min(percent, 100);
    let newColor;
    if (cappedPercent < 50) {
        const factor = cappedPercent / 50;
        newColor = interpolateColor(START_COLOR, MID_COLOR, factor);
    } else {
        const factor = (cappedPercent - 50) / 50;
        newColor = interpolateColor(MID_COLOR, END_COLOR, factor);
    }
    teaLiquid.setAttribute('fill', newColor);
}

/**
 * Updates the time display with the formatted time.
 * @param {number} seconds - The total seconds to display.
 */
function updateDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    timeDisplay.textContent = formattedTime;
    document.title = `${formattedTime} - Tea Timer`;
}

/**
 * Sets the timer to a preset number of seconds for countdown.
 * @param {number} seconds - The duration in seconds.
 */
function setPresetTime(seconds) {
    resetTimer(); 
    isCountingUp = false;
    totalSeconds = seconds;
    initialTotalSeconds = seconds;
    updateDisplay(totalSeconds);
    updateTeaVisuals(0);
    showMessage(`Timer set for ${seconds / 60} minute(s).`);
}

/**
 * Sets the timer based on the user's custom minute input for countdown.
 */
function setCustomTime() {
    const minutes = parseInt(customMinutesInput.value, 10);
    if (isNaN(minutes) || minutes <= 0) {
        showMessage("Please enter a valid number of minutes.", true);
        customMinutesInput.value = '';
        return;
    }
    resetTimer();
    isCountingUp = false;
    totalSeconds = minutes * 60;
    initialTotalSeconds = minutes * 60;
    updateDisplay(totalSeconds);
    updateTeaVisuals(0);
    customMinutesInput.value = '';
    showMessage(`Timer set for ${minutes} minute(s).`);
}

/**
 * Runs the main timer interval logic.
 */
function runTimer() {
    let elapsedSeconds;
    let progressPercent;

    if (isCountingUp) {
        // Stopwatch logic
        totalSeconds++;
        elapsedSeconds = totalSeconds;
    } else {
        // Countdown logic
        totalSeconds--;
        elapsedSeconds = initialTotalSeconds - totalSeconds;
    }
    
    updateDisplay(totalSeconds < 0 ? 0 : totalSeconds);

    // REVISED: Calculate color progress based on a fixed 5-minute duration.
    progressPercent = (elapsedSeconds / COLOR_TRANSITION_DURATION) * 100;
    updateTeaVisuals(progressPercent);

    // Handle countdown finish
    if (!isCountingUp && totalSeconds < 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        playAlarm();
        timeDisplay.classList.add('animate-pulse');
        steamGroup.classList.add('invisible'); // Hide steam when countdown finishes
    }
}

/**
 * Starts the countdown timer.
 */
function startTimer() {
    if (timerInterval !== null) return;
    if (totalSeconds <= 0 && !isCountingUp) {
        showMessage("Please set a time before starting.", true);
        return;
    }
    isCountingUp = false;
    isPaused = false;
    Tone.start();
    pauseBtn.textContent = 'Pause';
    steamGroup.classList.remove('invisible');
    timerInterval = setInterval(runTimer, 1000);
}

/**
 * Starts the stopwatch (count-up) timer.
 */
function startStopwatch() {
    if (timerInterval !== null) return;
    resetTimer();
    isCountingUp = true;
    isPaused = false;
    Tone.start();
    pauseBtn.textContent = 'Pause';
    steamGroup.classList.remove('invisible');
    timerInterval = setInterval(runTimer, 1000);
}

/**
 * Toggles the pause/resume state of the timer.
 */
function togglePause() {
    // If the timer is running, pause it.
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
        pauseBtn.textContent = 'Resume';
        steamGroup.classList.add('paused');
    } 
    // If the timer is paused, resume it.
    else if (isPaused) {
        isPaused = false;
        pauseBtn.textContent = 'Pause';
        steamGroup.classList.remove('paused');
        timerInterval = setInterval(runTimer, 1000);
    }
}

/**
 * Resets the timer and the visual display to its initial state.
 */
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    totalSeconds = 0;
    initialTotalSeconds = 0;
    isPaused = false;
    isCountingUp = false;
    updateDisplay(0);
    updateTeaVisuals(0); 
    document.title = "Tea Timer";
    timeDisplay.classList.remove('animate-pulse');
    pauseBtn.textContent = 'Pause';
    steamGroup.classList.add('invisible');
    steamGroup.classList.remove('paused');
}

/**
 * Plays a pleasant alarm sound using Tone.js.
 */
function playAlarm() {
    const synth = new Tone.Synth().toDestination();
    const now = Tone.now();
    synth.triggerAttackRelease("C5", "8n", now);
    synth.triggerAttackRelease("E5", "8n", now + 0.25);
    synth.triggerAttackRelease("G5", "8n", now + 0.5);
}

// Initialize display and teacup on page load
window.onload = () => {
    resetTimer();
};
