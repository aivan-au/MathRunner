import './style.css';
const gameContainer = document.getElementById('game-container');
const player = document.getElementById('player');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const gameOverTitle = document.getElementById('game-over-title');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State
let state = {
    isPlaying: false,
    score: 1,
    targetScore: 1000,
    lane: 1, // 0: Left, 1: Center, 2: Right
    speed: 3,
    gates: [],
    lastGateTime: 0,
    gateSpawnInterval: 1500, // ms (Adjusted distance)
    animationFrameId: null
};

// Constants
const LANE_COUNT = 3;
const LANE_WIDTH_PERCENT = 100 / LANE_COUNT;
const playerScoreEl = document.getElementById('player-score');

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
window.addEventListener('keydown', handleInput);

function handleInput(e) {
    if (!state.isPlaying) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        movePlayer(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        movePlayer(1);
    }
}

function movePlayer(direction) {
    const newLane = state.lane + direction;
    if (newLane >= 0 && newLane < LANE_COUNT) {
        state.lane = newLane;
        updatePlayerPosition();
    }
}

function updatePlayerPosition() {
    // Translate X based on lane index (0, 1, 2)
    // 0 -> 0%, 1 -> 100%, 2 -> 200% relative to the player's width
    // Actually, simple calculation: lane * 100%
    player.style.transform = `translateX(${state.lane * 100}%)`;
}

function startGame() {
    // Reset State
    state.score = 1;
    state.lane = 1;
    state.speed = 3; // Start slower
    state.gates = [];
    state.isPlaying = true;
    state.lastGateTime = performance.now();

    // UI Reset
    // Update player score display
    updatePlayerScoreDisplay();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Clear existing gates from DOM
    document.querySelectorAll('.gate').forEach(el => el.remove());

    updatePlayerPosition();

    // Start Loop
    state.animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver(won) {
    state.isPlaying = false;
    cancelAnimationFrame(state.animationFrameId);

    gameOverTitle.textContent = won ? "You Won!" : "Game Over";
    gameOverTitle.style.color = won ? "var(--primary-color)" : "var(--danger-color)";
    finalScoreDisplay.textContent = `Final Score: ${state.score}`;

    gameOverScreen.classList.remove('hidden');
}

function createGate() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const type = Math.random();
    let operation, value;

    // 40% +, 30% -, 20% *, 10% /
    if (type < 0.4) {
        operation = '+';
        value = Math.floor(Math.random() * 10) + 1;
    } else if (type < 0.7) {
        operation = '-';
        value = Math.floor(Math.random() * 10) + 1;
    } else if (type < 0.9) {
        operation = 'x';
        value = Math.random() < 0.5 ? 2 : 3; // x2 or x3
    } else {
        operation = '÷';
        value = Math.random() < 0.5 ? 2 : 3; // /2 or /3
    }

    const gateEl = document.createElement('div');
    gateEl.classList.add('gate');

    if (operation === 'x') {
        gateEl.classList.add('multiply');
    } else if (operation === '÷') {
        gateEl.classList.add('divide');
    } else if (['+'].includes(operation)) {
        gateEl.classList.add('positive');
    } else {
        gateEl.classList.add('negative');
    }
    gateEl.textContent = `${operation}${value}`;

    // Position
    gateEl.style.left = `${lane * LANE_WIDTH_PERCENT}%`;
    gateEl.style.top = '-100px'; // Start above screen

    gameContainer.appendChild(gateEl);

    state.gates.push({
        element: gateEl,
        y: -100,
        lane: lane,
        operation: operation,
        value: value,
        passed: false
    });
}

function gameLoop(timestamp) {
    if (!state.isPlaying) return;

    // Helper for clearing collected gates safely
    let gatesToRemove = [];

    // Spawn Gates
    if (timestamp - state.lastGateTime > state.gateSpawnInterval) {
        createGate();
        state.lastGateTime = timestamp;
        // Increase difficulty slightly
        if (state.gateSpawnInterval > 1000) state.gateSpawnInterval -= 10;
        state.speed += 0.005;
    }

    // Move Gates
    state.gates.forEach((gate, index) => {
        gate.y += state.speed;
        gate.element.style.top = `${gate.y}px`;

        // Collision Detection
        // Player is at bottom 100px. Player height is 60px.
        // Approx collision box: defaults to checking if gate Y is within player Y range and lane matches
        const playerBottom = gameContainer.offsetHeight - 100;
        const playerTop = playerBottom - 60;

        // Simple AABB collision check
        // Gate is approx 80px height
        if (!gate.passed &&
            gate.lane === state.lane &&
            gate.y + 80 > playerTop &&
            gate.y < playerBottom) {

            applyOperation(gate.operation, gate.value);
            gate.passed = true;
            gate.element.style.opacity = '0'; // Hide visual
            // Visual feedback could be added here
        }

        // Cleanup if off screen
        if (gate.y > gameContainer.offsetHeight) {
            gatesToRemove.push(index);
            gate.element.remove();
        }
    });

    // Remove processed gates from array (in reverse order to maintain indices)
    for (let i = gatesToRemove.length - 1; i >= 0; i--) {
        state.gates.splice(gatesToRemove[i], 1);
    }

    // Check Win/Loss
    if (state.score >= state.targetScore) {
        gameOver(true);
        return;
    } else if (state.score <= 0) {
        gameOver(false);
        return;
    }

    state.animationFrameId = requestAnimationFrame(gameLoop);
}

function applyOperation(op, val) {
    switch (op) {
        case '+': state.score += val; break;
        case '-': state.score -= val; break;
        case 'x': state.score *= val; break;
        case '÷': state.score = Math.floor(state.score / val); break;
    }

    updatePlayerScoreDisplay();

    // Animate player score as well
    const playerPop = player.animate([
        { transform: `translateX(${state.lane * 100}%) scale(1)` },
        { transform: `translateX(${state.lane * 100}%) scale(1.2)` },
        { transform: `translateX(${state.lane * 100}%) scale(1)` }
    ], {
        duration: 200
    });

    createParticles(player.getBoundingClientRect(),
        ['+', 'x'].includes(op) ? (op === 'x' ? 'multiply' : 'positive') : 'negative');
}

function updatePlayerScoreDisplay() {
    if (playerScoreEl) {
        playerScoreEl.textContent = state.score;
    }
}

function createParticles(rect, type) {
    const count = 20;
    const color = type === 'positive' ? '#00ff88' : (type === 'multiply' ? '#ffd700' : '#ff0055');

    // Get game container coordinates to position particles correctly within it
    const containerRect = gameContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 - containerRect.left;
    const centerY = rect.top + rect.height / 2 - containerRect.top;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.backgroundColor = color;
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;

        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 100 + 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        gameContainer.appendChild(particle);

        // Cleanup
        setTimeout(() => particle.remove(), 800);
    }
}

// Initial render
updatePlayerPosition();
