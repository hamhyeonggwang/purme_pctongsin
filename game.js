/* ============================================================
   PURME-MAN  ::  PC통신 테마 팩맨
   순수 Canvas / 의존성 없음
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // ---------- 상수 ----------
  const TILE = 20;
  const COLS = 19;
  const ROWS = 19;
  const PAC_SPEED = 2;          // TILE(20)의 약수여야 정렬 유지
  const GHOST_SPEED = 2;
  const FRIGHT_FRAMES = 7 * 60; // 약 7초
  const CORRIDOR = new Set([1, 5, 9, 13, 17]);

  // 셀 값: 0=벽, 1=도트, 2=파워펠릿, 3=빈칸
  const WALL = 0, DOT = 1, POWER = 2, EMPTY = 3;

  const GHOST_COLORS = ["#ff4d5b", "#ff9ce0", "#5bd2ff", "#ffb05b"];
  const GHOST_HOME = [
    { c: 8, r: 9 }, { c: 9, r: 9 }, { c: 10, r: 9 }, { c: 9, r: 8 },
  ];
  const PAC_START = { c: 9, r: 17 };

  // ---------- 상태 ----------
  let grid = [];
  let dotsLeft = 0;
  let score = 0;
  let lives = 3;
  let highScore = Number(localStorage.getItem("purmeman_high") || 0);
  let frightTimer = 0;
  let eatCombo = 0;
  let freeze = 0;
  let frameCount = 0;
  let state = "ready"; // ready | playing | dying | over | win

  let pac, ghosts;

  const overlay = document.getElementById("gameOverlay");
  const msgEl = document.getElementById("gameMsg");
  const startBtn = document.getElementById("gameStartBtn");
  const scoreEl = document.getElementById("gScore");
  const highEl = document.getElementById("gHigh");
  const livesEl = document.getElementById("gLives");

  // ---------- 미로 생성 (격자 통로 → 연결성 보장) ----------
  function buildGrid() {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) {
          row.push(WALL);
        } else if (CORRIDOR.has(r) || CORRIDOR.has(c)) {
          row.push(DOT);
        } else {
          row.push(WALL);
        }
      }
      g.push(row);
    }
    // 파워 펠릿 (네 모서리 교차점)
    [[1, 1], [COLS - 2, 1], [1, ROWS - 2], [COLS - 2, ROWS - 2]].forEach(
      ([c, r]) => { g[r][c] = POWER; }
    );
    // 고스트 집 + 팩맨 출발점은 도트 제거
    GHOST_HOME.forEach((h) => { g[h.r][h.c] = EMPTY; });
    g[PAC_START.r][PAC_START.c] = EMPTY;
    return g;
  }

  function countDots() {
    let n = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c] === DOT || grid[r][c] === POWER) n++;
    return n;
  }

  // ---------- 좌표 유틸 ----------
  const center = (i) => i * TILE + TILE / 2;
  const colOf = (x) => Math.round((x - TILE / 2) / TILE);
  const rowOf = (y) => Math.round((y - TILE / 2) / TILE);
  const aligned = (e) =>
    (e.x - TILE / 2) % TILE === 0 && (e.y - TILE / 2) % TILE === 0;
  const isWall = (c, r) =>
    c < 0 || r < 0 || c >= COLS || r >= ROWS || grid[r][c] === WALL;

  const DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, none: { x: 0, y: 0 },
  };

  function canMove(c, r, d) { return !isWall(c + d.x, r + d.y); }

  // ---------- 엔티티 초기화 ----------
  function resetPositions() {
    pac = {
      x: center(PAC_START.c), y: center(PAC_START.r),
      dir: DIRS.none, next: DIRS.none, mouth: 0, mouthDir: 1,
    };
    ghosts = GHOST_HOME.map((h, i) => ({
      x: center(h.c), y: center(h.r),
      dir: DIRS.up, color: GHOST_COLORS[i], home: h,
      jitter: 0.22 + i * 0.06,
      released: i === 0,
      release: i * 150,   // 약 2.5초 간격으로 한 마리씩 출발
      bob: 0,
    }));
    frightTimer = 0;
    eatCombo = 0;
  }

  function newGame() {
    grid = buildGrid();
    dotsLeft = countDots();
    score = 0;
    lives = 3;
    resetPositions();
    state = "playing";
    freeze = 60;
    hideOverlay();
    updateHud();
  }

  // ---------- 이동 ----------
  function moveEntity(e, speed) {
    if (aligned(e)) {
      const c = colOf(e.x), r = rowOf(e.y);
      if (e.next && e.next !== DIRS.none && canMove(c, r, e.next)) {
        e.dir = e.next; e.next = DIRS.none;
      }
      if (!canMove(c, r, e.dir)) { e.dir = DIRS.none; return; }
    }
    e.x += e.dir.x * speed;
    e.y += e.dir.y * speed;
  }

  function moveGhost(g) {
    if (!g.released) {
      g.release--;
      if (g.release <= 0) {
        g.released = true;
        g.x = center(g.home.c); g.y = center(g.home.r); // 정렬 복구
      } else {
        g.bob += 0.2; g.y = center(g.home.r) + Math.sin(g.bob) * 2;
        return;
      }
    }
    const frightened = frightTimer > 0;
    // 속도 조절: 평소엔 살짝 느리게(75%), 겁먹으면 더 느리게(50%)
    if (frightened ? frameCount % 2 === 0 : frameCount % 4 === 0) return;
    if (aligned(g)) {
      const c = colOf(g.x), r = rowOf(g.y);
      const rev = { x: -g.dir.x, y: -g.dir.y };
      let opts = Object.values(DIRS).filter(
        (d) => d !== DIRS.none && canMove(c, r, d) &&
          !(d.x === rev.x && d.y === rev.y)
      );
      if (opts.length === 0) opts = [rev];

      const pc = colOf(pac.x), pr = rowOf(pac.y);
      let best = opts[0];
      if (frightened || Math.random() < g.jitter) {
        // 겁먹음/변덕 → 거리 최대화 또는 랜덤
        if (frightened) {
          let far = -1;
          opts.forEach((d) => {
            const dist = (c + d.x - pc) ** 2 + (r + d.y - pr) ** 2;
            if (dist > far) { far = dist; best = d; }
          });
        } else {
          best = opts[Math.floor(Math.random() * opts.length)];
        }
      } else {
        // 추격 → 거리 최소화
        let near = Infinity;
        opts.forEach((d) => {
          const dist = (c + d.x - pc) ** 2 + (r + d.y - pr) ** 2;
          if (dist < near) { near = dist; best = d; }
        });
      }
      g.dir = best;
    }
    g.x += g.dir.x * GHOST_SPEED;
    g.y += g.dir.y * GHOST_SPEED;
  }

  // ---------- 충돌/먹기 ----------
  function eatAt() {
    if (!aligned(pac)) return;
    const c = colOf(pac.x), r = rowOf(pac.y);
    const cell = grid[r][c];
    if (cell === DOT) { grid[r][c] = EMPTY; score += 10; dotsLeft--; }
    else if (cell === POWER) {
      grid[r][c] = EMPTY; score += 50; dotsLeft--;
      frightTimer = FRIGHT_FRAMES; eatCombo = 0;
    }
    if (dotsLeft <= 0) winGame();
  }

  function checkGhostCollision() {
    for (const g of ghosts) {
      if (!g.released) continue;
      const dx = g.x - pac.x, dy = g.y - pac.y;
      if (dx * dx + dy * dy < (TILE * 0.6) ** 2) {
        if (frightTimer > 0 && !g.eaten) {
          g.eaten = true;
          eatCombo++;
          score += 200 * eatCombo;
          // 집으로 즉시 복귀
          g.x = center(g.home.c); g.y = center(g.home.r);
          g.dir = DIRS.up;
          setTimeout(() => { g.eaten = false; }, 50);
        } else if (!g.eaten) {
          loseLife();
          return;
        }
      }
    }
  }

  function loseLife() {
    lives--;
    updateHud();
    if (lives <= 0) { gameOver(); return; }
    state = "dying";
    freeze = 60;
    setTimeout(() => {
      resetPositions();
      state = "playing";
      freeze = 30;
    }, 800);
  }

  function gameOver() {
    state = "over";
    saveHigh();
    showOverlay("GAME OVER", "ENTER 로 다시 도전!");
  }
  function winGame() {
    state = "win";
    saveHigh();
    showOverlay("★ CLEAR! ★", "모든 점을 먹었어요! ENTER 로 한 판 더!");
  }
  function saveHigh() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("purmeman_high", String(highScore));
    }
  }

  // ---------- 렌더링 ----------
  function draw() {
    ctx.fillStyle = "#04061f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 미로
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = grid[r][c];
        const x = c * TILE, y = r * TILE;
        if (v === WALL) {
          ctx.fillStyle = "#0d1f6e";
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = "#3a5bd0";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
        } else if (v === DOT) {
          ctx.fillStyle = "#9fc2ff";
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (v === POWER) {
          const pulse = 3 + Math.sin(frameCount * 0.2) * 1.6;
          ctx.fillStyle = "#00e0ff";
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 고스트
    ghosts.forEach((g) => drawGhost(g));
    // 팩맨
    drawPac();

    // READY! (시작/부활 직후 정지 구간)
    if (state === "playing" && freeze > 0) {
      ctx.fillStyle = "#ffe14d";
      ctx.font = "bold 18px 'Galmuri11', monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#ffe14d";
      ctx.shadowBlur = 10;
      ctx.fillText("READY!", canvas.width / 2, canvas.height / 2 + 40);
      ctx.shadowBlur = 0;
      ctx.textAlign = "start";
    }
  }

  function drawPac() {
    const angles = {
      "1,0": 0, "0,1": Math.PI / 2, "-1,0": Math.PI, "0,-1": -Math.PI / 2,
    };
    const key = `${pac.dir.x},${pac.dir.y}`;
    const base = angles[key] != null ? angles[key] : 0;
    const m = pac.mouth * Math.PI; // 0~0.25π
    ctx.fillStyle = "#ffe14d";
    ctx.shadowColor = "#ffe14d";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(pac.x, pac.y);
    ctx.arc(pac.x, pac.y, TILE / 2 - 1, base + m, base + Math.PI * 2 - m);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawGhost(g) {
    const frightened = frightTimer > 0 && !g.eaten;
    const blink = frightened && frightTimer < 120 && Math.floor(frameCount / 12) % 2 === 0;
    const body = g.eaten ? null : frightened ? (blink ? "#ffffff" : "#1b39c4") : g.color;
    const rad = TILE / 2 - 1;
    const x = g.x, y = g.y;

    if (body) {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y - 1, rad, Math.PI, 0);
      ctx.lineTo(x + rad, y + rad);
      // 물결 밑단
      const steps = 3;
      for (let i = 0; i < steps; i++) {
        const w = (rad * 2) / steps;
        const sx = x + rad - w * i;
        ctx.lineTo(sx - w / 2, y + rad - 4);
        ctx.lineTo(sx - w, y + rad);
      }
      ctx.closePath();
      ctx.fill();
    }

    // 눈
    const ex = g.dir.x * 2, ey = g.dir.y * 2;
    [-4, 4].forEach((off) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + off, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = frightened && !g.eaten ? "#ff4d5b" : "#0a0e3f";
      ctx.beginPath();
      ctx.arc(x + off + ex, y - 2 + ey, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ---------- HUD / 오버레이 ----------
  function updateHud() {
    scoreEl.textContent = score;
    highEl.textContent = Math.max(score, highScore);
    livesEl.textContent = lives > 0 ? "♥".repeat(lives) : "—";
  }
  function showOverlay(title, msg) {
    msgEl.textContent = msg;
    startBtn.textContent = "▶ " + title + " [ENTER]";
    overlay.classList.remove("hidden");
  }
  function hideOverlay() { overlay.classList.add("hidden"); }

  // ---------- 메인 루프 ----------
  function loop() {
    frameCount++;
    if (state === "playing") {
      if (freeze > 0) { freeze--; }
      else {
        if (frightTimer > 0) frightTimer--;
        moveEntity(pac, PAC_SPEED);
        ghosts.forEach(moveGhost);
        eatAt();
        checkGhostCollision();
        // 입 애니메이션
        pac.mouth += 0.06 * pac.mouthDir;
        if (pac.mouth > 0.28 || pac.mouth < 0) pac.mouthDir *= -1;
        if (pac.dir === DIRS.none) pac.mouth = 0.18;
      }
    }
    updateHud();
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- 입력 ----------
  function setDir(d) {
    if (state !== "playing") return;
    pac.next = d;
    if (pac.dir === DIRS.none && aligned(pac)) {
      const c = colOf(pac.x), r = rowOf(pac.y);
      if (canMove(c, r, d)) pac.dir = d;
    }
  }

  const KEYS = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
    W: "up", S: "down", A: "left", D: "right",
  };

  window.addEventListener("keydown", (e) => {
    const dirName = KEYS[e.key];
    if (dirName) {
      if (state === "playing") {
        e.preventDefault();
        setDir(DIRS[dirName]);
      }
      return;
    }
    if (e.key === "Enter" && state !== "playing") {
      if (!overlay.classList.contains("hidden")) {
        e.preventDefault();
        newGame();
      }
    }
  });

  startBtn.addEventListener("click", newGame);

  // 첫 화면용 더미 그리드 그리기
  grid = buildGrid();
  resetPositions();
  updateHud();
  highEl.textContent = highScore;
  loop();
})();
