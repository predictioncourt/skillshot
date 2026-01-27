// ================== CONFIG ==================
const INITIAL_DELAY = 1500;
const MAX_MISSED = 10;
const CIRCLE_RADIUS = 25;
const CIRCLE_SPEED = 0.9;
const DIRECTION_CHANGE_INTERVAL = 400;
const SHOT_COOLDOWN = 200;

// ⬇️ KOMPLİKE YAŞAM SÜRESİ PARAMETRELERİ
const BASE_CIRCLE_LIFETIME = 2600;      // temel
const EXTRA_CIRCLE_LIFETIME = 1400;     // rastgele eklenti
const MIN_CIRCLE_LIFETIME = 3000;       // minimum (ms)
const MAX_CIRCLE_LIFETIME = 20000;      // maximum (ms)
const SHOT_TRAVEL_SAMPLE_LIMIT = 30;    // ortalama hesaplarken kullanılacak örnek sayısı

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

// ================== SHOT / STATS TRACKING ==================
// bullets' speed constants (pixels per frame)
const BULLET_PIXELS_PER_FRAME = 12;
// assume approx 60 FPS to convert px -> ms: px / (BULLET_PIXELS_PER_FRAME * 60) * 1000
// convenience factor:
const PX_TO_MS_FACTOR = 1000 / (BULLET_PIXELS_PER_FRAME * 60); // ≈ 1.3889

let shots = [];
let lastShotTime = 0;

// analytics for adaptive lifeTime
let shotTravelSamples = []; // ms
let shotsFired = 0;
let shotsHit = 0;

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
  const s = {
    x: player.x(),
    y: player.y(),
    dx: Math.cos(angle) * BULLET_PIXELS_PER_FRAME,
    dy: Math.sin(angle) * BULLET_PIXELS_PER_FRAME,
    life: 60,
    startTime: performance.now()
  };
  shots.push(s);
  shotsFired++;
}

// helper: moving average of last N samples
function getAvgShotTravelMs() {
  if (shotTravelSamples.length === 0) return null;
  const start = Math.max(0, shotTravelSamples.length - SHOT_TRAVEL_SAMPLE_LIMIT);
  let sum = 0, count = 0;
  for (let i = start; i < shotTravelSamples.length; i++) {
    sum += shotTravelSamples[i];
    count++;
  }
  return sum / count;
}

// clamp helper
function clamp(v, a, b) {
  return Math.min(Math.max(v, a), b);
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

  // ---------- KOMPLİKE YAŞAM SÜRESİ HESABI ----------
  const distToPlayer = Math.hypot(player.x() - x, player.y() - y);

  // 1) temel rastgele parça
  const baseRand = BASE_CIRCLE_LIFETIME + Math.random() * EXTRA_CIRCLE_LIFETIME;

  // 2) mesafeye bağlı ekstra (uzaksa daha uzun): px -> ms approx
  const distanceMsEstimate = distToPlayer * PX_TO_MS_FACTOR; // tahmini tek atış zamanı
  const distanceFactorMs = clamp(distanceMsEstimate * 1.2, 0, 4000);

  // 3) gerçekteki oyuncu atış ortalaması (eğer varsa), yoksa mesafe tahmini kullan
  const avgShotMs = getAvgShotTravelMs() ?? distanceMsEstimate;

  // 4) oyuncu başarı/başarısızlığına göre uyarlama
  const accuracy = shotsFired > 0 ? shotsHit / shotsFired : 0.45; // varsayılan bir değer
  // düşük doğruluk -> süreyi uzat, yüksek doğruluk -> küçük azaltma
  const accuracyFactorMs = clamp((1 - accuracy) * 2500 - (accuracy - 0.5) * 200, -800, 4000);

  // 5) kaçırma stresi (oyuncu çok kaçırdıysa biraz daha yardımcı ol)
  const missedStreakBonus = clamp(gameState.missed * 450, 0, 3500);

  // 6) toplamı topla ve sınırla
  let computedLife = baseRand
    + distanceFactorMs
    + avgShotMs * 0.9
    + accuracyFactorMs
    + missedStreakBonus;

  computedLife = Math.round(clamp(computedLife, MIN_CIRCLE_LIFETIME, MAX_CIRCLE_LIFETIME));

  // ---------- circle objesi ----------
  currentCircle = {
    x,
    y,
    dx,
    dy,
    r: CIRCLE_RADIUS,
    spawnTime: performance.now(),
    lastDirectionChange: performance.now(),
    color: "red",
    // hayat burada atandı (ms)
    lifeTime: computedLife
  };

  // nextCircleTime: fallback (oyuncunun mermisiyle veya lifeTime dolunca değişecek)
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

  // draw player
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x(), player.y(), player.r, 0, Math.PI * 2);
  ctx.fill();

  // update shots
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

  // spawn logic
  if (!currentCircle && now >= nextCircleTime) {
    spawnNewCircle();
  }

  if (currentCircle) {
    const elapsed = now - currentCircle.spawnTime;

    // yok olma kontrolü (lifeTime artık komplike)
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

      // çarpışma kontrolü (her atışla)
      for (let si = shots.length - 1; si >= 0; si--) {
        const s = shots[si];
        if (Math.hypot(s.x - currentCircle.x, s.y - currentCircle.y) < currentCircle.r + 8) {
          // hit - atış süresini ölç
          const travelMs = performance.now() - (s.startTime || performance.now());
          shotTravelSamples.push(travelMs);
          if (shotTravelSamples.length > 200) shotTravelSamples.shift(); // hafıza sınırı

          shotsHit++;
          gameState.score++;
          shots.splice(si, 1);
          currentCircle = null;
          // hemen yeni daire doğması: spawnNewCircle() çağrısı ile mantığı aynı kalsın
          spawnNewCircle();
          break;
        }
      }
    }
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`VURULAN: ${gameState.score}`, 20, 40);
  ctx.fillText(`KAÇIRILAN: ${gameState.missed}/${MAX_MISSED}`, 20, 70);

  if (!gameState.gameOver) requestAnimationFrame(update);
}

update();
