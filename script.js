// ================== CONFIG ==================
const INITIAL_DELAY = 1500;
const MAX_MISSED = 10;
const CIRCLE_RADIUS = 25;
const CIRCLE_SPEED = 0.9;
const DIRECTION_CHANGE_INTERVAL = 400;
const SHOT_COOLDOWN = 200;

// ⬇️ KOMPLİKE YAŞAM SÜRESİ (SADECE BU)
const BASE_CIRCLE_LIFETIME = 2600;
const EXTRA_CIRCLE_LIFETIME = 1400;

// ================== CANVAS ==================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ================== PLAYER ==================
const player = {
  x: () => canvas.width / 2,
  y: () => canvas.height / 2,
  r: 15,
  color: "white"
};

// ================== MOUSE ==================
let mouse = { x: 0, y: 0 };
canvas.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// ================== SHOTS ==================
let shots = [];
let lastShotTime = 0;

document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "q") {
    const now = performance.now();
    if (now - lastShotTime > SHOT_COOLDOWN) {
      shoot();
      lastShotTime = now;
    }
  }
});

function shoot() {
  const angle = Math.atan2(mouse.y - player.y(), mouse.x - player.x());
  shots.push({
    x: player.x(),
    y: player.y(),
    dx: Math.cos(angle) * 12,
    dy: Math.sin(angle) * 12,
    life: 60
  });
}

// ================== GAME STATE ==================
let gameState = {
  started: false,
  gameOver: false,
  score: 0,
  missed: 0,
  startTime: 0
};

// ================== CIRCLE ENEMY ==================
let currentCircle = null;
let nextCircleTime = 0;

function spawnNewCircle() {
  const position = Math.floor(Math.random() * 3);
  let x, y;
  const padding = 50;

  if (position === 0) {
    x = padding;
    y = Math.random() * canvas.height;
  } else if (position === 1) {
    x = canvas.width - padding;
    y = Math.random() * canvas.height;
  } else {
    x = Math.random() * canvas.width;
    y = padding;
  }

  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle) * CIRCLE_SPEED;
  const dy = Math.sin(angle) * CIRCLE_SPEED;

  currentCircle = {
    x,
    y,
    dx,
    dy,
    r: CIRCLE_RADIUS,
    spawnTime: performance.now(),
    lastDirectionChange: performance.now(),
    color: "red",
    // ⬇️ HER DAİREYE ÖZEL YAŞAM SÜRESİ
    lifeTime:
      BASE_CIRCLE_LIFETIME +
      Math.random() * EXTRA_CIRCLE_LIFETIME
  };

  nextCircleTime = performance.now() + currentCircle.lifeTime;
}

// ================== GAME LOOP ==================
function update() {
  const now = performance.now();

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameState.started) {
    gameState.startTime = now;
    gameState.started = true;
    nextCircleTime = now + INITIAL_DELAY;
  }

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x(), player.y(), player.r, 0, Math.PI * 2);
  ctx.fill();

  shots.forEach((s, i) => {
    s.x += s.dx;
    s.y += s.dy;
    s.life--;

    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.dx * 2, s.y - s.dy * 2);
    ctx.stroke();

    if (s.life <= 0) shots.splice(i, 1);
  });

  if (!currentCircle && now >= nextCircleTime) {
    spawnNewCircle();
  }

  if (currentCircle) {
    const elapsed = now - currentCircle.spawnTime;

    // ⬇️ YOK OLMA KONTROLÜ (UZATILDI)
    if (elapsed >= currentCircle.lifeTime) {
      gameState.missed++;
      currentCircle = null;

      if (gameState.missed >= MAX_MISSED) {
        gameState.gameOver = true;
      } else {
        nextCircleTime = now + 300;
      }
    } else {
      if (now - currentCircle.lastDirectionChange > DIRECTION_CHANGE_INTERVAL) {
        const a = Math.random() * Math.PI * 2;
        currentCircle.dx = Math.cos(a) * CIRCLE_SPEED;
        currentCircle.dy = Math.sin(a) * CIRCLE_SPEED;
        currentCircle.lastDirectionChange = now;
      }

      currentCircle.x += currentCircle.dx;
      currentCircle.y += currentCircle.dy;

      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(currentCircle.x, currentCircle.y, currentCircle.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      shots.forEach((s, si) => {
        if (Math.hypot(s.x - currentCircle.x, s.y - currentCircle.y) < currentCircle.r + 8) {
          gameState.score++;
          currentCircle = null;
          shots.splice(si, 1);
          spawnNewCircle();
        }
      });
    }
  }

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`VURULAN: ${gameState.score}`, 20, 40);
  ctx.fillText(`KAÇIRILAN: ${gameState.missed}/${MAX_MISSED}`, 20, 70);

  if (!gameState.gameOver) requestAnimationFrame(update);
}

update();
