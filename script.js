// Game configuration
const config = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
    custom: { rows: 9, cols: 9, mines: 10 }
};

// Game state
let gameState = {
    board: [],
    difficulty: 'beginner',
    rows: config.beginner.rows,
    cols: config.beginner.cols,
    mines: config.beginner.mines,
    minePositions: [],
    isGameOver: false,
    isFirstClick: true,
    timerInterval: null,
    time: 0,
    flagCount: 0,
    revealed: 0,
    score: 0
};

// Stats tracking
const statsData = {
    gamesPlayed: 0,
    gamesWon: 0,
    bestTimes: {
        beginner: Infinity,
        intermediate: Infinity,
        expert: Infinity
    },
    lastGameScore: 0,
    achievements: []
};

// DOM elements
const gameBoard = document.getElementById('game-board');
const minesCount = document.getElementById('mines-count');
const timer = document.getElementById('timer');
const newGameBtn = document.getElementById('new-game-btn');
const beginnerBtn = document.getElementById('beginner');
const intermediateBtn = document.getElementById('intermediate');
const expertBtn = document.getElementById('expert');
const customToggleBtn = document.getElementById('custom-toggle');
const customControls = document.getElementById('custom-controls');
const rowsSlider = document.getElementById('rows-slider');
const colsSlider = document.getElementById('cols-slider');
const minesSlider = document.getElementById('mines-slider');
const rowsValue = document.getElementById('rows-value');
const colsValue = document.getElementById('cols-value');
const minesValue = document.getElementById('mines-value');
const applyCustomBtn = document.getElementById('apply-custom');

// Stats elements
const statsPanel = document.getElementById('stats-panel');
const statsToggleBtn = document.getElementById('stats-toggle');
const statsCloseBtn = document.getElementById('stats-close');
const resetStatsBtn = document.getElementById('reset-stats');
const gamesPlayedEl = document.getElementById('games-played');
const gamesWonEl = document.getElementById('games-won');
const winRateEl = document.getElementById('win-rate');
const bestTimeBeginnerEl = document.getElementById('best-time-beginner');
const bestTimeIntermediateEl = document.getElementById('best-time-intermediate');
const bestTimeExpertEl = document.getElementById('best-time-expert');

// Add confetti canvas element reference
const confettiCanvas = document.getElementById('confetti-canvas');
let confettiContext;
let confettiAnimationId;
let confettiParticles = [];

// Completion card elements
const completionCard = document.getElementById('completion-card');
const completionCloseBtn = document.getElementById('completion-close');
const completionTitleEl = document.getElementById('completion-title');
const completionTimeEl = document.getElementById('completion-time');
const completionDifficultyEl = document.getElementById('completion-difficulty');
const completionScoreEl = document.getElementById('completion-score');
const completionMessageEl = document.getElementById('completion-message');
const shareTwitterBtn = document.getElementById('share-twitter');
const copyResultBtn = document.getElementById('copy-result');
const playAgainBtn = document.getElementById('play-again');
const nextDifficultyBtn = document.getElementById('next-difficulty');
const toastEl = document.getElementById('toast');
const toastMessageEl = document.getElementById('toast-message');

// Default theme icons
const defaultIcons = {
    mine: '💣',
    flag: '🚨',
    question: '?'
};

// Initialize game
function initGame() {
    resetGameState();
    createBoard();
    updateUI();
    addEventListeners();

    // Load saved stats if not already loaded
    if (statsData.gamesPlayed === 0) {
        loadStats();
    }
}

// Reset game state
function resetGameState() {
    gameState.board = [];
    gameState.minePositions = [];
    gameState.isGameOver = false;
    gameState.isFirstClick = true;
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
    gameState.time = 0;
    gameState.flagCount = 0;
    gameState.revealed = 0;
    gameState.score = 0;
    timer.textContent = '0';
}

// Create the game board
function createBoard() {
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.cols}, 40px)`;
    gameBoard.style.gridTemplateRows = `repeat(${gameState.rows}, 40px)`;

    // Initialize the board array
    gameState.board = Array(gameState.rows).fill().map(() =>
        Array(gameState.cols).fill().map(() => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            isQuestion: false,
            adjacentMines: 0
        }))
    );

    // Create cells in the DOM
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Add event listeners for cell
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleRightClick);

            gameBoard.appendChild(cell);
        }
    }
}

// Handle left click on a cell
function handleCellClick(event) {
    if (gameState.isGameOver) return;

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    const cell = gameState.board[row][col];

    // If it's the first click, generate mines
    if (gameState.isFirstClick) {
        gameState.isFirstClick = false;
        generateMines(row, col);
        startTimer();
    }

    // If the cell is flagged or already revealed, do nothing
    if (cell.isFlagged || cell.isRevealed) return;

    // If it's a mine, game over
    if (cell.isMine) {
        revealMines();
        endGame(false);
        return;
    }

    // Otherwise, reveal the cell
    revealCell(row, col);
    animateReveal(row, col);

    // Check if the player has won
    checkWinCondition();
}

// Handle right click (flag)
function handleRightClick(event) {
    event.preventDefault();
    if (gameState.isGameOver || gameState.isFirstClick) return;

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    const cell = gameState.board[row][col];

    // If the cell is already revealed, do nothing
    if (cell.isRevealed) return;

    // Cycle through: normal -> flag -> question -> normal
    if (!cell.isFlagged && !cell.isQuestion) {
        cell.isFlagged = true;
        cell.isQuestion = false;
        gameState.flagCount++;
        animateFlag(row, col);
    } else if (cell.isFlagged) {
        cell.isFlagged = false;
        cell.isQuestion = true;
        gameState.flagCount--;
    } else {
        cell.isQuestion = false;
    }

    updateUI();
}

// Reveal a cell
function revealCell(row, col) {
    if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) return;

    const cell = gameState.board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    gameState.revealed++;

    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cellElement.classList.add('revealed');

    if (cell.adjacentMines > 0) {
        cellElement.textContent = cell.adjacentMines;
        cellElement.dataset.number = cell.adjacentMines;
    } else {
        // If no adjacent mines, reveal all adjacent cells (flood fill)
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;
                revealCell(row + r, col + c);
            }
        }
    }
}

// Generate mines
function generateMines(firstRow, firstCol) {
    let minesToPlace = gameState.mines;

    while (minesToPlace > 0) {
        const row = Math.floor(Math.random() * gameState.rows);
        const col = Math.floor(Math.random() * gameState.cols);

        // Don't place a mine on the first clicked cell or adjacent cells
        const isDifferentFromFirstClick = Math.abs(row - firstRow) > 1 || Math.abs(col - firstCol) > 1;

        if (!gameState.board[row][col].isMine && isDifferentFromFirstClick) {
            gameState.board[row][col].isMine = true;
            gameState.minePositions.push({ row, col });
            minesToPlace--;

            // Increment adjacent mine counts
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    const newRow = row + r;
                    const newCol = col + c;

                    if (newRow >= 0 && newRow < gameState.rows &&
                        newCol >= 0 && newCol < gameState.cols) {
                        gameState.board[newRow][newCol].adjacentMines++;
                    }
                }
            }
        }
    }

    updateUI();
}

// Reveal mines with default mine icon
function revealMines() {
    for (const { row, col } of gameState.minePositions) {
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cellElement.classList.add('mine');
        gameState.board[row][col].isRevealed = true;

        // Add default mine icon
        cellElement.textContent = defaultIcons.mine;
    }
}

// Start the timer
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.time++;
        timer.textContent = gameState.time;
    }, 1000);
}

// End the game
function endGame(isWin) {
    gameState.isGameOver = true;
    clearInterval(gameState.timerInterval);

    // Update stats
    statsData.gamesPlayed++;

    if (isWin) {
        statsData.gamesWon++;

        // Calculate score
        calculateScore();

        // Update best time for current difficulty if not custom
        if (gameState.difficulty !== 'custom') {
            if (gameState.time < statsData.bestTimes[gameState.difficulty]) {
                statsData.bestTimes[gameState.difficulty] = gameState.time;
            }
        }

        // Start confetti animation
        startConfetti();

        // Show completion card with delay
        setTimeout(() => {
            showCompletionCard(true);
        }, 1000);

        // Play victory animation
        animateVictory();
    } else {
        // Show failure completion card without delay
        showCompletionCard(false);
    }

    // Save stats
    saveStats();
}

// Check win condition
function checkWinCondition() {
    const totalCells = gameState.rows * gameState.cols;
    const cellsToReveal = totalCells - gameState.mines;

    if (gameState.revealed === cellsToReveal) {
        // Flag all mines
        for (const { row, col } of gameState.minePositions) {
            if (!gameState.board[row][col].isFlagged) {
                gameState.board[row][col].isFlagged = true;
                gameState.flagCount++;
            }
        }

        updateUI();
        endGame(true);
    }
}

// Update UI elements
function updateUI() {
    minesCount.textContent = gameState.mines - gameState.flagCount;

    // Update cell appearance
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = gameState.board[row][col];
            const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

            cellElement.classList.toggle('revealed', cell.isRevealed);
            cellElement.classList.toggle('flagged', cell.isFlagged);
            cellElement.classList.toggle('question', cell.isQuestion);

            // Clear existing content
            cellElement.textContent = '';

            if (cell.isRevealed) {
                if (cell.isMine) {
                    // Use default mine icon
                    cellElement.textContent = defaultIcons.mine;
                } else if (cell.adjacentMines > 0) {
                    cellElement.textContent = cell.adjacentMines;
                    cellElement.dataset.number = cell.adjacentMines;
                }
            } else if (cell.isFlagged) {
                // Use default flag icon
                cellElement.textContent = defaultIcons.flag;
            } else if (cell.isQuestion) {
                // Use default question icon
                cellElement.textContent = defaultIcons.question;
            }
        }
    }
}

// Change difficulty
function changeDifficulty(difficulty) {
    // Remove active class from all difficulty buttons
    beginnerBtn.classList.remove('active');
    intermediateBtn.classList.remove('active');
    expertBtn.classList.remove('active');
    customToggleBtn.classList.remove('active');

    // Hide custom controls if selecting a preset difficulty
    if (difficulty !== 'custom') {
        customControls.classList.add('hidden');

        // Add active class to the selected button
        document.getElementById(difficulty).classList.add('active');
    } else {
        customToggleBtn.classList.add('active');
    }

    gameState.difficulty = difficulty;
    gameState.rows = config[difficulty].rows;
    gameState.cols = config[difficulty].cols;
    gameState.mines = config[difficulty].mines;

    resetGameState();
    createBoard();
    updateUI();
}

// Apply custom difficulty settings
function applyCustomDifficulty() {
    // Get values from sliders
    const rows = parseInt(rowsSlider.value);
    const cols = parseInt(colsSlider.value);
    let mines = parseInt(minesSlider.value);

    // Update config with custom values
    config.custom.rows = rows;
    config.custom.cols = cols;
    config.custom.mines = mines;

    // Check if mines count is valid (should be less than 80% of total cells)
    const maxMines = Math.floor(rows * cols * 0.8);
    if (mines > maxMines) {
        mines = maxMines;
        config.custom.mines = mines;
        minesSlider.value = mines;
        minesValue.textContent = mines;
    }

    // Apply custom difficulty
    changeDifficulty('custom');
}

// Toggle custom controls display
function toggleCustomControls() {
    customControls.classList.toggle('hidden');

    if (!customControls.classList.contains('hidden')) {
        // Update sliders with current custom values
        rowsSlider.value = config.custom.rows;
        colsSlider.value = config.custom.cols;
        minesSlider.value = config.custom.mines;

        // Update slider value displays
        updateSliderValues();

        // Set max value for mines slider based on board size
        const maxMines = Math.floor(config.custom.rows * config.custom.cols * 0.8);
        minesSlider.max = maxMines;

        // Change difficulty to custom
        changeDifficulty('custom');
    }
}

// Update slider value displays
function updateSliderValues() {
    rowsValue.textContent = rowsSlider.value;
    colsValue.textContent = colsSlider.value;
    minesValue.textContent = minesSlider.value;

    // Update max mines value
    const maxMines = Math.floor(rowsSlider.value * colsSlider.value * 0.8);
    minesSlider.max = maxMines;

    // Ensure mines value is not above max
    if (parseInt(minesSlider.value) > maxMines) {
        minesSlider.value = maxMines;
        minesValue.textContent = maxMines;
    }
}

// Toggle stats panel
function toggleStatsPanel() {
    statsPanel.classList.toggle('hidden');

    if (!statsPanel.classList.contains('hidden')) {
        updateStatsDisplay();
    }
}

// Update stats display
function updateStatsDisplay() {
    gamesPlayedEl.textContent = statsData.gamesPlayed;
    gamesWonEl.textContent = statsData.gamesWon;

    // Calculate win rate
    const winRate = statsData.gamesPlayed > 0
        ? Math.round((statsData.gamesWon / statsData.gamesPlayed) * 100)
        : 0;
    winRateEl.textContent = winRate + '%';

    // Format best times
    bestTimeBeginnerEl.textContent = formatTime(statsData.bestTimes.beginner);
    bestTimeIntermediateEl.textContent = formatTime(statsData.bestTimes.intermediate);
    bestTimeExpertEl.textContent = formatTime(statsData.bestTimes.expert);
}

// Format time for display
function formatTime(time) {
    if (time === Infinity) return '-';

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Save stats to localStorage
function saveStats() {
    try {
        localStorage.setItem('cubeExplorerStats', JSON.stringify(statsData));
    } catch (error) {
        console.error('Error saving stats:', error);
    }
}

// Load stats from localStorage
function loadStats() {
    try {
        const savedStats = localStorage.getItem('cubeExplorerStats');
        if (savedStats) {
            const parsedStats = JSON.parse(savedStats);

            // Update statsData with saved values
            statsData.gamesPlayed = parsedStats.gamesPlayed || 0;
            statsData.gamesWon = parsedStats.gamesWon || 0;

            // Update best times
            if (parsedStats.bestTimes) {
                statsData.bestTimes.beginner = parsedStats.bestTimes.beginner || Infinity;
                statsData.bestTimes.intermediate = parsedStats.bestTimes.intermediate || Infinity;
                statsData.bestTimes.expert = parsedStats.bestTimes.expert || Infinity;
            }

            // Update display
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Reset stats
function resetStats() {
    if (confirm('Are you sure you want to reset all statistics?')) {
        statsData.gamesPlayed = 0;
        statsData.gamesWon = 0;
        statsData.bestTimes = {
            beginner: Infinity,
            intermediate: Infinity,
            expert: Infinity
        };

        saveStats();
        updateStatsDisplay();
    }
}

// Initialize confetti animation efficiently
function startConfetti() {
    confettiCanvas.classList.remove('hidden');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiContext = confettiCanvas.getContext('2d');
    confettiParticles = [];

    // Reduce particle count for better performance
    const particleCount = window.innerWidth < 600 ? 30 : 60;
    for (let i = 0; i < particleCount; i++) {
        confettiParticles.push(createConfettiParticle());
    }

    // Start animation
    animateConfetti();

    // Safety timeout to ensure confetti stops after 3 seconds (reduced from 5)
    setTimeout(stopConfetti, 3000);
}

// Create a confetti particle
function createConfettiParticle() {
    // Default confetti colors
    const colors = ['#ff5252', '#ffeb3b', '#2196f3', '#4caf50', '#e040fb', '#03dac6'];

    return {
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * 6.28,
        spin: Math.random() * 0.2 - 0.1,
        deltaAngle: Math.random() * 0.1 - 0.05
    };
}

// Animate confetti efficiently
function animateConfetti() {
    if (!confettiContext) return;

    confettiContext.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    let particlesToKeep = [];

    confettiParticles.forEach(particle => {
        particle.y += particle.speed;
        particle.angle += particle.deltaAngle;

        confettiContext.save();
        confettiContext.translate(particle.x, particle.y);
        confettiContext.rotate(particle.angle);

        confettiContext.fillStyle = particle.color;
        confettiContext.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);

        confettiContext.restore();

        // Keep particles that are still within the viewport (with some margin)
        if (particle.y < confettiCanvas.height + 100) {
            particlesToKeep.push(particle);
        }
    });

    confettiParticles = particlesToKeep;

    // Stop animation when all particles are gone or if animation has been running for too long
    if (confettiParticles.length > 0) {
        confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
        stopConfetti();
    }
}

// Stop confetti animation
function stopConfetti() {
    cancelAnimationFrame(confettiAnimationId);
    confettiCanvas.classList.add('hidden');
}

// Show game completion card
function showCompletionCard(isWin) {
    // Set title and message based on win/loss
    completionTitleEl.textContent = isWin ? 'Victory!' : 'Game Over';
    completionTitleEl.style.color = isWin ? 'var(--secondary-color)' : 'var(--error)';

    // Set appropriate message
    if (isWin) {
        completionMessageEl.textContent = "You've mastered this challenge! Share your victory with friends!";
    } else {
        completionMessageEl.textContent = "Better luck next time! Try again.";
    }

    // Update stats
    completionTimeEl.textContent = formatTime(gameState.time);
    completionDifficultyEl.textContent = gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1);
    completionScoreEl.textContent = isWin ? gameState.score : '0';

    // Show the card
    completionCard.classList.remove('hidden');

    // Only show next difficulty button if player won and not already at expert
    if (isWin && gameState.difficulty !== 'expert' && gameState.difficulty !== 'custom') {
        nextDifficultyBtn.style.display = 'block';
    } else {
        nextDifficultyBtn.style.display = 'none';
    }
}

// Close completion card
function closeCompletionCard() {
    completionCard.classList.add('hidden');
}

// Share results on Twitter
function shareOnTwitter() {
    const difficulty = gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1);
    const text = `I just scored ${gameState.score} points in Cube Explorer on ${difficulty} mode in ${formatTime(gameState.time)}! Can you beat my score?`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
}

// Copy result to clipboard
function copyResultToClipboard() {
    const difficulty = gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1);
    const text = `I just scored ${gameState.score} points in Cube Explorer on ${difficulty} mode in ${formatTime(gameState.time)}!`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Result copied to clipboard!'))
            .catch(err => showToast('Failed to copy. Try again.'));
    } else {
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Result copied to clipboard!');
        } catch (err) {
            showToast('Failed to copy. Try again.');
        }
        document.body.removeChild(textarea);
    }
}

// Show toast notification
function showToast(message) {
    toastMessageEl.textContent = message;
    toastEl.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3000);
}

// Play again button action
function handlePlayAgain() {
    closeCompletionCard();
    initGame();
}

// Try next difficulty button
function handleNextDifficulty() {
    closeCompletionCard();

    // Determine next difficulty level
    let nextDifficulty = 'intermediate';
    if (gameState.difficulty === 'intermediate') {
        nextDifficulty = 'expert';
    }

    // Apply next difficulty
    changeDifficulty(nextDifficulty);
}

// Calculate score
function calculateScore() {
    // Base score calculation
    const baseScore = Math.floor((gameState.mines * 100) / gameState.time);

    // Apply score
    gameState.score = baseScore;

    // Ensure minimum score of 100
    if (gameState.score < 100) {
        gameState.score = 100;
    }
}

// Reveal cell animation (simplified)
function animateReveal(row, col) {
    // No animation needed - the CSS transition handles the visual feedback
}

// Flag animation (simplified)
function animateFlag(row, col) {
    // No animation needed - the CSS transition handles the visual feedback
}

// Victory animation (simplified)
function animateVictory() {
    // Start confetti, which is the main visual feedback for victory
    startConfetti();
}

// Add event listeners
function addEventListeners() {
    // Game controls
    newGameBtn.addEventListener('click', initGame);

    // Difficulty buttons
    beginnerBtn.addEventListener('click', () => changeDifficulty('beginner'));
    intermediateBtn.addEventListener('click', () => changeDifficulty('intermediate'));
    expertBtn.addEventListener('click', () => changeDifficulty('expert'));
    customToggleBtn.addEventListener('click', toggleCustomControls);

    // Custom difficulty controls
    rowsSlider.addEventListener('input', updateSliderValues);
    colsSlider.addEventListener('input', updateSliderValues);
    minesSlider.addEventListener('input', updateSliderValues);
    applyCustomBtn.addEventListener('click', applyCustomDifficulty);

    // Stats controls
    statsToggleBtn.addEventListener('click', toggleStatsPanel);
    statsCloseBtn.addEventListener('click', toggleStatsPanel);
    resetStatsBtn.addEventListener('click', resetStats);

    // Completion card controls
    completionCloseBtn.addEventListener('click', closeCompletionCard);
    shareTwitterBtn.addEventListener('click', shareOnTwitter);
    copyResultBtn.addEventListener('click', copyResultToClipboard);
    playAgainBtn.addEventListener('click', handlePlayAgain);
    nextDifficultyBtn.addEventListener('click', handleNextDifficulty);

    // Prevent context menu on right-click
    document.addEventListener('contextmenu', (e) => {
        if (e.target.classList.contains('cell')) {
            e.preventDefault();
        }
    });

    // Set active class on initial difficulty
    beginnerBtn.classList.add('active');
}

// Initialize the game on page load
window.addEventListener('load', () => {
    initGame();

    // Configure confetti canvas
    if (confettiCanvas) {
        confettiContext = confettiCanvas.getContext('2d');
    }
});