// ================== CONFIG ==================
const INITIAL_DELAY = 1500;
const MAX_MISSED = 10;
const CIRCLE_RADIUS = 25;
const CIRCLE_SPEED = 0.9;
const DIRECTION_CHANGE_INTERVAL = 400;
const SHOT_COOLDOWN = 200;

// ✅ TEK GERÇEK AYAR
const CIRCLE_LIFETIME = 100; // 1.8 saniye

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
  missed: 0
};

// ================== CIRCLE ==================
let currentCircle = null;
let nextCircleTime = 0;

function spawnNewCircle() {
  const padding = 50;
  const pos = Math.floor(Math.random() * 3);
  let x, y;

  if (pos === 0) {
    x = padding;
    y = Math.random() * canvas.height;
  } else if (pos === 1) {
    x = canvas.width - padding;
    y = Math.random() * canvas.height;
  } else {
    x = Math.random() * canvas.width;
    y = padding;
  }

  const a = Math.random() * Math.PI * 2;

  currentCircle = {
    x,
    y,
    dx: Math.cos(a) * CIRCLE_SPEED,
    dy: Math.sin(a) * CIRCLE_SPEED,
    r: CIRCLE_RADIUS,
    spawnTime: performance.now()
  };

  nextCircleTime = currentCircle.spawnTime + CIRCLE_LIFETIME;
}

// ================== GAME LOOP ==================
function update() {
  const now = performance.now();

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameState.started) {
    gameState.started = true;
    nextCircleTime = now + INITIAL_DELAY;
  }

  // player
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x(), player.y(), player.r, 0, Math.PI * 2);
  ctx.fill();

  // shots
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
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
  }

  if (!currentCircle && now >= nextCircleTime) {
    spawnNewCircle();
  }

  if (currentCircle) {
    if (now - currentCircle.spawnTime >= CIRCLE_LIFETIME) {
      gameState.missed++;
      currentCircle = null;
      nextCircleTime = now + 300;
    } else {
      if (Math.random() < 0.01) {
        const a = Math.random() * Math.PI * 2;
        currentCircle.dx = Math.cos(a) * CIRCLE_SPEED;
        currentCircle.dy = Math.sin(a) * CIRCLE_SPEED;
      }

      currentCircle.x += currentCircle.dx;
      currentCircle.y += currentCircle.dy;

      // sınır
      if (currentCircle.x < currentCircle.r || currentCircle.x > canvas.width - currentCircle.r) {
        currentCircle.dx *= -1;
      }
      if (currentCircle.y < currentCircle.r || currentCircle.y > canvas.height - currentCircle.r) {
        currentCircle.dy *= -1;
      }

      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(currentCircle.x, currentCircle.y, currentCircle.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "white";
      ctx.stroke();

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (Math.hypot(s.x - currentCircle.x, s.y - currentCircle.y) < currentCircle.r + 8) {
          gameState.score++;
          shots.splice(i, 1);
          currentCircle = null;
          spawnNewCircle();
          break;
        }
      }
    }
  }

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`VURULAN: ${gameState.score}`, 20, 40);
  ctx.fillText(`KAÇIRILAN: ${gameState.missed}/${MAX_MISSED}`, 20, 70);

  requestAnimationFrame(update);
}

update();


