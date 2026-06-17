/* ============================================================
   PURME-ARKANOID  ::  PC통신 테마 벽돌깨기
   순수 Canvas / 의존성 없음
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("arkanoidCanvas");
  const panel = document.getElementById("gameArkanoid");
  if (!canvas || !panel) return;

  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("arkanoidOverlay");
  const msgEl = document.getElementById("arkanoidMsg");
  const startBtn = document.getElementById("arkanoidStartBtn");
  const scoreEl = document.getElementById("aScore");
  const highEl = document.getElementById("aHigh");
  const livesEl = document.getElementById("aLives");
  const stageEl = document.getElementById("aStage");

  const W = canvas.width;
  const H = canvas.height;
  const PADDLE_Y = H - 34;
  const PADDLE_SPEED = 6;
  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_W = 31;
  const BRICK_H = 14;
  const BRICK_GAP = 5;
  const WALL_PAD = 14;

  const BRICK_COLORS = ["#ff5b7f", "#ffb05b", "#ffe14d", "#5dffa0", "#5bd2ff", "#b48cff"];

  let paddle;
  let ball;
  let bricks = [];
  let particles = [];
  let keys = {};
  let score = 0;
  let highScore = Number(localStorage.getItem("purmearkanoid_high") || 0);
  let lives = 3;
  let stage = 1;
  let state = "ready";
  let frame = 0;
  let animId = null;

  function isActive() {
    return !panel.hidden;
  }

  function resetPaddle() {
    paddle = {
      x: W / 2,
      y: PADDLE_Y,
      w: Math.max(58, 88 - (stage - 1) * 4),
      h: 12,
    };
  }

  function resetBall(stuck) {
    ball = {
      x: paddle.x,
      y: paddle.y - 12,
      r: 6,
      vx: 0,
      vy: 0,
      speed: Math.min(6.8, 4.2 + stage * 0.28),
      stuck,
    };
  }

  function buildBricks() {
    bricks = [];
    const top = 58;
    const totalW = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP;
    const left = (W - totalW) / 2;

    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const patternGap = stage >= 3 && (r + c + stage) % 7 === 0;
        if (patternGap) continue;
        const tough = stage >= 2 && r < Math.min(1 + Math.floor(stage / 2), 3);
        bricks.push({
          x: left + c * (BRICK_W + BRICK_GAP),
          y: top + r * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          hp: tough ? 2 : 1,
          maxHp: tough ? 2 : 1,
          color: BRICK_COLORS[(r + stage - 1) % BRICK_COLORS.length],
        });
      }
    }
  }

  function newGame() {
    if (window.PurmeArcade) window.PurmeArcade.start("arkanoid");
    score = 0;
    lives = 3;
    stage = 1;
    particles = [];
    resetPaddle();
    resetBall(true);
    buildBricks();
    state = "playing";
    hideOverlay();
    updateHud();
  }

  function nextStage() {
    stage += 1;
    score += 750 + stage * 150;
    if (window.PurmeArcade) window.PurmeArcade.play("coin");
    particles = [];
    resetPaddle();
    resetBall(true);
    buildBricks();
    showOverlay("LAUNCH", "STAGE " + stage + " — SPACE로 발사");
    state = "playing";
    updateHud();
  }

  function updateHud() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("purmearkanoid_high", String(highScore));
    }
    if (scoreEl) scoreEl.textContent = score;
    if (highEl) highEl.textContent = highScore;
    if (livesEl) livesEl.textContent = "●".repeat(Math.max(0, lives));
    if (stageEl) stageEl.textContent = stage;
  }

  function showOverlay(title, msg) {
    if (msgEl) msgEl.textContent = msg;
    if (startBtn) startBtn.textContent = "▶ " + title + " [ENTER]";
    if (overlay) overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    if (overlay) overlay.classList.add("hidden");
  }

  function launchBall() {
    if (state !== "playing" || !ball.stuck) return;
    ball.stuck = false;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    hideOverlay();
    if (window.PurmeArcade) window.PurmeArcade.play("click");
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 1 + Math.random() * 3;
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

  function loseBall() {
    lives -= 1;
    spawnBurst(ball.x, ball.y, "#ff5b7f", 16);
    updateHud();
    if (lives <= 0) {
      state = "over";
      showOverlay("RETRY", "GAME OVER — ENTER 다시하기");
      if (window.PurmeArcade) {
        window.PurmeArcade.submitScore("arkanoid", score, { stage });
      }
      return;
    }
    resetPaddle();
    resetBall(true);
    showOverlay("LAUNCH", "BALL LOST — SPACE로 재발사");
  }

  function movePaddle() {
    if (keys.ArrowLeft || keys.a || keys.A) paddle.x -= PADDLE_SPEED;
    if (keys.ArrowRight || keys.d || keys.D) paddle.x += PADDLE_SPEED;
    paddle.x = Math.max(WALL_PAD + paddle.w / 2, Math.min(W - WALL_PAD - paddle.w / 2, paddle.x));
    if (ball.stuck) {
      ball.x = paddle.x;
      ball.y = paddle.y - 12;
    }
  }

  function clampBallSpeed() {
    const speed = Math.hypot(ball.vx, ball.vy) || ball.speed;
    ball.vx = (ball.vx / speed) * ball.speed;
    ball.vy = (ball.vy / speed) * ball.speed;
  }

  function bounceFromPaddle() {
    const hitX = (ball.x - paddle.x) / (paddle.w / 2);
    const clamped = Math.max(-1, Math.min(1, hitX));
    const angle = -Math.PI / 2 + clamped * 1.05;
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.y = paddle.y - paddle.h / 2 - ball.r - 1;
  }

  function hitBrick(brick) {
    brick.hp -= 1;
    score += brick.hp > 0 ? 35 : 100 + stage * 15;
    if (window.PurmeArcade) window.PurmeArcade.scoreBlip();
    spawnBurst(ball.x, ball.y, brick.color, brick.hp > 0 ? 5 : 10);
    updateHud();
    if (brick.hp <= 0) bricks.splice(bricks.indexOf(brick), 1);
    if (bricks.length === 0) nextStage();
  }

  function updateBall() {
    if (ball.stuck || state !== "playing") return;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.r <= WALL_PAD) {
      ball.x = WALL_PAD + ball.r;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + ball.r >= W - WALL_PAD) {
      ball.x = W - WALL_PAD - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r <= WALL_PAD) {
      ball.y = WALL_PAD + ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    const paddleTop = paddle.y - paddle.h / 2;
    const paddleLeft = paddle.x - paddle.w / 2;
    const paddleRight = paddle.x + paddle.w / 2;
    if (
      ball.vy > 0 &&
      ball.y + ball.r >= paddleTop &&
      ball.y - ball.r <= paddle.y + paddle.h / 2 &&
      ball.x >= paddleLeft - ball.r &&
      ball.x <= paddleRight + ball.r
    ) {
      bounceFromPaddle();
    }

    for (const brick of bricks.slice()) {
      if (
        ball.x + ball.r < brick.x ||
        ball.x - ball.r > brick.x + brick.w ||
        ball.y + ball.r < brick.y ||
        ball.y - ball.r > brick.y + brick.h
      ) {
        continue;
      }

      const prevX = ball.x - ball.vx;
      const prevY = ball.y - ball.vy;
      if (prevY + ball.r <= brick.y || prevY - ball.r >= brick.y + brick.h) {
        ball.vy *= -1;
      } else if (prevX + ball.r <= brick.x || prevX - ball.r >= brick.x + brick.w) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }
      hitBrick(brick);
      clampBallSpeed();
      break;
    }

    if (ball.y - ball.r > H) loseBall();
  }

  function updateParticles() {
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.life -= 0.03;
      p.size = Math.max(1, p.size - 0.03);
    });
    particles = particles.filter((p) => p.life > 0);
  }

  function update() {
    if (isActive()) {
      frame += 1;
      if (state === "playing") {
        movePaddle();
        if (keys[" "]) launchBall();
        updateBall();
      }
      updateParticles();
      draw();
    }
    animId = requestAnimationFrame(update);
  }

  function drawBrick(brick) {
    ctx.fillStyle = brick.hp < brick.maxHp ? "#e8f0ff" : brick.color;
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(brick.x + 2, brick.y + 2, brick.w - 4, 2);
    ctx.strokeStyle = "rgba(4,6,31,0.7)";
    ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1);
  }

  function drawPaddle() {
    ctx.fillStyle = "#5bd2ff";
    ctx.fillRect(paddle.x - paddle.w / 2, paddle.y - paddle.h / 2, paddle.w, paddle.h);
    ctx.fillStyle = "#e8f0ff";
    ctx.fillRect(paddle.x - paddle.w / 2 + 5, paddle.y - paddle.h / 2 + 2, paddle.w - 10, 2);
    ctx.fillStyle = "#ff9ce0";
    ctx.fillRect(paddle.x - 9, paddle.y - paddle.h / 2 - 2, 18, 3);
  }

  function drawBall() {
    ctx.fillStyle = "#ffe14d";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(ball.x - 2, ball.y - 4, 2, 2);
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.fillStyle = "#04061f";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(43, 70, 184, 0.45)";
    ctx.strokeRect(WALL_PAD + 0.5, WALL_PAD + 0.5, W - WALL_PAD * 2 - 1, H - WALL_PAD - 0.5);
    for (let y = WALL_PAD + 25; y < H; y += 25) {
      ctx.strokeStyle = y % 50 === 0 ? "rgba(91, 210, 255, 0.14)" : "rgba(43, 70, 184, 0.18)";
      ctx.beginPath();
      ctx.moveTo(WALL_PAD, y);
      ctx.lineTo(W - WALL_PAD, y);
      ctx.stroke();
    }

    bricks.forEach(drawBrick);
    drawPaddle();
    drawBall();
    drawParticles();

    if (ball.stuck && state === "playing" && Math.floor(frame / 20) % 2 === 0) {
      ctx.fillStyle = "rgba(91, 210, 255, 0.75)";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("SPACE TO LAUNCH", W / 2, H - 70);
      ctx.textAlign = "start";
    }
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

  window.addEventListener("keydown", (e) => {
    if (!isActive()) return;
    if (["ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key)) e.preventDefault();
    keys[e.key] = true;

    if (e.key === "Enter") {
      if (state === "ready" || state === "over") newGame();
      else if (state === "paused") {
        state = "playing";
        hideOverlay();
      } else if (state === "playing" && ball.stuck) {
        launchBall();
      }
    }
    if (e.key === "p" || e.key === "P") togglePause();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  if (startBtn) startBtn.addEventListener("click", newGame);

  window.addEventListener("playgamechange", (e) => {
    if (e.detail === "arkanoid" && state === "ready") {
      draw();
      updateHud();
      showOverlay("START", "패들을 움직여 모든 벽돌을 깨세요");
    }
  });

  resetPaddle();
  resetBall(true);
  buildBricks();
  updateHud();
  draw();
  showOverlay("START", "패들을 움직여 모든 벽돌을 깨세요");
  animId = requestAnimationFrame(update);
})();
