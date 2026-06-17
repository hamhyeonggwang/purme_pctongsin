/* ============================================================
   PURME-TETRIS  ::  PC통신 테마 테트리스
   순수 Canvas / 의존성 없음
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("tetrisCanvas");
  const nextCanvas = document.getElementById("tetrisNext");
  const panel = document.getElementById("gameTetris");
  if (!canvas || !panel) return;

  const ctx = canvas.getContext("2d");
  const nextCtx = nextCanvas ? nextCanvas.getContext("2d") : null;

  const COLS = 10;
  const ROWS = 20;
  const CELL = 20;

  const PIECES = [
    {
      id: "I",
      color: "#5bd2ff",
      matrix: [
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
        [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
      ],
    },
    {
      id: "O",
      color: "#ffe14d",
      matrix: [
        [[1, 1], [1, 1]],
        [[1, 1], [1, 1]],
        [[1, 1], [1, 1]],
        [[1, 1], [1, 1]],
      ],
    },
    {
      id: "T",
      color: "#ff9ce0",
      matrix: [
        [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
        [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
        [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
      ],
    },
    {
      id: "S",
      color: "#5b8cff",
      matrix: [
        [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
        [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
        [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
      ],
    },
    {
      id: "Z",
      color: "#ff4d5b",
      matrix: [
        [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
        [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
        [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
        [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
      ],
    },
    {
      id: "J",
      color: "#5bd2ff",
      matrix: [
        [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
        [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
        [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
      ],
    },
    {
      id: "L",
      color: "#ffb05b",
      matrix: [
        [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
        [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
        [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
      ],
    },
  ];

  const LINE_SCORES = [0, 100, 300, 500, 800];

  const overlay = document.getElementById("tetrisOverlay");
  const msgEl = document.getElementById("tetrisMsg");
  const startBtn = document.getElementById("tetrisStartBtn");
  const scoreEl = document.getElementById("tScore");
  const highEl = document.getElementById("tHigh");
  const linesEl = document.getElementById("tLines");
  const levelEl = document.getElementById("tLevel");

  let board = [];
  let active = null;
  let nextPiece = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let highScore = Number(localStorage.getItem("purmetris_high") || 0);
  let state = "ready";
  let dropCounter = 0;
  let dropInterval = 800;
  let lastTime = 0;
  let animId = null;
  let clearFX = null;
  let particles = [];

  function isActive() {
    return !panel.hidden;
  }

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function randomPiece() {
    const def = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
      def,
      rot: 0,
      x: Math.floor((COLS - def.matrix[0][0].length) / 2),
      y: 0,
    };
  }

  function matrixOf(piece) {
    return piece.def.matrix[piece.rot % piece.def.matrix.length];
  }

  function collides(piece, offX, offY, rot) {
    const mat = piece.def.matrix[rot % piece.def.matrix.length];
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) continue;
        const x = piece.x + c + offX;
        const y = piece.y + r + offY;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  function mergePiece() {
    const mat = matrixOf(active);
    mat.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        const y = active.y + r;
        const x = active.x + c;
        if (y >= 0) board[y][x] = active.def.color;
      });
    });
  }

  function findFullRows() {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every((cell) => cell)) rows.push(r);
    }
    return rows;
  }

  function removeRows(rowIndices) {
    const set = new Set(rowIndices);
    board = board.filter((_, i) => !set.has(i));
    while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
  }

  function applyLineScore(cleared) {
    if (cleared <= 0) return;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 800 - (level - 1) * 60);
    score += LINE_SCORES[cleared] * level;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("purmetris_high", String(highScore));
    }
    if (window.PurmeArcade) window.PurmeArcade.play(cleared >= 4 ? "coin" : "score");
    updateHud();
  }

  function spawnParticlesForRows(rows, lineCount) {
    rows.forEach((r) => {
      for (let c = 0; c < COLS; c++) {
        const color = board[r][c];
        if (!color) continue;
        const baseX = c * CELL + CELL / 2;
        const baseY = r * CELL + CELL / 2;
        const shards = lineCount >= 4 ? 6 : 4;
        for (let i = 0; i < shards; i++) {
          const angle = (Math.PI * 2 * i) / shards + (Math.random() - 0.5) * 0.5;
          const speed = 2 + Math.random() * 5;
          particles.push({
            x: baseX + (Math.random() - 0.5) * 8,
            y: baseY + (Math.random() - 0.5) * 8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            color,
            life: 1,
            decay: 0.02 + Math.random() * 0.025,
            size: 3 + Math.random() * 4,
            spin: Math.random() > 0.5 ? 1 : -1,
          });
        }
      }
    });
  }

  function startLineClear(rows) {
    state = "clearing";
    clearFX = {
      rows: rows.slice(),
      phase: "flash",
      flashStep: 0,
      flashMax: rows.length >= 4 ? 10 : 7,
      flashTimer: 0,
      lineCount: rows.length,
    };
  }

  function beginLineBreak() {
    if (!clearFX) return;
    spawnParticlesForRows(clearFX.rows, clearFX.lineCount);
    removeRows(clearFX.rows);
    applyLineScore(clearFX.lineCount);
    clearFX.phase = "break";
    clearFX.rows = [];
  }

  function finishLineClear() {
    clearFX = null;
    particles = [];
    state = "playing";
    spawn();
    updateHud();
  }

  function updateClearFX(delta) {
    if (!clearFX) return;

    if (clearFX.phase === "flash") {
      clearFX.flashTimer += delta;
      if (clearFX.flashTimer >= 55) {
        clearFX.flashTimer = 0;
        clearFX.flashStep++;
        if (clearFX.flashStep >= clearFX.flashMax) beginLineBreak();
      }
      return;
    }

    if (clearFX.phase === "break") {
      const dt = Math.min(delta / 16, 2.5);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.3 * dt;
        p.vx *= 0.99;
        p.life -= p.decay * dt;
        p.size = Math.max(1, p.size - 0.06 * dt);
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (particles.length === 0) finishLineClear();
    }
  }

  function spawn() {
    active = nextPiece || randomPiece();
    nextPiece = randomPiece();
    if (collides(active, 0, 0, active.rot)) {
      state = "over";
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("purmetris_high", String(highScore));
      }
      updateHud();
      showOverlay("RETRY", "GAME OVER — ENTER 다시하기");
      if (window.PurmeArcade) {
        window.PurmeArcade.submitScore("tetris", score, { lines, level });
      }
    }
  }

  function hardDrop() {
    if (state !== "playing" || !active) return;
    let dropped = 0;
    while (!collides(active, 0, 1, active.rot)) {
      active.y++;
      dropped++;
    }
    score += dropped * 2;
    lockActive();
  }

  function lockActive() {
    mergePiece();
    active = null;
    const fullRows = findFullRows();
    if (fullRows.length > 0) {
      startLineClear(fullRows);
    } else {
      spawn();
      updateHud();
    }
  }

  function move(dx) {
    if (state !== "playing" || !active) return;
    if (!collides(active, dx, 0, active.rot)) active.x += dx;
  }

  function softDrop() {
    if (state !== "playing" || !active) return;
    if (!collides(active, 0, 1, active.rot)) {
      active.y++;
      score += 1;
    } else {
      lockActive();
    }
    updateHud();
  }

  function rotate() {
    if (state !== "playing" || !active) return;
    const nextRot = (active.rot + 1) % active.def.matrix.length;
    const kicks = [0, -1, 1, -2, 2];
    for (let i = 0; i < kicks.length; i++) {
      if (!collides(active, kicks[i], 0, nextRot)) {
        active.x += kicks[i];
        active.rot = nextRot;
        return;
      }
    }
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = score;
    if (highEl) highEl.textContent = highScore;
    if (linesEl) linesEl.textContent = lines;
    if (levelEl) levelEl.textContent = level;
  }

  function showOverlay(title, msg) {
    if (msgEl) msgEl.textContent = msg;
    if (startBtn) startBtn.textContent = "▶ " + title + " [ENTER]";
    if (overlay) overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    if (overlay) overlay.classList.add("hidden");
  }

  function drawCell(context, x, y, color, size, glow) {
    const pad = 1;
    const px = x * size + pad;
    const py = y * size + pad;
    const s = size - pad * 2;
    context.fillStyle = color;
    context.fillRect(px, py, s, s);
    if (glow) {
      context.fillStyle = "rgba(0, 224, 255, 0.45)";
      context.fillRect(px, py, s, s);
    }
    context.fillStyle = "rgba(255,255,255,0.25)";
    context.fillRect(px, py, s, 2);
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      const half = p.size / 2;
      ctx.fillRect(p.x - half, p.y - half, p.size, p.size);
      ctx.fillStyle = "rgba(232, 240, 255, 0.6)";
      ctx.fillRect(p.x - half, p.y - half, p.size, 1);
    });
    ctx.globalAlpha = 1;
  }

  function drawClearFlash() {
    if (!clearFX || clearFX.phase !== "flash") return;
    const flashOn = clearFX.flashStep % 2 === 0;
    clearFX.rows.forEach((r) => {
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c]) continue;
        const color = flashOn ? "#e8f0ff" : board[r][c];
        drawCell(ctx, c, r, color, CELL, flashOn);
      }
      if (flashOn) {
        ctx.fillStyle = "rgba(0, 224, 255, 0.12)";
        ctx.fillRect(0, r * CELL, COLS * CELL, CELL);
      }
    });
    if (clearFX.lineCount >= 4 && flashOn) {
      ctx.fillStyle = "rgba(0, 224, 255, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawBoard() {
    ctx.fillStyle = "#04061f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const flashRows = clearFX && clearFX.phase === "flash" ? new Set(clearFX.rows) : null;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (flashRows && flashRows.has(r)) continue;
        if (board[r][c]) drawCell(ctx, c, r, board[r][c], CELL, false);
        else {
          ctx.strokeStyle = "rgba(43, 70, 184, 0.25)";
          ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
    }

    drawClearFlash();

    if (active && state === "playing") {
      const mat = matrixOf(active);
      mat.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v && active.y + r >= 0) {
            drawCell(ctx, active.x + c, active.y + r, active.def.color, CELL, false);
          }
        });
      });
    }

    drawParticles();
  }

  function drawNext() {
    if (!nextCtx || !nextCanvas) return;
    nextCtx.fillStyle = "#04061f";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;

    const mat = nextPiece.def.matrix[0];
    const size = 16;
    const offX = Math.floor((nextCanvas.width / size - mat[0].length) / 2);
    const offY = Math.floor((nextCanvas.height / size - mat.length) / 2);
    mat.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v) drawCell(nextCtx, offX + c, offY + r, nextPiece.def.color, size);
      });
    });
  }

  function draw() {
    if (!isActive()) return;
    drawBoard();
    drawNext();
  }

  function update(time = 0) {
    if (!isActive()) {
      animId = requestAnimationFrame(update);
      return;
    }

    const delta = time - lastTime;
    lastTime = time;

    if (state === "playing") {
      dropCounter += delta;
      if (dropCounter >= dropInterval) {
        softDrop();
        dropCounter = 0;
      }
    }

    if (state === "clearing") updateClearFX(delta);

    draw();
    animId = requestAnimationFrame(update);
  }

  function newGame() {
    if (window.PurmeArcade) window.PurmeArcade.start("tetris");
    board = emptyBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 800;
    dropCounter = 0;
    clearFX = null;
    particles = [];
    nextPiece = randomPiece();
    spawn();
    state = "playing";
    hideOverlay();
    updateHud();
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

  const MOVE_KEYS = {
    ArrowLeft: -1, a: -1, A: -1,
    ArrowRight: 1, d: 1, D: 1,
  };

  window.addEventListener("keydown", (e) => {
    if (!isActive()) return;

    if (MOVE_KEYS[e.key] !== undefined) {
      if (state === "playing") {
        e.preventDefault();
        move(MOVE_KEYS[e.key]);
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      if (state === "playing") {
        e.preventDefault();
        softDrop();
      }
      return;
    }

    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      if (state === "playing") {
        e.preventDefault();
        rotate();
      }
      return;
    }

    if (e.key === " ") {
      if (state === "playing") {
        e.preventDefault();
        hardDrop();
      }
      return;
    }

    if (e.key === "p" || e.key === "P") {
      if (state === "playing" || state === "paused") {
        e.preventDefault();
        togglePause();
      }
      return;
    }

    if (e.key === "Enter") {
      if (state === "ready" || state === "over") {
        e.preventDefault();
        newGame();
      } else if (state === "paused") {
        e.preventDefault();
        state = "playing";
        hideOverlay();
      }
    }
  });

  if (startBtn) startBtn.addEventListener("click", newGame);

  window.addEventListener("playgamechange", (e) => {
    if (e.detail === "tetris" && state === "ready") {
      draw();
      updateHud();
      highEl.textContent = highScore;
    }
  });

  board = emptyBoard();
  updateHud();
  if (highEl) highEl.textContent = highScore;
  showOverlay("START", "방향키 / WASD · SPACE 하드드롭 · P 일시정지");
  animId = requestAnimationFrame(update);
})();
