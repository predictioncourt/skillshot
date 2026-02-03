// ================== CONFIG ==================
const INITIAL_DELAY = 1500;
const MAX_MISSED = 10;
const CIRCLE_RADIUS = 25;
const CIRCLE_SPEED_LVL1 = 0.9;
const CIRCLE_SPEED_LVL2 = 1.3; // Hafif daha hareketli
const DIRECTION_CHANGE_INTERVAL = 400;
const SHOT_COOLDOWN = 200;

// ✅ TEK GERÇEK AYAR
const CIRCLE_LIFETIME = 1800; // 1.8 saniye (Level 1 için)
const CIRCLE_LIFETIME_LVL2 = 4000; // 4.0 saniye (Level 2 için)

// ================== CANVAS ==================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ================== UI ELEMENTS ==================
const gameMenu = document.getElementById("gameMenu");
const lvl1Btn = document.getElementById("lvl1Btn");
const lvl2Btn = document.getElementById("lvl2Btn");
const restartBtn = document.getElementById("restartBtn");

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
  if (gameState.started && !gameState.gameOver && e.key.toLowerCase() === "q") {
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
    life: Math.ceil(Math.hypot(canvas.width, canvas.height) / 12) + 10
  });
}

// ================== GAME STATE ==================
let gameState = {
  started: false,
  gameOver: false,
  score: 0,
  missed: 0,
  level: 1
};

// ================== CIRCLES ==================
let circles = [];
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
  
  // Level'a göre hız belirle
  const speed = gameState.level === 1 ? CIRCLE_SPEED_LVL1 : CIRCLE_SPEED_LVL2;
  // Level'a göre yarıçap belirle (+%20 büyük)
  const radius = gameState.level === 1 ? CIRCLE_RADIUS : CIRCLE_RADIUS * 1.2;

  circles.push({
    x,
    y,
    dx: Math.cos(a) * speed,
    dy: Math.sin(a) * speed,
    r: radius,
    spawnTime: performance.now(),
    id: Math.random() // Benzersiz ID
  });

  // Level 1 için bir sonraki spawn zamanı
  if (gameState.level === 1) {
    nextCircleTime = performance.now() + CIRCLE_LIFETIME;
  }
}

// ================== GAME LOGIC ==================
function startGame(level) {
  gameState.started = true;
  gameState.gameOver = false;
  gameState.score = 0;
  gameState.missed = 0;
  gameState.level = level;
  
  circles = [];
  shots = [];
  
  gameMenu.style.display = "none";
  restartBtn.style.display = "none";
  
  nextCircleTime = performance.now() + INITIAL_DELAY;
}

function gameOver() {
  gameState.gameOver = true;
  restartBtn.style.display = "block";
}

// ================== BUTTON LISTENERS ==================
lvl1Btn.addEventListener("click", () => startGame(1));
lvl2Btn.addEventListener("click", () => startGame(2));

restartBtn.addEventListener("click", () => {
  gameMenu.style.display = "block"; // Menüye dön
  restartBtn.style.display = "none";
  gameState.started = false;
  gameState.gameOver = false;
  circles = [];
  shots = [];
});

// ================== GAME LOOP ==================
function update() {
  const now = performance.now();

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Oyun henüz başlamadıysa menüde bekle
  if (!gameState.started) {
    requestAnimationFrame(update);
    return;
  }

  if (gameState.gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("OYUN BİTTİ", canvas.width / 2, canvas.height / 2);
    ctx.font = "30px Arial";
    ctx.fillText(`SKOR: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 50);
    
    // Arkaplanda hala dönmesin diye return etmiyoruz, ama update duruyor olabilir.
    // Ancak restart butonu HTML'de olduğu için burada return edip çizimi durdurabiliriz
    // veya son kareyi ekranda tutabiliriz.
    // Kullanıcı arayüzü görebilsin diye çizimi durdurmuyorum ama mantığı durduruyorum.
    // Ama restartBtn click ile menüye dönecek.
    requestAnimationFrame(update); 
    return;
  }

  if (gameState.missed >= MAX_MISSED) {
    gameOver();
  }

  // SPAWN MANTIĞI
  if (gameState.level === 1) {
    // Level 1: Max 1 daire, süre veya yok olma beklenir
    if (circles.length === 0 && now >= nextCircleTime) {
      spawnNewCircle();
    }
  } else {
    // Level 2: Max 3 daire, eksik varsa tamamla
    if (circles.length < 3) {
      // Çok hızlı üst üste binmesin diye minik rastgelelik eklenebilir ama 
      // "hep 3 daireye tamamlansın" dendiği için direkt spawn ediyoruz.
      // Belki 100ms aralık? Şimdilik direkt yapalım, kaos olsun :)
      if (now >= nextCircleTime) {
          spawnNewCircle();
          // Level 2'de daireler arası minik gecikme (örneğin 300ms)
          nextCircleTime = now + 300; 
      }
    }
  }

  // PLAYER
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x(), player.y(), player.r, 0, Math.PI * 2);
  ctx.fill();

  // SHOTS
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

  // CIRCLES UPDATE LOOP
  for (let i = circles.length - 1; i >= 0; i--) {
    let c = circles[i];
    
    // Yaşam süresi kontrolü
    const lifetime = gameState.level === 1 ? CIRCLE_LIFETIME : CIRCLE_LIFETIME_LVL2;
    if (now - c.spawnTime >= lifetime) {
      gameState.missed++;
      circles.splice(i, 1);
      
      // Level 1 ise bekleme süresi ayarla
      if (gameState.level === 1) {
        nextCircleTime = now + 300;
      }
      continue;
    }

    // Hareket ve Rastgelelik
    if (Math.random() < 0.01) {
      const a = Math.random() * Math.PI * 2;
      const speed = gameState.level === 1 ? CIRCLE_SPEED_LVL1 : CIRCLE_SPEED_LVL2;
      c.dx = Math.cos(a) * speed;
      c.dy = Math.sin(a) * speed;
    }

    c.x += c.dx;
    c.y += c.dy;

    // Sınır ve Sekme
    if (c.x < c.r || c.x > canvas.width - c.r) {
      c.dx *= -1;
    }
    if (c.y < c.r || c.y > canvas.height - c.r) {
      c.dy *= -1;
    }

    // Çizim
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();

    // Vurulma Kontrolü
    for (let j = shots.length - 1; j >= 0; j--) {
      const s = shots[j];
      if (Math.hypot(s.x - c.x, s.y - c.y) < c.r + 8) {
        gameState.score++;
        shots.splice(j, 1); // Mermiyi sil
        circles.splice(i, 1); // Daireyi sil
        
        // Level 1 ise hemen yenisi gelsin (eski kodda böyleydi: spawnNewCircle() çağrılıyordu)
        if (gameState.level === 1) {
            spawnNewCircle();
        } 
        // Level 2 ise zaten loop başında eksik varsa tamamlanacak
        
        break; // Bu daire için mermi döngüsünden çık
      }
    }
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left"; // Skor yazısı sola dayalı
  ctx.fillText(`VURULAN: ${gameState.score}`, 20, 40);
  ctx.fillText(`KAÇIRILAN: ${gameState.missed}/${MAX_MISSED}`, 20, 70);
  ctx.fillText(`LEVEL: ${gameState.level}`, 20, 100);

  requestAnimationFrame(update);
}

// Başlangıçta döngüyü başlat (menüyü çizecek)
update();
