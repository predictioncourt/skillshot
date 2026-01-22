// ================== CONFIG ==================
const INITIAL_DELAY = 1500; // 1.5 saniye başlangıç bekleme
const CIRCLE_LIFETIME = 1200; // 1.2 saniye daire görünme süresi
const MAX_MISSED = 10; // Kaçırılabilecek maksimum daire
const CIRCLE_RADIUS = 25;
const CIRCLE_SPEED = 1.5; // Daire hareket hızı
const DIRECTION_CHANGE_INTERVAL = 400; // Her kaç ms'de bir yön değiştirir

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
const Q_COOLDOWN = 200;
let lastQTime = 0;

document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "q") {
    const now = performance.now();
    if (now - lastQTime >= Q_COOLDOWN) {
      shoot();
      lastQTime = now;
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
  // Random pozisyon: sol, sağ veya üst kenardan
  const position = Math.floor(Math.random() * 3);
  let x, y;
  
  const padding = 50;
  
  if (position === 0) {
    // Sol kenardan
    x = padding;
    y = Math.random() * canvas.height;
  } else if (position === 1) {
    // Sağ kenardan
    x = canvas.width - padding;
    y = Math.random() * canvas.height;
  } else {
    // Üst kenardan
    x = Math.random() * canvas.width;
    y = padding;
  }
  
  // Random yönde hareket et
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle) * CIRCLE_SPEED;
  const dy = Math.sin(angle) * CIRCLE_SPEED;
  
  currentCircle = {
    x: x,
    y: y,
    dx: dx,
    dy: dy,
    r: CIRCLE_RADIUS,
    spawnTime: performance.now(),
    lastDirectionChange: performance.now(),
    color: "red"
  };
  
  nextCircleTime = performance.now() + CIRCLE_LIFETIME;
}

// ================== MOUSE CLICK ==================
canvas.addEventListener("click", e => {
  if (!gameState.started || gameState.gameOver || !currentCircle) return;
  
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  // Dairenin üzerine tıklandı mı?
  const dx = clickX - currentCircle.x;
  const dy = clickY - currentCircle.y;
  const distance = Math.hypot(dx, dy);
  
  if (distance < currentCircle.r + 10) {
    gameState.score++;
    currentCircle = null;
    spawnNewCircle();
  }
});

// ================== GAME LOOP ==================
function update() {
  const now = performance.now();
  
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // -------- OYUN BAŞLATMA --------
  if (!gameState.started) {
    gameState.startTime = now;
    gameState.started = true;
    nextCircleTime = now + INITIAL_DELAY;
  }
  
  // -------- OYUNCU (MERKEZ DAİRE) --------
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x(), player.y(), player.r, 0, Math.PI * 2);
  ctx.fill();
  
  // -------- SHOTS --------
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
  
  // -------- DÜŞMAN DAİRE --------
  if (gameState.started && !gameState.gameOver) {
    // Eğer mevcut daire yoksa yeni bir tane oluştur
    if (!currentCircle && now >= nextCircleTime) {
      spawnNewCircle();
    }
    
    // Mevcut dairenin gösterilip gösterilmeyeceğini kontrol et
    if (currentCircle) {
      const elapsedTime = now - currentCircle.spawnTime;
      
      // Daire süresi bitmiş mi?
      if (elapsedTime > CIRCLE_LIFETIME) {
        gameState.missed++;
        currentCircle = null;
        
        // Game Over kontrolü
        if (gameState.missed >= MAX_MISSED) {
          gameState.gameOver = true;
        } else {
          // Yeni daire 0.3 saniye sonra çıkacak
          nextCircleTime = now + 300;
        }
      } else {
        // Belli aralıklarla yön değiştirir (dodge)
        const now = performance.now();
        if (now - currentCircle.lastDirectionChange > DIRECTION_CHANGE_INTERVAL) {
          const newAngle = Math.random() * Math.PI * 2;
          currentCircle.dx = Math.cos(newAngle) * CIRCLE_SPEED;
          currentCircle.dy = Math.sin(newAngle) * CIRCLE_SPEED;
          currentCircle.lastDirectionChange = now;
        }
        
        // Daire konumunu güncelle (yavaş hareket)
        currentCircle.x += currentCircle.dx;
        currentCircle.y += currentCircle.dy;
        
        // Ekran kenarlarında duvara çarpmasını engelle (sınırlandır)
        if (currentCircle.x - currentCircle.r < 0) {
          currentCircle.x = currentCircle.r;
        }
        if (currentCircle.x + currentCircle.r > canvas.width) {
          currentCircle.x = canvas.width - currentCircle.r;
        }
        if (currentCircle.y - currentCircle.r < 0) {
          currentCircle.y = currentCircle.r;
        }
        if (currentCircle.y + currentCircle.r > canvas.height) {
          currentCircle.y = canvas.height - currentCircle.r;
        }
        
        // Dairenin rengini animasyon ile değiştir (zaman geçtikçe koyulaş)
        const progress = elapsedTime / CIRCLE_LIFETIME;
        const hue = Math.floor((1 - progress) * 60); // Kırmızı 0, sarı 60
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        
        ctx.beginPath();
        ctx.arc(currentCircle.x, currentCircle.y, currentCircle.r, 0, Math.PI * 2);
        ctx.fill();
        
        // Daire kenarını çiz
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(currentCircle.x, currentCircle.y, currentCircle.r, 0, Math.PI * 2);
        ctx.stroke();        
        // Daireye çarpan atışları kontrol et
        shots.forEach((s, si) => {
          const dx = s.x - currentCircle.x;
          const dy = s.y - currentCircle.y;
          if (Math.hypot(dx, dy) < currentCircle.r + 8) {
            gameState.score++;
            currentCircle = null;
            shots.splice(si, 1);
            spawnNewCircle();
          }
        });      }
    }
  }
  
  // -------- UI --------
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`VURULAN: ${gameState.score}`, 20, 40);
  ctx.fillText(`KAÇIRILAN: ${gameState.missed}/${MAX_MISSED}`, 20, 70);
  
  // -------- GAME OVER --------
  if (gameState.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "red";
    ctx.font = "60px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText(`Toplam Skor: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 40);
    
    // Butonu göster
    const restartBtn = document.getElementById("restartBtn");
    restartBtn.style.display = "block";
    
    return;
  }
  
  requestAnimationFrame(update);
}

update();

// ================== RESTART BUTTON ==================
document.getElementById("restartBtn").addEventListener("click", () => {
  location.reload();
});
