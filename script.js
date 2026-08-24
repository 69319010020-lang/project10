// script.js

// Game State Variables
let boardState = Array(9).fill(null);
let isGameActive = true;
let currentPlayer = 'x'; // 'x' starts first
let gameMode = '1p'; // '1p' or '2p'
let difficulty = 'easy'; // 'easy' or 'hard'
let scores = { x: 0, o: 0, ties: 0 };
let isAiThinking = false;
let soundEnabled = true;

// Web Audio Context & Synthesizer
let audioCtx = null;

// Initialize Sound Settings from LocalStorage
if (localStorage.getItem('sound_enabled') !== null) {
    soundEnabled = localStorage.getItem('sound_enabled') === 'true';
}

// DOM Elements
const cells = document.querySelectorAll('.cell');
const board = document.getElementById('board');
const turnBadge = document.getElementById('turn-badge');
const turnSymbol = document.getElementById('turn-symbol');
const btnRestart = document.getElementById('btn-restart');
const btnReset = document.getElementById('btn-reset');
const btnMode1p = document.getElementById('mode-1p');
const btnMode2p = document.getElementById('mode-2p');
const btnDiffEasy = document.getElementById('diff-easy');
const btnDiffHard = document.getElementById('diff-hard');
const difficultyWrapper = document.getElementById('difficulty-wrapper');
const soundToggle = document.getElementById('sound-toggle');
const soundOnSvg = document.getElementById('sound-on-svg');
const soundOffSvg = document.getElementById('sound-off-svg');

const scoreXVal = document.getElementById('score-x');
const scoreOVal = document.getElementById('score-o');
const scoreTiesVal = document.getElementById('score-ties');
const scoreXTitle = document.getElementById('score-x-title');
const scoreOTitle = document.getElementById('score-o-title');

// Winning Combinations
const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Initialize UI States
updateSoundIcons();

// --- Audio Synthesizer Functions ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    } else if (type === 'x') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    } else if (type === 'o') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392.00, now); // G4
        osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.12); // D5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    } else if (type === 'win') {
        // High quality bright arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
            const noteOsc = audioCtx.createOscillator();
            const noteGain = audioCtx.createGain();
            noteOsc.connect(noteGain);
            noteGain.connect(audioCtx.destination);
            
            noteOsc.type = 'sine';
            noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
            noteGain.gain.setValueAtTime(0.08, now + idx * 0.08);
            noteGain.gain.linearRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
            
            noteOsc.start(now + idx * 0.08);
            noteOsc.stop(now + idx * 0.08 + 0.25);
        });
    } else if (type === 'tie') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.35);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
    }
}

// --- Sound Controls ---
function updateSoundIcons() {
    if (soundEnabled) {
        soundOnSvg.classList.remove('hidden');
        soundOffSvg.classList.add('hidden');
    } else {
        soundOnSvg.classList.add('hidden');
        soundOffSvg.classList.remove('hidden');
    }
}

soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sound_enabled', soundEnabled);
    updateSoundIcons();
    playSound('click');
});

// --- Core Game Functions ---

function handleCellClick(e) {
    const cell = e.target;
    const index = parseInt(cell.getAttribute('data-index'));

    // Check if cell is filled or game is inactive or AI is calculating
    if (boardState[index] !== null || !isGameActive || isAiThinking) return;

    makeMove(index);

    // If game is still active and Single Player mode, let AI play
    if (isGameActive && gameMode === '1p' && currentPlayer === 'o') {
        isAiThinking = true;
        setTimeout(handleAiMove, 550); // slight natural lag
    }
}

function makeMove(index) {
    boardState[index] = currentPlayer;
    
    const cell = cells[index];
    cell.classList.add(currentPlayer);
    playSound(currentPlayer);

    const gameResult = checkWin(boardState);

    if (gameResult) {
        endGame(gameResult);
    } else {
        // Switch Player
        currentPlayer = currentPlayer === 'x' ? 'o' : 'x';
        updateTurnIndicator();
    }
}

function updateTurnIndicator() {
    turnBadge.className = `turn-badge ${currentPlayer === 'x' ? 'X-turn' : 'O-turn'}`;
    turnSymbol.textContent = currentPlayer.toUpperCase();
}

function checkWin(board) {
    for (let combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], combo };
        }
    }
    if (board.every(cell => cell !== null)) {
        return { winner: 'tie' };
    }
    return null;
}

function endGame(result) {
    isGameActive = false;
    
    if (result.winner === 'tie') {
        scores.ties++;
        scoreTiesVal.textContent = scores.ties;
        playSound('tie');
    } else {
        if (result.winner === 'x') {
            scores.x++;
            scoreXVal.textContent = scores.x;
        } else {
            scores.o++;
            scoreOVal.textContent = scores.o;
        }
        
        // Highlight winning cells
        result.combo.forEach(index => {
            cells[index].classList.add('win');
        });
        playSound('win');
    }
}

// --- AI Calculations & Algorithms ---

function handleAiMove() {
    if (!isGameActive) {
        isAiThinking = false;
        return;
    }

    let aiMove;
    if (difficulty === 'easy') {
        aiMove = getEasyMove(boardState);
    } else {
        aiMove = getBestMove(boardState);
    }

    if (aiMove !== null) {
        makeMove(aiMove);
    }
    isAiThinking = false;
}

function getEasyMove(board) {
    const emptyCells = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            emptyCells.push(i);
        }
    }
    if (emptyCells.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
}

// Unbeatable Minimax Algorithm
function minimax(board, depth, isMaximizing) {
    const result = checkWin(board);
    if (result) {
        if (result.winner === 'o') return 10 - depth;
        if (result.winner === 'x') return depth - 10;
        if (result.winner === 'tie') return 0;
    }

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'o';
                let score = minimax(board, depth + 1, false);
                board[i] = null;
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'x';
                let score = minimax(board, depth + 1, true);
                board[i] = null;
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function getBestMove(board) {
    let bestScore = -Infinity;
    let bestMove = null;
    
    // Check if the board is empty (AI starts first - theoretically impossible in this setup, but good practice)
    const isEmpty = board.every(val => val === null);
    if (isEmpty) {
        // Center is the best starting spot, or random corner
        return 4; 
    }

    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = 'o';
            let score = minimax(board, 0, false);
            board[i] = null;
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    return bestMove;
}

// --- Menu Controls & Resets ---

function restartRound() {
    boardState.fill(null);
    isGameActive = true;
    currentPlayer = 'x';
    isAiThinking = false;
    updateTurnIndicator();
    
    cells.forEach(cell => {
        cell.className = 'cell';
    });
}

function resetAll() {
    scores = { x: 0, o: 0, ties: 0 };
    scoreXVal.textContent = 0;
    scoreOVal.textContent = 0;
    scoreTiesVal.textContent = 0;
    restartRound();
}

// Switch Game Modes
function setGameMode(mode) {
    if (gameMode === mode) return;
    
    gameMode = mode;
    playSound('click');
    
    if (gameMode === '1p') {
        btnMode1p.classList.add('active');
        btnMode2p.classList.remove('active');
        difficultyWrapper.classList.remove('slide-up');
        
        scoreXTitle.textContent = 'X (You)';
        scoreOTitle.textContent = 'O (AI)';
    } else {
        btnMode1p.classList.remove('active');
        btnMode2p.classList.add('active');
        difficultyWrapper.classList.add('slide-up');
        
        scoreXTitle.textContent = 'X (P1)';
        scoreOTitle.textContent = 'O (P2)';
    }
    
    resetAll();
}

// Switch Difficulties
function setDifficulty(diff) {
    if (difficulty === diff) return;
    
    difficulty = diff;
    playSound('click');
    
    if (difficulty === 'easy') {
        btnDiffEasy.classList.add('active');
        btnDiffHard.classList.remove('active');
    } else {
        btnDiffEasy.classList.remove('active');
        btnDiffHard.classList.add('active');
    }
    
    resetAll();
}

// --- Event Listeners ---
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
btnRestart.addEventListener('click', () => {
    playSound('click');
    restartRound();
});
btnReset.addEventListener('click', () => {
    playSound('click');
    resetAll();
});
btnMode1p.addEventListener('click', () => setGameMode('1p'));
btnMode2p.addEventListener('click', () => setGameMode('2p'));
btnDiffEasy.addEventListener('click', () => setDifficulty('easy'));
btnDiffHard.addEventListener('click', () => setDifficulty('hard'));
