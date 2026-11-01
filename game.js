const ROWS = 12;
const COLUMNS = 18;
const DOUBLE_POINTS_DURATION = 10000;
const WATER_CAN_SPEED = 180;
const WATER_CAN_RESPAWN_DELAY = 10000;
const DONATION_POINTS = 1000;
const FEET_PER_TILE = 25;
const LEVEL_COMPLETE_SOUND_DURATION = 700;
const MUSIC_STEP_DURATION = 0.23;
const MUSIC_SCHEDULE_INTERVAL = 25;
const MUSIC_SCHEDULE_AHEAD = 0.1;
const LEADERBOARD_STORAGE_KEY = 'waterDigAttempts';
const MAX_SAVED_ATTEMPTS = 20;
const SCORE_MILESTONES = [
    { score: 100, message: '100 points! Nice digging, keep it up!' },
    { score: 500, message: '500 points! You are on a roll!' },
    { score: 1000, message: '1,000 points! Arcade champion!' },
    { score: 2500, message: '2,500 points! Incredible work!' },
    { score: 5000, message: '5,000 points! You are a water-digging legend!' }
];
const ARCADE_MUSIC = [
    { melody: 523, bass: 131 },
    { melody: null },
    { melody: 659 },
    { melody: 784 },
    { melody: 659, bass: 131 },
    { melody: null },
    { melody: 523 },
    { melody: 392 },
    { melody: 440, bass: 110 },
    { melody: null },
    { melody: 587 },
    { melody: 659 },
    { melody: 784, bass: 98 },
    { melody: null },
    { melody: 659 },
    { melody: 523 }
];
const ARCADE_NOTES = {
    step: [[520, 360, 0.06, 'square', 0.025]],
    bump: [[150, 90, 0.12, 'square', 0.04]],
    dig: [[180, 75, 0.13, 'sawtooth', 0.045]],
    water: [
        [440, 660, 0.12, 'triangle', 0.05],
        [660, 990, 0.16, 'triangle', 0.05, 0.1],
        [880, 1320, 0.2, 'triangle', 0.045, 0.2]
    ],
    dirty: [[170, 55, 0.24, 'sawtooth', 0.045]],
    ghost: [
        [280, 620, 0.1, 'square', 0.04],
        [620, 280, 0.18, 'square', 0.04, 0.1]
    ],
    hit: [
        [320, 100, 0.18, 'sawtooth', 0.05],
        [180, 60, 0.22, 'square', 0.04, 0.14]
    ],
    donation: [
        [660, 880, 0.12, 'square', 0.05],
        [880, 1320, 0.2, 'square', 0.05, 0.1]
    ],
    gameOver: [
        [440, 330, 0.16, 'square', 0.04],
        [330, 220, 0.2, 'square', 0.04, 0.16],
        [220, 110, 0.3, 'square', 0.04, 0.36]
    ],
    complete: [
        [523, 523, 0.12, 'square', 0.04],
        [659, 659, 0.12, 'square', 0.04, 0.12],
        [784, 784, 0.12, 'square', 0.04, 0.24],
        [1047, 1047, 0.25, 'square', 0.04, 0.36]
    ],
    powerOn: [[660, 990, 0.1, 'square', 0.035]]
};
const DIFFICULTIES = {
    easy: {
        label: 'Easy',
        durationSeconds: 90,
        startingLives: 4,
        ghostStepDelay: 900,
        rockChance: 0.05,
        cleanWaterMultiplier: 1.25,
        dirtyWaterChance: 0.025
    },
    normal: {
        label: 'Normal',
        durationSeconds: 60,
        startingLives: 3,
        ghostStepDelay: 650,
        rockChance: 0.08,
        cleanWaterMultiplier: 1,
        dirtyWaterChance: 0.04
    },
    hard: {
        label: 'Hard',
        durationSeconds: 45,
        startingLives: 2,
        ghostStepDelay: 450,
        rockChance: 0.12,
        cleanWaterMultiplier: 0.75,
        dirtyWaterChance: 0.07
    }
};
const requestedDifficulty = new URLSearchParams(window.location.search).get('difficulty');
const difficultyKey = Object.hasOwn(DIFFICULTIES, requestedDifficulty) ? requestedDifficulty : 'normal';
const requestedLevel = Number(new URLSearchParams(window.location.search).get('level'));
const level = Number.isSafeInteger(requestedLevel) && requestedLevel >= 1
    ? requestedLevel
    : 1;
const levelMultiplier = Math.exp(Math.min(
    (level - 1) * Math.log(1.15),
    Math.log(Number.MAX_VALUE)
));
const baseDifficulty = DIFFICULTIES[difficultyKey];
const difficulty = {
    ...baseDifficulty,
    durationSeconds: Math.max(15, Math.round(baseDifficulty.durationSeconds / levelMultiplier)),
    startingLives: Math.max(1, baseDifficulty.startingLives - Math.floor((level - 1) / 3)),
    ghostStepDelay: Math.max(180, Math.round(baseDifficulty.ghostStepDelay / levelMultiplier)),
    rockChance: Math.min(0.35, baseDifficulty.rockChance * levelMultiplier),
    cleanWaterMultiplier: baseDifficulty.cleanWaterMultiplier / levelMultiplier,
    dirtyWaterChance: Math.min(0.25, baseDifficulty.dirtyWaterChance * levelMultiplier)
};
const DIRECTIONS = {
    up: { row: -1, column: 0 },
    down: { row: 1, column: 0 },
    left: { row: 0, column: -1 },
    right: { row: 0, column: 1 }
};

const board = document.querySelector('#game-board');
const scoreValue = document.querySelector('#score-value');
const gallonsValue = document.querySelector('#gallons-value');
const livesValue = document.querySelector('#lives-value');
const pointsBoostValue = document.querySelector('#points-boost-value');
const depthValue = document.querySelector('#depth-value');
const timeValue = document.querySelector('#time-value');
const message = document.querySelector('#game-message');
const overlay = document.querySelector('#game-overlay');
const endTitle = document.querySelector('#end-title');
const endMessage = document.querySelector('#end-message');
const gameStage = document.querySelector('.game-stage');
const movingWaterCan = document.querySelector('#moving-water-can');
const donationNotice = document.querySelector('#donation-notice');
const gameAlert = document.querySelector('#game-alert');
const difficultyLabel = document.querySelector('#difficulty-label');
const soundToggle = document.querySelector('#sound-toggle');

const worldTiles = new Map();
let audioContext = null;
let soundEnabled = true;
let audioWarningShown = false;
let musicGain = null;
let musicTimer = null;
let musicStopTimeout = null;
let musicStep = 0;
let nextMusicStepTime = 0;
const tileElements = [];
let player = { row: 0, column: 0 };
let playerElement = null;
let facing = 'down';
let playerAnimation = '';
let ghosts = createStartingGhosts();
let score = 0;
let gallons = 0;
let lives = difficulty.startingLives;
let gameIsOver = false;
let nextScoreMilestone = 0;
let isInvulnerable = false;
let playerHasStarted = false;
let hasBeenUnderground = false;
let deepestRow = 0;
let nextGhostColor = 'yellow';
let doublePointsUntil = 0;
let secondsRemaining = difficulty.durationSeconds;
let waterCanX = 0;
let waterCanY = 0;
let previousWaterCanFrame = null;
let waterCanAnimationFrame;
let waterCanPath = [];
let waterCanSegment = 0;
let waterCanSegmentTime = 0;
let waterCanIsActive = true;
let waterCanRespawnTimeout;
let donationNoticeTimeout;
let gameAlertTimeout;
let invulnerabilityTimeout;
let playerAnimationTimeout;
let levelCompleteTimeout;
let ghostTimer;
let gameTimer;

function playTone(context, note, destination = context.destination) {
    const [startFrequency, endFrequency, duration, waveform, volume, delay = 0] = note;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startTime = context.currentTime + delay;

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(startFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
}

function scheduleArcadeMusic() {
    if (!audioContext || !musicGain || !soundEnabled || gameIsOver) {
        return;
    }

    const scheduleUntil = audioContext.currentTime + MUSIC_SCHEDULE_AHEAD;

    while (nextMusicStepTime < scheduleUntil) {
        const step = ARCADE_MUSIC[musicStep];
        const delay = Math.max(0, nextMusicStepTime - audioContext.currentTime);

        if (step.melody) {
            playTone(audioContext, [step.melody, step.melody, 0.19, 'square', 0.12, delay], musicGain);
        }

        if (step.bass) {
            playTone(audioContext, [step.bass, step.bass, 0.75, 'triangle', 0.16, delay], musicGain);
        }

        musicStep = (musicStep + 1) % ARCADE_MUSIC.length;
        nextMusicStepTime += MUSIC_STEP_DURATION;
    }
}

function startArcadeMusic() {
    if (!soundEnabled || gameIsOver || musicTimer !== null) {
        return;
    }

    if (!audioContext) {
        return;
    }

    musicGain = audioContext.createGain();
    musicGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    musicGain.gain.setTargetAtTime(0.65, audioContext.currentTime, 0.12);
    musicGain.connect(audioContext.destination);
    musicStep = 0;
    nextMusicStepTime = audioContext.currentTime + 0.05;
    scheduleArcadeMusic();
    musicTimer = window.setInterval(scheduleArcadeMusic, MUSIC_SCHEDULE_INTERVAL);
}

function stopArcadeMusic() {
    if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
    }

    if (musicGain) {
        const fadingGain = musicGain;
        fadingGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.04);
        musicGain = null;
        window.clearTimeout(musicStopTimeout);
        musicStopTimeout = window.setTimeout(() => {
            fadingGain.disconnect();
        }, 250);
    }
}

function playArcadeSound(name) {
    if (!soundEnabled) {
        return false;
    }

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {
        if (!audioWarningShown) {
            console.warn('Arcade sound is unavailable because this browser does not support Web Audio.');
            audioWarningShown = true;
        }
        return false;
    }

    if (!audioContext) {
        audioContext = new AudioContextConstructor();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch((error) => {
            console.warn('Arcade sound could not be started.', error);
        });
    }

    if (!gameIsOver) {
        startArcadeMusic();
    }

    const notes = ARCADE_NOTES[name];

    if (notes) {
        notes.forEach((note) => playTone(audioContext, note));
        return true;
    }

    return false;
}

soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? 'Sound: On' : 'Sound: Off';
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));

    if (soundEnabled) {
        playArcadeSound('powerOn');
    } else {
        stopArcadeMusic();
    }
});

function createStartingGhosts() {
    return [
        { row: 0, column: -5, color: 'yellow', direction: 1 },
        { row: 0, column: 5, color: 'blue', direction: -1 }
    ];
}

function getTileKey(row, column) {
    return `${row},${column}`;
}

function getWorldTile(row, column) {
    const key = getTileKey(row, column);

    if (!worldTiles.has(key)) {
        let tile;

        if (row <= 0) {
            tile = { type: 'air' };
        } else {
            const chance = Math.random();
            const cleanWaterChance = Math.min(0.18, (0.04 + row * 0.001) * difficulty.cleanWaterMultiplier);

            if (chance < difficulty.rockChance) {
                tile = { type: 'rock' };
            } else if (chance < difficulty.rockChance + cleanWaterChance) {
                tile = { type: 'clean-water', gallons: 100 + Math.floor(Math.random() * 401) };
            } else if (chance < difficulty.rockChance + cleanWaterChance + difficulty.dirtyWaterChance) {
                tile = { type: 'dirty-water' };
            } else {
                tile = { type: 'soil' };
            }
        }

        worldTiles.set(key, tile);
    }

    return worldTiles.get(key);
}

function createBoard() {
    for (let row = 0; row < ROWS; row += 1) {
        tileElements[row] = [];

        for (let column = 0; column < COLUMNS; column += 1) {
            const tile = document.createElement('div');
            tile.className = 'tile tile-air';
            tile.setAttribute('role', 'gridcell');
            tileElements[row][column] = tile;
            board.append(tile);
        }
    }
}

function drawBoard() {
    const topRow = player.row - 4;
    const leftColumn = player.column - Math.floor(COLUMNS / 2);
    playerElement = null;

    for (let screenRow = 0; screenRow < ROWS; screenRow += 1) {
        for (let screenColumn = 0; screenColumn < COLUMNS; screenColumn += 1) {
            const worldRow = topRow + screenRow;
            const worldColumn = leftColumn + screenColumn;
            const tile = tileElements[screenRow][screenColumn];
            const terrainTile = getWorldTile(worldRow, worldColumn);
            tile.className = `tile tile-${terrainTile.type}`;
            tile.dataset.worldRow = worldRow;
            tile.dataset.worldColumn = worldColumn;
            tile.setAttribute('aria-label', getTileLabel(terrainTile.type));
            tile.replaceChildren();

            if (worldRow === 0) {
                tile.classList.add('tile-surface');
            } else if (worldRow < 0) {
                tile.classList.add('tile-sky');
            }

            if (player.row === worldRow && player.column === worldColumn) {
                tile.insertAdjacentHTML('beforeend', `
                    <span class="miner-avatar miner-facing-${facing} ${playerAnimation ? `miner-${playerAnimation}` : ''}" aria-hidden="true">
                        <span class="miner-sprite">
                            <span class="miner-helmet"></span>
                            <span class="miner-face"></span>
                            <span class="miner-body"></span>
                            <span class="miner-arm miner-arm-left"></span>
                            <span class="miner-arm miner-arm-right"></span>
                            <span class="miner-leg miner-leg-left"></span>
                            <span class="miner-leg miner-leg-right"></span>
                            <span class="miner-tool"></span>
                        </span>
                    </span>
                `);
                playerElement = tile.querySelector('.miner-avatar');
            } else {
                const ghost = ghosts.find((character) => character.row === worldRow
                    && character.column === worldColumn);

                if (ghost) {
                    tile.insertAdjacentHTML('beforeend', `
                        <span class="ghost ghost-${ghost.color}" aria-hidden="true">
                            <span class="ghost-eyes"></span>
                        </span>
                    `);
                }
            }
        }
    }

    updateStats();
}

function getTileLabel(type) {
    const labels = {
        air: 'Open space',
        soil: 'Soil',
        rock: 'Rock, cannot be dug',
        'clean-water': 'Clean water pocket',
        'dirty-water': 'Dirty water pocket'
    };

    return labels[type] || type;
}

function updateStats() {
    const livesDisplay = `${'♥ '.repeat(lives).trim()}${'♡ '.repeat(difficulty.startingLives - lives).trim()}`.trim();
    const boostSeconds = Math.max(0, Math.ceil((doublePointsUntil - Date.now()) / 1000));
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = String(secondsRemaining % 60).padStart(2, '0');

    difficultyLabel.textContent = `Level ${level} · ${difficulty.label}`;
    scoreValue.textContent = score;
    gallonsValue.textContent = `${gallons.toLocaleString()} gal`;
    livesValue.textContent = livesDisplay;
    pointsBoostValue.textContent = boostSeconds > 0 ? `2× active · ${boostSeconds}s` : '2× inactive';
    pointsBoostValue.classList.toggle('is-active', boostSeconds > 0);
    depthValue.textContent = `${deepestRow * FEET_PER_TILE} ft`;
    timeValue.textContent = `${minutes}:${seconds}`;
    timeValue.classList.toggle('time-running-low', secondsRemaining <= 10);
}

function checkScoreMilestones() {
    while (nextScoreMilestone < SCORE_MILESTONES.length
        && score >= SCORE_MILESTONES[nextScoreMilestone].score) {
        message.textContent = SCORE_MILESTONES[nextScoreMilestone].message;
        nextScoreMilestone += 1;
    }
}

function animatePlayer(animation, duration) {
    window.clearTimeout(playerAnimationTimeout);
    playerAnimation = animation;
    playerElement.classList.add(`miner-${animation}`);
    playerAnimationTimeout = window.setTimeout(() => {
        playerAnimation = '';
        if (playerElement) {
            playerElement.classList.remove(`miner-${animation}`);
        }
    }, duration);
}

function getRandomWaterCanPoint() {
    const canWidth = movingWaterCan.offsetWidth;
    const canHeight = movingWaterCan.offsetHeight;

    return {
        x: Math.random() * Math.max(0, gameStage.clientWidth - canWidth),
        y: Math.random() * Math.max(0, gameStage.clientHeight - canHeight)
    };
}

function createWaterCanPath() {
    const canWidth = movingWaterCan.offsetWidth;
    const canHeight = movingWaterCan.offsetHeight;
    const stageWidth = gameStage.clientWidth;
    const stageHeight = gameStage.clientHeight;
    const startPoint = waterCanPath.length === 0
        ? { x: 0, y: Math.max(0, stageHeight * 0.35) }
        : getRandomWaterCanPoint();
    const path = [startPoint];
    const maneuvers = 2 + Math.floor(Math.random() * 3);

    for (let maneuver = 0; maneuver < maneuvers; maneuver += 1) {
        const center = getRandomWaterCanPoint();
        const radiusX = Math.min(stageWidth * 0.22, 80 + Math.random() * 100);
        const radiusY = Math.min(stageHeight * 0.2, 45 + Math.random() * 75);
        const makesLoop = Math.random() < 0.5;
        const pointCount = makesLoop ? 5 : 3;
        const startAngle = Math.random() * Math.PI * 2;
        const turnDirection = Math.random() < 0.5 ? 1 : -1;

        for (let point = 0; point < pointCount; point += 1) {
            const angle = startAngle + (point / (pointCount - 1)) * Math.PI * 2 * turnDirection;
            path.push({
                x: Math.max(-canWidth, Math.min(stageWidth, center.x + Math.cos(angle) * radiusX)),
                y: Math.max(-canHeight, Math.min(stageHeight, center.y + Math.sin(angle) * radiusY))
            });
        }
    }

    const exitSide = Math.floor(Math.random() * 4);
    path.push({
        x: exitSide === 1 ? stageWidth + canWidth : exitSide === 3 ? -canWidth : Math.random() * stageWidth,
        y: exitSide === 0 ? -canHeight : exitSide === 2 ? stageHeight + canHeight : Math.random() * stageHeight
    });

    waterCanPath = path;
    waterCanSegment = 0;
    waterCanSegmentTime = 0;
    waterCanX = startPoint.x;
    waterCanY = startPoint.y;
    previousWaterCanFrame = null;
}

function showWaterCan() {
    if (gameIsOver) {
        return;
    }

    waterCanIsActive = true;
    movingWaterCan.hidden = false;
    createWaterCanPath();
    waterCanAnimationFrame = window.requestAnimationFrame(moveWaterCan);
}

function hideWaterCanUntilRespawn() {
    waterCanIsActive = false;
    movingWaterCan.hidden = true;
    window.clearTimeout(waterCanRespawnTimeout);
    waterCanRespawnTimeout = window.setTimeout(showWaterCan, WATER_CAN_RESPAWN_DELAY);
}

function showDonationNotice() {
    donationNotice.hidden = false;
    window.clearTimeout(donationNoticeTimeout);
    donationNoticeTimeout = window.setTimeout(() => {
        donationNotice.hidden = true;
    }, 2500);
}

function showGameAlert(text) {
    gameAlert.textContent = text;
    gameAlert.hidden = false;
    window.clearTimeout(gameAlertTimeout);
    gameAlertTimeout = window.setTimeout(() => {
        gameAlert.hidden = true;
    }, 3000);
}

function moveWaterCan(frameTime) {
    if (gameIsOver || !waterCanIsActive) {
        return;
    }

    const elapsedSeconds = previousWaterCanFrame === null
        ? 0
        : Math.min((frameTime - previousWaterCanFrame) / 1000, 0.05);
    previousWaterCanFrame = frameTime;
    let distanceToTravel = WATER_CAN_SPEED * elapsedSeconds;

    while (distanceToTravel > 0 && waterCanSegment < waterCanPath.length - 1) {
        const start = waterCanPath[waterCanSegment];
        const end = waterCanPath[waterCanSegment + 1];
        const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
        const segmentDuration = segmentLength / WATER_CAN_SPEED;
        const elapsedSegmentTime = Math.min(
            distanceToTravel / WATER_CAN_SPEED,
            segmentDuration - waterCanSegmentTime
        );

        waterCanSegmentTime += elapsedSegmentTime;
        distanceToTravel -= elapsedSegmentTime * WATER_CAN_SPEED;

        const progress = segmentDuration === 0 ? 1 : waterCanSegmentTime / segmentDuration;
        const pointBefore = waterCanPath[Math.max(0, waterCanSegment - 1)];
        const pointAfter = waterCanPath[Math.min(waterCanPath.length - 1, waterCanSegment + 2)];
        const tSquared = progress * progress;
        const tCubed = tSquared * progress;

        waterCanX = 0.5 * (
            2 * start.x
            + (-pointBefore.x + end.x) * progress
            + (2 * pointBefore.x - 5 * start.x + 4 * end.x - pointAfter.x) * tSquared
            + (-pointBefore.x + 3 * start.x - 3 * end.x + pointAfter.x) * tCubed
        );
        waterCanY = 0.5 * (
            2 * start.y
            + (-pointBefore.y + end.y) * progress
            + (2 * pointBefore.y - 5 * start.y + 4 * end.y - pointAfter.y) * tSquared
            + (-pointBefore.y + 3 * start.y - 3 * end.y + pointAfter.y) * tCubed
        );

        if (waterCanSegmentTime >= segmentDuration) {
            waterCanSegment += 1;
            waterCanSegmentTime = 0;
        }
    }

    movingWaterCan.style.transform = `translate3d(${waterCanX}px, ${waterCanY}px, 0)`;

    if (playerElement) {
        const canRect = movingWaterCan.getBoundingClientRect();
        const playerRect = playerElement.getBoundingClientRect();
        const touchedPlayer = canRect.left < playerRect.right
            && canRect.right > playerRect.left
            && canRect.top < playerRect.bottom
            && canRect.bottom > playerRect.top;

        if (touchedPlayer) {
            score += DONATION_POINTS;
            updateStats();
            showDonationNotice();
            playArcadeSound('donation');
            checkScoreMilestones();
            hideWaterCanUntilRespawn();
            return;
        }
    }

    const canHeight = movingWaterCan.offsetHeight;
    const hasLeftStage = waterCanX + movingWaterCan.offsetWidth < 0
        || waterCanX > gameStage.clientWidth
        || waterCanY + canHeight < 0
        || waterCanY > gameStage.clientHeight;

    if (hasLeftStage || waterCanSegment >= waterCanPath.length - 1) {
        hideWaterCanUntilRespawn();
        return;
    }

    waterCanAnimationFrame = window.requestAnimationFrame(moveWaterCan);
}

function movePlayer(directionName) {
    if (gameIsOver) {
        return;
    }

    facing = directionName;
    playerElement.className = `miner-avatar miner-facing-${facing}`;
    const direction = DIRECTIONS[directionName];
    const nextRow = player.row + direction.row;
    const nextColumn = player.column + direction.column;

    if (nextRow < 0) {
        message.textContent = 'You are at the surface. Dig down to explore!';
        playArcadeSound('bump');
        return;
    }

    const nextTile = getWorldTile(nextRow, nextColumn);

    if (nextTile.type === 'rock' || nextTile.type === 'soil'
        || nextTile.type === 'clean-water' || nextTile.type === 'dirty-water') {
        message.textContent = nextTile.type === 'rock'
            ? 'A rock blocks the way. Try another route!'
            : 'That tile is in the way. Face it and press Dig.';
        playArcadeSound('bump');
        return;
    }

    playerHasStarted = true;
    player = { row: nextRow, column: nextColumn };

    if (player.row > 0) {
        hasBeenUnderground = true;
        deepestRow = Math.max(deepestRow, player.row);
    } else if (hasBeenUnderground) {
        drawBoard();
        finishGame(true);
        return;
    }

    message.textContent = player.row === 0
        ? 'Dig down to collect water, then return to this surface!'
        : 'Keep exploring for clean water, and watch out for ghosts!';
    drawBoard();
    animatePlayer('running', 300);
    playArcadeSound('step');
}

function dig() {
    if (gameIsOver) {
        return;
    }

    animatePlayer('digging', 480);
    playerHasStarted = true;
    const direction = DIRECTIONS[facing];
    const targetRow = player.row + direction.row;
    const targetColumn = player.column + direction.column;
    const targetTile = getWorldTile(targetRow, targetColumn);

    if (targetRow <= 0) {
        message.textContent = 'There is no more ground to dig in that direction.';
        return;
    }

    const ghostIndex = ghosts.findIndex((ghost) => ghost.row === targetRow
        && ghost.column === targetColumn);

    if (ghostIndex !== -1) {
        const [defeatedGhost] = ghosts.splice(ghostIndex, 1);
        nextGhostColor = defeatedGhost.color === 'yellow' ? 'blue' : 'yellow';
        score += 20;
        doublePointsUntil = Date.now() + DOUBLE_POINTS_DURATION;
        message.textContent = 'Ghost defeated! Double points are active for 10 seconds!';
        playArcadeSound('ghost');

        if (ghosts.length === 0) {
            spawnNextGhost();
        }

        checkScoreMilestones();
        drawBoard();
        return;
    }

    if (targetTile.type === 'rock') {
        message.textContent = 'Rocks cannot be dug through. Try another route!';
        playArcadeSound('bump');
        return;
    }

    const isDoublePointsActive = Date.now() < doublePointsUntil;

    if (targetTile.type === 'clean-water') {
        gallons += targetTile.gallons;
        score += isDoublePointsActive ? 20 : 10;
        targetTile.type = 'air';
        message.textContent = `Clean water found! +${targetTile.gallons} gallons.`;
        showGameAlert(`Clean water collected! +${targetTile.gallons} gallons.`);
        playArcadeSound('water');
    } else if (targetTile.type === 'dirty-water') {
        const pointsLost = Math.min(score, 100);
        score -= pointsLost;
        targetTile.type = 'air';
        message.textContent = `Dirty water pocket! You lost ${pointsLost} points.`;
        showGameAlert(`Dirty water! Your score went down by ${pointsLost} points.`);
        playArcadeSound('dirty');
    } else {
        targetTile.type = 'air';
        score += isDoublePointsActive ? 20 : 10;
        message.textContent = isDoublePointsActive
            ? 'Double points! Move into the cleared space.'
            : 'Nice digging! Move into the cleared space.';
        playArcadeSound('dig');
    }

    checkScoreMilestones();
    drawBoard();
}

function spawnNextGhost() {
    const spawnColumn = player.column >= 0 ? player.column + 8 : player.column - 8;
    ghosts.push({
        row: 0,
        column: spawnColumn,
        color: nextGhostColor,
        direction: player.column >= 0 ? -1 : 1
    });
    message.textContent += ' Another ghost is approaching from the surface!';
}

function moveGhosts() {
    if (gameIsOver) {
        return;
    }

    for (const ghost of ghosts) {
        let directionOptions = Object.values(DIRECTIONS);

        if (!playerHasStarted) {
            directionOptions = [
                { row: 0, column: ghost.direction },
                { row: 0, column: -ghost.direction },
                DIRECTIONS.down,
                DIRECTIONS.up
            ];
        } else {
            directionOptions = directionOptions.sort((first, second) => {
                const firstDistance = Math.abs(ghost.row + first.row - player.row)
                    + Math.abs(ghost.column + first.column - player.column);
                const secondDistance = Math.abs(ghost.row + second.row - player.row)
                    + Math.abs(ghost.column + second.column - player.column);

                return firstDistance - secondDistance;
            });
        }

        const nextStep = directionOptions.find((direction) => {
            const row = ghost.row + direction.row;
            const column = ghost.column + direction.column;
            const occupiedByGhost = ghosts.some((otherGhost) => otherGhost !== ghost
                && otherGhost.row === row
                && otherGhost.column === column);

            return !occupiedByGhost;
        });

        if (nextStep) {
            ghost.row += nextStep.row;
            ghost.column += nextStep.column;
        }
    }

    const hasCollision = ghosts.some((ghost) => ghost.row === player.row
        && ghost.column === player.column);

    if (hasCollision && playerHasStarted && !isInvulnerable) {
        loseLife();
        return;
    }

    drawBoard();
}

function loseLife(reason = 'A ghost caught you! You lost a life.', restartTimer = false) {
    lives -= 1;

    if (lives === 0) {
        updateStats();
        finishGame(false, `${reason} No lives remain. Your final score is`);
        return;
    }

    playArcadeSound('hit');
    player = { row: 0, column: 0 };
    hasBeenUnderground = false;
    ghosts = createStartingGhosts();
    if (restartTimer) {
        secondsRemaining = difficulty.durationSeconds;
    }
    isInvulnerable = true;
    const minutes = Math.floor(difficulty.durationSeconds / 60);
    const seconds = String(difficulty.durationSeconds % 60).padStart(2, '0');
    const respawnMessage = restartTimer
        ? `You respawned at the surface with ${minutes}:${seconds} to keep playing.`
        : 'You respawned at the surface.';
    message.textContent = `${reason} ${respawnMessage}`;
    drawBoard();
    invulnerabilityTimeout = window.setTimeout(() => {
        isInvulnerable = false;
    }, 1800);
}

function finishGame(completed, reason = '') {
    if (gameIsOver) {
        return;
    }

    gameIsOver = true;
    stopArcadeMusic();
    const hasCompletionSound = completed && playArcadeSound('complete');
    if (!completed) {
        playArcadeSound('gameOver');
    }
    window.clearInterval(ghostTimer);
    window.clearInterval(gameTimer);
    window.cancelAnimationFrame(waterCanAnimationFrame);
    window.clearTimeout(waterCanRespawnTimeout);
    window.clearTimeout(donationNoticeTimeout);
    window.clearTimeout(gameAlertTimeout);

    // Keep a small history of this player's runs in this browser.
    try {
        const savedAttempts = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]');
        const attempts = Array.isArray(savedAttempts) ? savedAttempts : [];
        const depthInFeet = deepestRow * FEET_PER_TILE;
        const peopleHelped = Math.floor(gallons / 100);

        attempts.push({
            playedAt: new Date().toISOString(),
            difficulty: difficultyKey,
            level,
            completed,
            depth: depthInFeet,
            people: peopleHelped,
            score,
            gallons
        });
        localStorage.setItem(
            LEADERBOARD_STORAGE_KEY,
            JSON.stringify(attempts.slice(-MAX_SAVED_ATTEMPTS))
        );
    } catch (error) {
        console.warn('This run could not be saved to the local leaderboard.', error);
    }

    if (completed) {
        const depthInFeet = deepestRow * FEET_PER_TILE;
        const peopleHelped = Math.floor(gallons / 100);
        const successUrl = `success.html?depth=${depthInFeet}&people=${peopleHelped}&score=${score}&gallons=${gallons}&difficulty=${difficultyKey}&level=${level}`;

        if (hasCompletionSound) {
            levelCompleteTimeout = window.setTimeout(() => {
                window.location.href = successUrl;
            }, LEVEL_COMPLETE_SOUND_DURATION);
        } else {
            window.location.href = successUrl;
        }
        return;
    }

    endTitle.textContent = secondsRemaining === 0 ? "Time's up!" : 'Game over';
    endMessage.textContent = `${reason} ${score}.`;
    updateStats();
    overlay.hidden = false;
}

function resetGame() {
    stopArcadeMusic();
    window.clearInterval(ghostTimer);
    window.clearInterval(gameTimer);
    window.cancelAnimationFrame(waterCanAnimationFrame);
    window.clearTimeout(waterCanRespawnTimeout);
    window.clearTimeout(donationNoticeTimeout);
    window.clearTimeout(gameAlertTimeout);
    window.clearTimeout(invulnerabilityTimeout);
    window.clearTimeout(playerAnimationTimeout);
    window.clearTimeout(levelCompleteTimeout);

    worldTiles.clear();
    player = { row: 0, column: 0 };
    playerElement = null;
    facing = 'down';
    playerAnimation = '';
    ghosts = createStartingGhosts();
    score = 0;
    gallons = 0;
    lives = difficulty.startingLives;
    gameIsOver = false;
    nextScoreMilestone = 0;
    isInvulnerable = false;
    playerHasStarted = false;
    hasBeenUnderground = false;
    deepestRow = 0;
    nextGhostColor = 'yellow';
    doublePointsUntil = 0;
    secondsRemaining = difficulty.durationSeconds;
    if (soundEnabled) {
        playArcadeSound('powerOn');
    }
    waterCanX = 0;
    waterCanY = 0;
    previousWaterCanFrame = null;
    waterCanPath = [];
    waterCanSegment = 0;
    waterCanSegmentTime = 0;
    waterCanIsActive = true;

    overlay.hidden = true;
    donationNotice.hidden = true;
    gameAlert.hidden = true;
    movingWaterCan.hidden = false;
    message.textContent = `Level ${level} · ${difficulty.label}: ${Math.floor(difficulty.durationSeconds / 60)}:${String(difficulty.durationSeconds % 60).padStart(2, '0')} per life and ${difficulty.startingLives} lives. Dig for clean water and return to the surface!`;
    drawBoard();
    createWaterCanPath();

    ghostTimer = window.setInterval(moveGhosts, difficulty.ghostStepDelay);
    gameTimer = window.setInterval(countDown, 1000);
    waterCanAnimationFrame = window.requestAnimationFrame(moveWaterCan);
}

function countDown() {
    if (gameIsOver) {
        return;
    }

    secondsRemaining -= 1;
    updateStats();

    if (secondsRemaining <= 0) {
        secondsRemaining = 0;
        loseLife('Time ran out! You lost a life.', true);
    }
}

document.addEventListener('keydown', (event) => {
    if (event.target instanceof Element
        && event.target.closest('button, a, input, select, textarea')) {
        return;
    }

    const directionName = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right'
    }[event.key];

    if (directionName) {
        event.preventDefault();
        movePlayer(directionName);
    } else if (event.code === 'Space') {
        event.preventDefault();
        dig();
    }
});

document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('click', () => movePlayer(button.dataset.direction));
});

document.querySelector('#dig-button').addEventListener('click', dig);
document.querySelectorAll('[data-reset-game]').forEach((button) => {
    button.addEventListener('click', resetGame);
});

createBoard();
message.textContent = `Level ${level} · ${difficulty.label}: ${Math.floor(difficulty.durationSeconds / 60)}:${String(difficulty.durationSeconds % 60).padStart(2, '0')} per life and ${difficulty.startingLives} lives. Dig for clean water and return to the surface!`;
drawBoard();
createWaterCanPath();
ghostTimer = window.setInterval(moveGhosts, difficulty.ghostStepDelay);
gameTimer = window.setInterval(countDown, 1000);
waterCanAnimationFrame = window.requestAnimationFrame(moveWaterCan);
