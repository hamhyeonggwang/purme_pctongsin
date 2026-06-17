/* ============================================================
   PURME-GALAGA  ::  PC통신 테마 고전 슈팅
   순수 Canvas / 의존성 없음
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("galagaCanvas");
  const panel = document.getElementById("gameGalaga");
  if (!canvas || !panel) return;

  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("galagaOverlay");
  const msgEl = document.getElementById("galagaMsg");
  const startBtn = document.getElementById("galagaStartBtn");
  const scoreEl = document.getElementById("gaScore");
  const highEl = document.getElementById("gaHigh");
  const livesEl = document.getElementById("gaLives");
  const waveEl = document.getElementById("gaWave");

  const W = canvas.width;
  const H = canvas.height;
  const PLAYER_Y = H - 38;
  const PLAYER_SPEED = 4.4;
  const SHOT_SPEED = 7.2;
  const ENEMY_SHOT_SPEED = 3.4;
  const MAX_PLAYER_SHOTS = 3;

  let player;
  let enemies = [];
  let playerShots = [];
  let enemyShots = [];
  let stars = [];
  let particles = [];
  let keys = {};
  let score = 0;
  let highScore = Number(localStorage.getItem("purmegalaga_high") || 0);
  let lives = 3;
  let wave = 1;
  let state = "ready";
  let frame = 0;
  let animId = null;
  let lastTime = 0;
  let formationDir = 1;
  let formationStep = 0;

  function isActive() {
    return !panel.hidden;
  }

  function makeStars() {
    stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.25 + Math.random() * 1.4,
      alpha: 0.25 + Math.random() * 0.75,
    }));
  }

  function resetPlayer() {
    player = {
      x: W / 2,
      y: PLAYER_Y,
      w: 24,
      h: 22,
      invincible: 90,
      cooldown: 0,
    };
  }

  function buildWave() {
    enemies = [];
    enemyShots = [];
    playerShots = [];
    particles = [];
    formationDir = 1;
    formationStep = 0;

    const rows = Math.min(3 + Math.floor((wave - 1) / 2), 5);
    const cols = 8;
    const startX = (W - (cols - 1) * 34) / 2;
    const startY = 54;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = r === 0 ? "boss" : r <= 2 ? "bee" : "drone";
        enemies.push({
          x: startX + c * 34,
          y: startY + r * 30,
          baseX: startX + c * 34,
          baseY: startY + r * 30,
          w: type === "boss" ? 24 : 20,
          h: 18,
          type,
          hp: type === "boss" ? 2 : 1,
          dive: false,
          phase: Math.random() * Math.PI * 2,
          shotTimer: 90 + Math.random() * 160,
        });
      }
    }
  }

  function newGame() {
    score = 0;
    lives = 3;
    wave = 1;
    resetPlayer();
    buildWave();
    state = "playing";
    hideOverlay();
    updateHud();
  }

  function nextWave() {
    wave += 1;
    score += 500 + wave * 100;
    buildWave();
    resetPlayer();
    updateHud();
  }

  function updateHud() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("purmegalaga_high", String(highScore));
    }
    if (scoreEl) scoreEl.textContent = score;
    if (highEl) highEl.textContent = highScore;
    if (livesEl) livesEl.textContent = "▲".repeat(Math.max(0, lives));
    if (waveEl) waveEl.textContent = wave;
  }

  function showOverlay(title, msg) {
    if (msgEl) msgEl.textContent = msg;
    if (startBtn) startBtn.textContent = "▶ " + title + " [ENTER]";
    if (overlay) overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    if (overlay) overlay.classList.add("hidden");
  }

  function firePlayerShot() {
    if (state !== "playing" || player.cooldown > 0) return;
    if (playerShots.length >= MAX_PLAYER_SHOTS) return;
    playerShots.push({ x: player.x, y: player.y - 18, w: 3, h: 12 });
    player.cooldown = 11;
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1.2 + Math.random() * 3.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function rectsHit(a, b) {
    return (
      a.x - a.w / 2 < b.x + b.w / 2 &&
      a.x + a.w / 2 > b.x - b.w / 2 &&
      a.y - a.h / 2 < b.y + b.h / 2 &&
      a.y + a.h / 2 > b.y - b.h / 2
    );
  }

  function loseLife() {
    if (player.invincible > 0) return;
    lives -= 1;
    spawnBurst(player.x, player.y, "#ff5b7f", 18);
    updateHud();
    if (lives <= 0) {
      state = "over";
      showOverlay("RETRY", "GAME OVER — ENTER 다시하기");
      return;
    }
    resetPlayer();
  }

  function updatePlayer() {
    if (keys.ArrowLeft || keys.a || keys.A) player.x -= PLAYER_SPEED;
    if (keys.ArrowRight || keys.d || keys.D) player.x += PLAYER_SPEED;
    player.x = Math.max(18, Math.min(W - 18, player.x));
    if (keys[" "]) firePlayerShot();
    if (player.cooldown > 0) player.cooldown -= 1;
    if (player.invincible > 0) player.invincible -= 1;
  }

  function updateFormation() {
    formationStep += 0.02 + wave * 0.002;
    let minX = Infinity;
    let maxX = -Infinity;
    enemies.forEach((e) => {
      if (e.dive) return;
      minX = Math.min(minX, e.baseX);
      maxX = Math.max(maxX, e.baseX);
    });
    if (minX < 28) formationDir = 1;
    if (maxX > W - 28) formationDir = -1;

    enemies.forEach((e) => {
      if (!e.dive) {
        e.baseX += formationDir * (0.3 + wave * 0.035);
        e.x = e.baseX + Math.sin(formationStep * 2 + e.phase) * 8;
        e.y = e.baseY + Math.cos(formationStep + e.phase) * 4;
        if (Math.random() < 0.0009 + wave * 0.00025) e.dive = true;
      } else {
        e.y += 2 + wave * 0.18;
        e.x += Math.sin(frame * 0.08 + e.phase) * 2.8;
        if (e.y > H + 24) {
          e.dive = false;
          e.baseY += 8;
          e.y = e.baseY;
          e.x = e.baseX;
        }
      }

      e.shotTimer -= 1;
      if (e.shotTimer <= 0 && e.y < PLAYER_Y - 35) {
        enemyShots.push({ x: e.x, y: e.y + 12, w: 4, h: 10 });
        e.shotTimer = 120 + Math.random() * 190 - wave * 8;
      }
    });
  }

  function updateShots() {
    playerShots.forEach((s) => { s.y -= SHOT_SPEED; });
    enemyShots.forEach((s) => { s.y += ENEMY_SHOT_SPEED + wave * 0.08; });
    playerShots = playerShots.filter((s) => s.y > -20);
    enemyShots = enemyShots.filter((s) => s.y < H + 20);
  }

  function updateParticles() {
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 0.035;
    });
    particles = particles.filter((p) => p.life > 0);
  }

  function updateStars() {
    stars.forEach((s) => {
      s.y += s.speed;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    });
  }

  function checkCollisions() {
    for (let i = playerShots.length - 1; i >= 0; i--) {
      const shot = playerShots[i];
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (!rectsHit(shot, enemy)) continue;
        playerShots.splice(i, 1);
        enemy.hp -= 1;
        spawnBurst(shot.x, shot.y, "#ffe14d", 5);
        if (enemy.hp <= 0) {
          const points = enemy.type === "boss" ? 180 : enemy.type === "bee" ? 100 : 70;
          score += points + wave * 10;
          spawnBurst(enemy.x, enemy.y, enemy.type === "boss" ? "#ff9ce0" : "#5bd2ff", 14);
          enemies.splice(j, 1);
          updateHud();
        }
        break;
      }
    }

    enemyShots.forEach((shot, i) => {
      if (rectsHit(shot, player)) {
        enemyShots.splice(i, 1);
        loseLife();
      }
    });

    enemies.forEach((enemy) => {
      if (rectsHit(enemy, player) || enemy.y > PLAYER_Y + 8) loseLife();
    });

    if (enemies.length === 0) nextWave();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      showOverlay("RESUME", "일시정지 — ENTER 계속");
    } else if (state === "paused") {
      state = "playing";
      hideOverlay();
    }
  }

  function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;

    if (isActive()) {
      frame += 1;
      updateStars();
      if (state === "playing") {
        updatePlayer();
        updateFormation();
        updateShots();
        checkCollisions();
      }
      updateParticles(delta);
      draw();
    }
    animId = requestAnimationFrame(update);
  }

  function drawPlayer() {
    if (player.invincible > 0 && Math.floor(frame / 5) % 2 === 0) return;
    ctx.fillStyle = "#5bd2ff";
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 15);
    ctx.lineTo(player.x - 14, player.y + 13);
    ctx.lineTo(player.x - 5, player.y + 7);
    ctx.lineTo(player.x, player.y + 14);
    ctx.lineTo(player.x + 5, player.y + 7);
    ctx.lineTo(player.x + 14, player.y + 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8f0ff";
    ctx.fillRect(player.x - 2, player.y - 4, 4, 10);
  }

  function drawEnemy(e) {
    const color = e.type === "boss" ? "#ff9ce0" : e.type === "bee" ? "#ffe14d" : "#5bd2ff";
    ctx.fillStyle = color;
    ctx.fillRect(e.x - e.w / 2, e.y - 5, e.w, 11);
    ctx.fillRect(e.x - e.w / 2 + 4, e.y - 12, e.w - 8, 8);
    ctx.fillStyle = "#04061f";
    ctx.fillRect(e.x - 6, e.y - 3, 3, 3);
    ctx.fillRect(e.x + 3, e.y - 3, 3, 3);
    ctx.fillStyle = color;
    ctx.fillRect(e.x - e.w / 2 - 4, e.y + 1, 7, 5);
    ctx.fillRect(e.x + e.w / 2 - 3, e.y + 1, 7, 5);
  }

  function draw() {
    ctx.fillStyle = "#04061f";
    ctx.fillRect(0, 0, W, H);

    stars.forEach((s) => {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = "#5bd2ff";
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, s.speed > 1 ? 3 : 1);
    });
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(43, 70, 184, 0.35)";
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    enemies.forEach(drawEnemy);

    ctx.fillStyle = "#00e0ff";
    playerShots.forEach((s) => ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h));
    ctx.fillStyle = "#ff5b7f";
    enemyShots.forEach((s) => ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h));

    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    if (state !== "ready") drawPlayer();
  }

  window.addEventListener("keydown", (e) => {
    if (!isActive()) return;
    if (["ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key)) e.preventDefault();
    keys[e.key] = true;

    if (e.key === "Enter") {
      if (state === "ready" || state === "over") newGame();
      else if (state === "paused") {
        state = "playing";
        hideOverlay();
      }
    }
    if (e.key === "p" || e.key === "P") togglePause();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  if (startBtn) startBtn.addEventListener("click", newGame);

  window.addEventListener("playgamechange", (e) => {
    if (e.detail === "galaga" && state === "ready") {
      draw();
      updateHud();
      showOverlay("START", "좌우 이동 · SPACE 발사 · P 일시정지");
    }
  });

  makeStars();
  resetPlayer();
  updateHud();
  draw();
  showOverlay("START", "좌우 이동 · SPACE 발사 · P 일시정지");
  animId = requestAnimationFrame(update);
})();
