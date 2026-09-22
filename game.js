const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuOverlay =
  document.getElementById("menuOverlay");

const startButton =
  document.getElementById("startButton");

const muteButton =
  document.getElementById("muteButton");

const volumeSlider =
  document.getElementById("volumeSlider");

const volumeValue =
  document.getElementById("volumeValue");

const pauseOverlay =
  document.getElementById("pauseOverlay");

const resumeButton =
  document.getElementById("resumeButton");

const restartButton =
  document.getElementById("restartButton");

const mainMenuButton =
  document.getElementById("mainMenuButton");

const pauseVolumeSlider =
  document.getElementById("pauseVolumeSlider");

const pauseVolumeValue =
  document.getElementById("pauseVolumeValue");

const gameOverOverlay =
  document.getElementById(
    "gameOverOverlay"
  );

const gameOverTitle =
  document.getElementById(
    "gameOverTitle"
  );

const finalScore =
  document.getElementById(
    "finalScore"
  );

const playAgainButton =
  document.getElementById(
    "playAgainButton"
  );

const gameOverMenuButton =
  document.getElementById(
    "gameOverMenuButton"
  );

const shakeButton =
  document.getElementById(
    "shakeButton"
  );

const pauseShakeButton =
  document.getElementById(
    "pauseShakeButton"
  );

  const pauseMuteButton =
  document.getElementById("pauseMuteButton");

  const difficultyButtons =
  document.querySelectorAll(
    ".difficultyButton"
  );

  const DIFFICULTIES = {

  easy: {
    speed: 125,
    deadZone: 40
  },

  normal: {
    speed: 162,
    deadZone: 25
  },

  hard: {
    speed: 220,
    deadZone: 14
  }

};

let selectedDifficulty = "normal";

// =====================================================
// GAME STATES
// =====================================================

const GameState = Object.freeze({
  MENU: "menu",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "gameOver"
});

let gameState = GameState.MENU;

let stateBeforePause =
  GameState.PLAYING;


// =====================================================
// GAME SETTINGS
// =====================================================

const WINNING_SCORE = 5;

// These are now PIXELS PER SECOND
const START_BALL_SPEED_X = 180;
const START_BALL_SPEED_Y = 120;

const BALL_ACCELERATION = 1.05;
const MAX_BALL_SPEED = 480;

const MAX_BOUNCE_ANGLE =
  Math.PI / 3;

const SCORE_FLASH_FADE_SPEED =
  1.5;


// =====================================================
// SCORE / SERVE
// =====================================================

let playerScore = 0;
let computerScore = 0;

let serveDirection = 1;

let countdown = 3;
let countdownTimer = 3;

let rallyCount = 0;
let bestRally = 0;

// =====================================================
// AUDIO
// =====================================================

let audioContext = null;

let masterVolume = 0.6;
let muted = false;
const SOUND_BOOST = 10;


async function unlockAudio() {

  if (!audioContext) {

    audioContext =
      new (
        window.AudioContext ||
        window.AudioContext
      )();
  }


  if (
    audioContext.state === "suspended"
  ) {

    try {

      await audioContext.resume();

    } catch (error) {

      console.log(
        "Audio could not resume."
      );
    }
  }
}


function playTone(
  frequency,
  duration,
  volume = 0.02,
  pan = 0
) {

  if (
    !audioContext ||
    audioContext.state !== "running" ||
    muted
  ) {
    return;
  }


  const finalVolume =
    volume *
    masterVolume *
    SOUND_BOOST;

  const oscillator =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();


  const now =
    audioContext.currentTime;


  oscillator.type = "sine";

  oscillator.frequency.value =
    frequency;


  gain.gain.setValueAtTime(
    0.0001,
    now
  );


  gain.gain.linearRampToValueAtTime(
    finalVolume,
    now + 0.01
  );


  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );


  oscillator.connect(gain);


  // Stereo sound
  if (audioContext.createStereoPanner) {

    const panner =
      audioContext.createStereoPanner();

    panner.pan.value = pan;

    gain.connect(panner);

    panner.connect(
      audioContext.destination
    );

  } else {

    gain.connect(
      audioContext.destination
    );
  }


  oscillator.start(now);

  oscillator.stop(
    now + duration
  );
}


// =====================================================
// VISUAL EFFECTS
// =====================================================

let scoreFlash = 0;

let scoreFlashText = "";

let screenFlash = 0;

let shakeTime = 0;
let shakeStrength = 0;

let screenShakeEnabled = true;

const particles = [];


function triggerScoreFlash(text) {

  scoreFlash = 1;

  scoreFlashText = text;
}


function updateEffects(deltaTime) {

  // Score message fade
  if (scoreFlash > 0) {

    scoreFlash -=
      SCORE_FLASH_FADE_SPEED *
      deltaTime;

    scoreFlash =
      Math.max(0, scoreFlash);
  }


  // Screen flash fade
  if (screenFlash > 0) {

    screenFlash -=
      2.5 * deltaTime;

    screenFlash =
      Math.max(0, screenFlash);
  }


  // Screen shake timer
  if (shakeTime > 0) {

    shakeTime -= deltaTime;

    if (shakeTime <= 0) {

      shakeTime = 0;
      shakeStrength = 0;
    }
  }


  // Particles
  for (
    let i = particles.length - 1;
    i >= 0;
    i--
  ) {

    const particle =
      particles[i];


    particle.x +=
      particle.speedX *
      deltaTime;


    particle.y +=
      particle.speedY *
      deltaTime;


    particle.life -=
      deltaTime;


    if (
      particle.life <= 0
    ) {

      particles.splice(
        i,
        1
      );
    }
  }
}

function createImpactParticles(
  x,
  y
) {

  for (
    let i = 0;
    i < 8;
    i++
  ) {

    const angle =
      Math.random() *
      Math.PI *
      2;


    const speed =
      70 +
      Math.random() *
      100;


    particles.push({

      x: x,

      y: y,

      speedX:
        Math.cos(angle) *
        speed,

      speedY:
        Math.sin(angle) *
        speed,

      life:
        0.25 +
        Math.random() *
        0.15,

      maxLife: 0.4,

      size:
        2 +
        Math.random() *
        2
    });
  }
}


function triggerShake(
  strength,
  duration
) {

  if (!screenShakeEnabled) {
    return;
  }

  shakeStrength =
    strength;

  shakeTime =
    duration;
}


function triggerScoreEffect() {

  screenFlash = 0.18;

  triggerShake(
    4,
    0.1
  );
}


function drawParticles() {

  for (
    const particle
    of particles
  ) {

    const alpha =

      particle.life /
      particle.maxLife;


    ctx.save();


    ctx.globalAlpha =
      alpha;


    ctx.fillStyle =
      "white";


    ctx.beginPath();


    ctx.arc(
      particle.x,
      particle.y,
      particle.size,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.restore();
  }
}

function drawPaddle(
  paddle
) {

  ctx.save();


  ctx.fillStyle =
    "white";


  ctx.shadowColor =
    "rgba(255,255,255,0.45)";

  ctx.shadowBlur = 12;


  ctx.fillRect(
    paddle.x,
    paddle.y,
    paddle.width,
    paddle.height
  );


  ctx.restore();
}

function drawScreenFlash() {

  if (
    screenFlash <= 0
  ) {
    return;
  }


  ctx.save();


  ctx.globalAlpha =
    screenFlash;


  ctx.fillStyle =
    "white";


  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  ctx.restore();
}

// =====================================================
// PLAYER
// =====================================================

const player = {

  x: 20,

  y:
    canvas.height / 2 -
    50,

  width: 15,

  height: 100,

  // 6 pixels/frame at ~60 FPS
  // becomes about 360 pixels/sec
  speed: 360
};


// =====================================================
// COMPUTER
// =====================================================

const computer = {

  x:
    canvas.width - 35,

  y:
    canvas.height / 2 - 45,

  width: 15,

  height: 90,

  speed: 162,

  returnSpeed: 60,

  deadZone: 25
};

function applyDifficulty() {

  const settings =
    DIFFICULTIES[
      selectedDifficulty
    ];


  computer.speed =
    settings.speed;


  computer.deadZone =
    settings.deadZone;
}

function syncAudioUI() {

  const volumePercent =
    Math.round(
      masterVolume * 100
    );


  volumeSlider.value =
    volumePercent;

  pauseVolumeSlider.value =
    volumePercent;


  volumeValue.textContent =
    volumePercent + "%";

  pauseVolumeValue.textContent =
    volumePercent + "%";


  const muteText =
    muted
      ? "Unmute"
      : "Mute";


  muteButton.textContent =
    muteText;

  pauseMuteButton.textContent =
    muteText;
}


function syncShakeUI() {

  const shakeText =
    screenShakeEnabled
      ? "Screen Shake: On"
      : "Screen Shake: Off";


  shakeButton.textContent =
    shakeText;

  pauseShakeButton.textContent =
    shakeText;
}


// -------------------------
// DIFFICULTY BUTTONS
// -------------------------

difficultyButtons.forEach(
  function (button) {

    button.addEventListener(
      "click",
      function () {

        selectedDifficulty =
          button.dataset.difficulty;


        difficultyButtons.forEach(
          function (otherButton) {

            otherButton.classList.remove(
              "selected"
            );
          }
        );


        button.classList.add(
          "selected"
        );


        applyDifficulty();
      }
    );
  }
);


// -------------------------
// VOLUME SLIDER
// -------------------------

volumeSlider.addEventListener(
  "input",
  function () {

    masterVolume =
      Number(
        volumeSlider.value
      ) / 100;


    if (
      masterVolume > 0
    ) {

      muted = false;
    }


    syncAudioUI();
  }
);


// -------------------------
// MUTE BUTTON
// -------------------------

muteButton.addEventListener(
  "click",
  async function () {

    await unlockAudio();

    muted = !muted;

    syncAudioUI();
  }
);


// -------------------------
// START BUTTON
// -------------------------

startButton.addEventListener(
  "click",
  async function () {

    await unlockAudio();

    beginMatch();
  }
);


syncAudioUI();
applyDifficulty();
syncShakeUI();

// =====================================================
// BALL
// =====================================================

const ball = {

  x:
    canvas.width / 2,

  y:
    canvas.height / 2,

  radius: 10,

  speedX: 0,

  speedY: 0
};


// =====================================================
// KEYBOARD STATE
// =====================================================

const keys = {

  w: false,
  s: false
};


// =====================================================
// KEYBOARD INPUT
// =====================================================

document.addEventListener(
  "keydown",
  function (event) {

    unlockAudio();

    const key =
      event.key.toLowerCase();


    // -------------------------
    // START / RESTART
    // -------------------------

    if (
      event.code === "Space" &&
      (
        gameState === GameState.MENU ||
        gameState === GameState.GAME_OVER
      )
    ) {

      event.preventDefault();

      beginMatch();

      return;
    }


    // -------------------------
    // PAUSE
    // -------------------------

    if (key === "p") {

      if (
        gameState === GameState.PLAYING ||
        gameState === GameState.COUNTDOWN
      ) {

        pauseGame();

      } else if (
        gameState === GameState.PAUSED
      ) {

        resumeGame();
      }

      return;
    }


    // -------------------------
    // VOLUME UP
    // -------------------------

    if (
      key === "+" ||
      key === "="
    ) {

      masterVolume =
        Math.min(
          1,
          masterVolume + 0.1
        );

      muted = false;

      syncAudioUI();

      return;
    }


    // -------------------------
    // VOLUME DOWN
    // -------------------------

    if (key === "-") {

      masterVolume =
        Math.max(
          0,
          masterVolume - 0.1
        );

      syncAudioUI();

      return;
    }


    // -------------------------
    // MUTE
    // -------------------------

    if (key === "m") {

      muted = !muted;

      syncAudioUI();

      return;
    }


    // -------------------------
    // MOVEMENT
    // -------------------------

    if (key === "w") {

      event.preventDefault();

      keys.w = true;
    }


    if (key === "s") {

      event.preventDefault();

      keys.s = true;
    }

  }
);


// =====================================================
// KEY RELEASE
// =====================================================

document.addEventListener(
  "keyup",
  function (event) {

    const key =
      event.key.toLowerCase();


    if (key === "w") {

      keys.w = false;
    }


    if (key === "s") {

      keys.s = false;
    }

  }
);


// Mouse/touch interaction
// can also unlock sound.

document.addEventListener(
  "pointerdown",
  unlockAudio
);


// Automatically pause if
// the browser loses focus.

window.addEventListener(
  "blur",
  function () {

    keys.w = false;
    keys.s = false;


    if (
      gameState ===
        GameState.PLAYING ||

      gameState ===
        GameState.COUNTDOWN
    ) {

      pauseGame();
    }

  }
);


// =====================================================
// START NEW MATCH
// =====================================================

function startNewGame() {

  // Reset score
  playerScore = 0;
  computerScore = 0;

  // Reset serving
  serveDirection = 1;

  // Reset rally statistics
  rallyCount = 0;
  bestRally = 0;

  // Reset visual effects
  scoreFlash = 0;
  screenFlash = 0;

  shakeTime = 0;
  shakeStrength = 0;

  particles.length = 0;

  // Make sure movement keys
  // aren't stuck down
  keys.w = false;
  keys.s = false;

  resetBall();
}


// =====================================================
// BEGIN MATCH
// =====================================================

function beginMatch() {

  menuOverlay.classList.add(
    "hidden"
  );

  pauseOverlay.classList.add(
    "hidden"
  );

  gameOverOverlay.classList.add(
    "hidden"
  );

  keys.w = false;
  keys.s = false;

  applyDifficulty();

  startNewGame();
}

// =====================================================
// RESET BALL
// =====================================================

function resetBall() {

  ball.x =
    canvas.width / 2;

  ball.y =
    canvas.height / 2;


  ball.speedX = 0;

  ball.speedY = 0;


  // Reset paddles

  player.y =
    canvas.height / 2 -
    player.height / 2;


  computer.y =
    canvas.height / 2 -
    computer.height / 2;


  countdown = 3;

  countdownTimer = 3;


  gameState =
    GameState.COUNTDOWN;

  rallyCount = 0;
}


// =====================================================
// LAUNCH BALL
// =====================================================

function launchBall() {

  ball.speedX =
    START_BALL_SPEED_X *
    serveDirection;


  // Next serve goes
  // the other direction.

  serveDirection *= -1;


  // Random vertical direction.

  ball.speedY =
    Math.random() < 0.5
      ? START_BALL_SPEED_Y
      : -START_BALL_SPEED_Y;


  gameState =
    GameState.PLAYING;
}


// =====================================================
// MAIN MENU
// =====================================================

function returnToMainMenu() {

  // Hide other overlays
  pauseOverlay.classList.add(
    "hidden"
  );

  gameOverOverlay.classList.add(
    "hidden"
  );


  // Stop gameplay
  gameState =
    GameState.MENU;

  ball.speedX = 0;
  ball.speedY = 0;


  // Clear keyboard input
  keys.w = false;
  keys.s = false;


  // Stop any remaining shake
  shakeTime = 0;
  shakeStrength = 0;


  // Show main menu
  menuOverlay.classList.remove(
    "hidden"
  );
}


// =====================================================
// PAUSE GAME  
// =====================================================

function pauseGame() {

  stateBeforePause =
    gameState;

  gameState =
    GameState.PAUSED;

  pauseOverlay.classList.remove(
    "hidden"
  );

  syncAudioUI();
  syncShakeUI();
}


// =====================================================
// RESUME GAME  
// =====================================================

function resumeGame() {

  pauseOverlay.classList.add(
    "hidden"
  );

  gameState =
    stateBeforePause;
}

// =====================================================
// GAME OVER
// =====================================================

function endGame() {

  gameState =
    GameState.GAME_OVER;

  ball.speedX = 0;
  ball.speedY = 0;


  if (
    playerScore >
    computerScore
  ) {

    gameOverTitle.textContent =
      "YOU WIN!";

    playTone(
      420,
      0.3,
      0.025
    );

  } else {

    gameOverTitle.textContent =
      "COMPUTER WINS";

    playTone(
      130,
      0.3,
      0.02
    );
  }


  finalScore.textContent =
    "Final Score: " +
    playerScore +
    " - " +
    computerScore;


  gameOverOverlay.classList.remove(
    "hidden"
  );
}

// =====================================================
// UPDATE GAME
// =====================================================

function update(deltaTime) {

  updateEffects(
    deltaTime
  );


  if (
    gameState === GameState.MENU ||
    gameState === GameState.PAUSED ||
    gameState === GameState.GAME_OVER
  ) {

    return;
  }


  // Player can move during
  // countdown and gameplay.

  updatePlayer(
    deltaTime
  );


  // -------------------------
  // COUNTDOWN
  // -------------------------

  if (
    gameState === GameState.COUNTDOWN
  ) {

    updateCountdown(
      deltaTime
    );

    return;
  }


  // -------------------------
  // PLAYING
  // -------------------------

  updateBall(
    deltaTime
  );


  updateComputer(
    deltaTime
  );


  checkPaddleCollisions();

  checkScoring();
}


// =====================================================
// PLAYER MOVEMENT
// =====================================================

function updatePlayer(deltaTime) {

  if (keys.w) {

    player.y -=
      player.speed *
      deltaTime;
  }


  if (keys.s) {

    player.y +=
      player.speed *
      deltaTime;
  }


  // Keep paddle inside canvas.

  const courtMargin = 10;

  player.y =
    Math.max(
      courtMargin,

      Math.min(
        canvas.height -
          courtMargin -
          player.height,

        player.y
      )
    );
}


// =====================================================
// COUNTDOWN
// =====================================================

function updateCountdown(
  deltaTime
) {

  countdownTimer -=
    deltaTime;


  if (
    countdownTimer <= 0
  ) {

    countdown = 0;

    launchBall();

    return;
  }


  countdown =
    Math.ceil(
      countdownTimer
    );
}


// =====================================================
// BALL MOVEMENT
// =====================================================

function updateBall(
  deltaTime
) {

  ball.x +=
    ball.speedX *
    deltaTime;


  ball.y +=
    ball.speedY *
    deltaTime;


  // -------------------------
  // TOP WALL
  // -------------------------

  if (
    ball.y -
      ball.radius <= 0
  ) {

    ball.y =
      ball.radius;


    ball.speedY =
      Math.abs(
        ball.speedY
      );


    playTone(
      140,
      0.04,
      0.008
    );
  }


  // -------------------------
  // BOTTOM WALL
  // -------------------------

  if (
    ball.y +
      ball.radius >=
      canvas.height
  ) {

    ball.y =
      canvas.height -
      ball.radius;


    ball.speedY =
      -Math.abs(
        ball.speedY
      );


    playTone(
      140,
      0.04,
      0.008
    );
  }
}


// =====================================================
// COMPUTER AI
// =====================================================

function updateComputer(
  deltaTime
) {

  const computerCenter =

    computer.y +
    computer.height / 2;


  // Ball coming toward computer

  if (
    ball.speedX > 0
  ) {

    if (
      computerCenter <
      ball.y - computer.deadZone
    ) {

      computer.y +=
        computer.speed *
        deltaTime;
    }


    else if (
      computerCenter >
      ball.y + computer.deadZone
    ) {

      computer.y -=
        computer.speed *
        deltaTime;
    }

  }


  // Ball moving away:
  // return toward center.

  else {

    const centerOfScreen =
      canvas.height / 2;


    if (
      computerCenter <
      centerOfScreen - 20
    ) {

      computer.y +=
        computer.returnSpeed *
        deltaTime;
    }


    else if (
      computerCenter >
      centerOfScreen + 20
    ) {

      computer.y -=
        computer.returnSpeed *
        deltaTime;
    }

  }


  // Keep AI inside canvas.

  const courtMargin = 10;

  computer.y =
    Math.max(
      courtMargin,

      Math.min(
        canvas.height -
          courtMargin -
          computer.height,

        computer.y
      )
    );
}


// =====================================================
// PADDLE COLLISIONS
// =====================================================

function checkPaddleCollisions() {

  // -------------------------
  // PLAYER
  // -------------------------

  if (
    ball.x -
      ball.radius <=
      player.x +
      player.width &&

    ball.x +
      ball.radius >=
      player.x &&

    ball.y +
      ball.radius >=
      player.y &&

    ball.y -
      ball.radius <=
      player.y +
      player.height &&

    ball.speedX < 0
  ) {

    // Push ball outside paddle
    // to prevent sticking.

    ball.x =
      player.x +
      player.width +
      ball.radius;


    bounceFromPaddle(
      player,
      1
    );

    registerPaddleHit();

    playTone(
      220,
      0.07,
      0.018,
      -0.5
    );

    createImpactParticles(
      ball.x,
      ball.y
    );

    triggerShake(
      2.5,
      0.08
    );
  }


  // -------------------------
  // COMPUTER
  // -------------------------

  if (
    ball.x + ball.radius >= computer.x &&
    ball.x - ball.radius <=
        computer.x + computer.width &&

    ball.y + ball.radius >= computer.y &&
    ball.y - ball.radius <=
        computer.y + computer.height &&

    ball.speedX > 0
  ) {

    ball.x =
        computer.x -
        ball.radius;


    bounceFromPaddle(
        computer,
        -1
    );
    
    registerPaddleHit();


    playTone(
        260,
        0.07,
        0.018,
        0.5
    );


    createImpactParticles(
        ball.x,
        ball.y
    );


    triggerShake(
        1.5,
        0.05
    );
  }
}

// =====================================================
// PADDLE BOUNCE PHYSICS
// =====================================================

function bounceFromPaddle(
  paddle,
  horizontalDirection
) {

  const paddleCenter =

    paddle.y +
    paddle.height / 2;


  let hitPosition =

    (
      paddleCenter -
      ball.y
    ) /

    (
      paddle.height / 2
    );


  // Keep value safely between
  // -1 and +1.

  hitPosition =
    Math.max(
      -1,

      Math.min(
        1,
        hitPosition
      )
    );


  const bounceAngle =

    hitPosition *
    MAX_BOUNCE_ANGLE;


  // Current total speed

  let speed =
    Math.hypot(
      ball.speedX,
      ball.speedY
    );


  // Increase rally speed

  speed *=
    BALL_ACCELERATION;


  // Apply maximum

  speed =
    Math.min(
      speed,
      MAX_BALL_SPEED
    );


  ball.speedX =

    horizontalDirection *
    speed *
    Math.cos(
      bounceAngle
    );


  ball.speedY =

    -speed *
    Math.sin(
      bounceAngle
    );
}


// =====================================================
// SCORING
// =====================================================

function checkScoring() {

  // -------------------------
  // COMPUTER SCORES
  // -------------------------

  if (
    ball.x +
      ball.radius < 0
  ) {

    computerScore++;


    triggerScoreFlash(
      "COMPUTER SCORES!"
    );

    triggerScoreEffect();

    playTone(
      180,
      0.18,
      0.02,
      0.2
    );


    if (
      computerScore >=
      WINNING_SCORE
    ) {

      endGame();

    } else {

      resetBall();
    }


    return;
  }


  // -------------------------
  // PLAYER SCORES
  // -------------------------

  if (
    ball.x -
      ball.radius >
      canvas.width
  ) {

    playerScore++;


    triggerScoreFlash(
      "YOU SCORE!"
    );

    triggerScoreEffect();


    playTone(
      350,
      0.18,
      0.025,
      -0.2
    );


    if (
      playerScore >=
      WINNING_SCORE
    ) {

      endGame();

    } else {

      resetBall();
    }
  }
}


// =====================================================
// DRAW BALL
// =====================================================

function drawBall() {

  ctx.save();


  ctx.fillStyle =
    "white";


  ctx.shadowColor =
    "rgba(255,255,255,0.7)";

  ctx.shadowBlur = 16;


  ctx.beginPath();


  ctx.arc(
    ball.x,
    ball.y,
    ball.radius,
    0,
    Math.PI * 2
  );


  ctx.fill();


  ctx.restore();
}


// =====================================================
// CENTER LINE
// =====================================================

function drawCourt() {

  // Court background

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      canvas.height
    );


  gradient.addColorStop(
    0,
    "#0d0d10"
  );

  gradient.addColorStop(
    1,
    "#050506"
  );


  ctx.fillStyle =
    gradient;


  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  // Outer court border

  ctx.strokeStyle =
    "rgba(255,255,255,0.12)";

  ctx.lineWidth = 2;


  ctx.strokeRect(
    10,
    10,
    canvas.width - 20,
    canvas.height - 20
  );


  // Center line

  ctx.strokeStyle =
    "rgba(255,255,255,0.35)";


  ctx.setLineDash(
    [10, 15]
  );


  ctx.beginPath();


  ctx.moveTo(
    canvas.width / 2,
    10
  );


  ctx.lineTo(
    canvas.width / 2,
    canvas.height - 10
  );


  ctx.stroke();


  ctx.setLineDash([]);


  // Center circle

  ctx.strokeStyle =
    "rgba(255,255,255,0.10)";


  ctx.beginPath();


  ctx.arc(
    canvas.width / 2,
    canvas.height / 2,
    70,
    0,
    Math.PI * 2
  );


  ctx.stroke();
}


// =====================================================
// SCORE
// =====================================================

function drawScore() {

  ctx.fillStyle =
    "white";


  ctx.font =
    "40px Arial";


  ctx.textAlign =
    "center";


  ctx.fillText(
    playerScore,
    canvas.width / 4,
    50
  );


  ctx.fillText(
    computerScore,
    canvas.width * 3 / 4,
    50
  );
}


// =====================================================
// COUNTDOWN
// =====================================================

function drawCountdown() {

  if (
    gameState !==
    GameState.COUNTDOWN
  ) {

    return;
  }


  ctx.fillStyle =
    "white";


  ctx.font =
    "60px Arial";


  ctx.textAlign =
    "center";


  ctx.fillText(
    countdown,
    canvas.width / 2,
    canvas.height / 2 - 50
  );
}


// =====================================================
// SCORE FLASH
// =====================================================

function drawScoreFlash() {

  if (
    scoreFlash <= 0
  ) {

    return;
  }


  ctx.save();


  ctx.globalAlpha =
    scoreFlash;


  ctx.fillStyle =
    "white";


  ctx.font =
    "28px Arial";


  ctx.textAlign =
    "center";


  ctx.fillText(
    scoreFlashText,
    canvas.width / 2,
    90
  );


  ctx.restore();
}


// =====================================================
// VOLUME DISPLAY
// =====================================================

function drawVolume() {

  ctx.textAlign =
    "right";


  ctx.font =
    "16px Arial";


  ctx.fillStyle =
    "rgba(255,255,255,0.6)";


  const text =

    muted

      ? "VOL: MUTED"

      : "VOL: " +
        Math.round(
          masterVolume *
          100
        ) +
        "%";


  ctx.fillText(
    text,
    canvas.width - 20,
    canvas.height - 20
  );
}


// =====================================================
// DRAW EVERYTHING
// =====================================================

function draw() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  // -------------------------
  // GAME WORLD
  // -------------------------

  ctx.save();


  if (
    shakeTime > 0
  ) {

    const shakeX =

      (
        Math.random() * 2 - 1
      ) *
      shakeStrength;


    const shakeY =

      (
        Math.random() * 2 - 1
      ) *
      shakeStrength;


    ctx.translate(
      shakeX,
      shakeY
    );
  }


  drawCourt();

  drawScore();


  drawPaddle(
    player
  );


  drawPaddle(
    computer
  );


  drawBall();

  drawParticles();

  drawCountdown();

  drawScoreFlash();


  ctx.restore();


  // -------------------------
  // SCREEN EFFECTS
  // -------------------------

  drawScreenFlash();

  drawVolume();
  drawMatchInfo();

}


// =====================================================
// FRAME-RATE-INDEPENDENT GAME LOOP
// =====================================================

let lastTime = 0;


function gameLoop(currentTime) {

  if (lastTime === 0) {

    lastTime =
      currentTime;
  }


  let deltaTime =

    (
      currentTime -
      lastTime
    ) /

    1000;


  lastTime =
    currentTime;


  // Prevent enormous movement jumps
  // after lag or changing browser tabs.

  deltaTime =
    Math.min(
      deltaTime,
      1 / 30
    );


  update(
    deltaTime
  );


  draw();


  requestAnimationFrame(
    gameLoop
  );
}


// =====================================================
// BUTTON LISTENERS
// =====================================================

resumeButton.addEventListener(
  "click",
  function () {

    resumeGame();
  }
);


restartButton.addEventListener(
  "click",
  function () {

    pauseOverlay.classList.add(
      "hidden"
    );

    startNewGame();
  }
);


mainMenuButton.addEventListener(
  "click",
  function () {

    returnToMainMenu();
  }
);

pauseVolumeSlider.addEventListener(
  "input",
  function () {

    masterVolume =
      Number(
        pauseVolumeSlider.value
      ) / 100;

    if (masterVolume > 0) {
      muted = false;
    }

    syncAudioUI();
  }
);

pauseMuteButton.addEventListener(
  "click",
  async function () {

    await unlockAudio();

    muted = !muted;

    syncAudioUI();
  }
);

playAgainButton.addEventListener(
  "click",
  function () {

    gameOverOverlay.classList.add(
      "hidden"
    );

    startNewGame();
  }
);


gameOverMenuButton.addEventListener(
  "click",
  function () {

    returnToMainMenu();
  }
);


pauseShakeButton.addEventListener(
  "click",
  function () {

    toggleScreenShake();
  }
);

shakeButton.addEventListener(
  "click",
  function () {

    toggleScreenShake();
  }
);

function registerPaddleHit() {

  rallyCount++;

  if (
    rallyCount >
    bestRally
  ) {

    bestRally =
      rallyCount;
  }
}

function drawMatchInfo() {

  ctx.save();


  ctx.font =
    "15px Arial";

  ctx.fillStyle =
    "rgba(255,255,255,0.55)";


  // Bottom left

  ctx.textAlign =
    "left";


  const difficultyText =
    selectedDifficulty
      .toUpperCase();


  ctx.fillText(
    difficultyText +
    "  •  RALLY " +
    rallyCount +
    "  •  BEST " +
    bestRally,

    20,
    canvas.height - 20
  );


  ctx.restore();
}

function toggleScreenShake() {

  screenShakeEnabled =
    !screenShakeEnabled;


  if (!screenShakeEnabled) {

    shakeTime = 0;
    shakeStrength = 0;
  }


  syncShakeUI();
}

requestAnimationFrame(
  gameLoop
);