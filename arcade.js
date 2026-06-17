/* ============================================================
   PC-TONGSIN ARCADE  ::  공통 코인/사운드/랭킹 시스템
   ============================================================ */
(function () {
  "use strict";

  const SUPABASE_URL = "https://kpviyourqynlhzsqznao.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_iul4iPrWoECeurckKiaQcg_fHTmwQDi";
  const SCORE_TABLE = "game_scores";

  const GAMES = {
    pacman: "PURME-MAN",
    tetris: "TETRIS",
    galaga: "GALAGA",
    arkanoid: "ARKANOID",
  };

  const els = {
    prompt: document.getElementById("arcadePrompt"),
    leaderTitle: document.getElementById("arcadeLeaderTitle"),
    leaderList: document.getElementById("arcadeLeaderList"),
    modal: document.getElementById("arcadeNameModal"),
    form: document.getElementById("arcadeNameForm"),
    input: document.getElementById("arcadeNameInput"),
    finalScore: document.getElementById("arcadeFinalScore"),
    submit: document.getElementById("arcadeNameSubmit"),
    skip: document.getElementById("arcadeNameSkip"),
    status: document.getElementById("arcadeNameStatus"),
  };

  let currentGame = "pacman";
  let audioCtx = null;
  let promptResolve = null;
  let lastSubmittedAt = 0;

  function clampNick(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3);
  }

  function getNickname() {
    return clampNick(localStorage.getItem("purme_arcade_nickname") || "AAA").padEnd(3, "A");
  }

  function setNickname(value) {
    const nick = clampNick(value).padEnd(3, "A");
    localStorage.setItem("purme_arcade_nickname", nick);
    return nick;
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, duration, type, gain, delay) {
    const ctx = ensureAudio();
    if (!ctx) return;

    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain || 0.04, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function play(kind) {
    if (kind === "coin") {
      tone(988, 0.08, "square", 0.05, 0);
      tone(1318, 0.11, "square", 0.05, 0.08);
      return;
    }
    if (kind === "start") {
      tone(392, 0.06, "square", 0.04, 0);
      tone(523, 0.06, "square", 0.04, 0.06);
      tone(784, 0.12, "square", 0.04, 0.12);
      return;
    }
    if (kind === "gameover") {
      tone(330, 0.12, "sawtooth", 0.04, 0);
      tone(220, 0.18, "sawtooth", 0.04, 0.12);
      return;
    }
    if (kind === "score") {
      tone(1046, 0.035, "square", 0.025, 0);
      return;
    }
    tone(740, 0.045, "square", 0.025, 0);
  }

  function setPrompt(text) {
    if (els.prompt) els.prompt.textContent = text;
  }

  function setGame(gameId) {
    currentGame = GAMES[gameId] ? gameId : "pacman";
    if (els.leaderTitle) els.leaderTitle.textContent = GAMES[currentGame];
    setPrompt("PRESS START");
    fetchLeaderboard(currentGame);
  }

  function renderLeaderboard(rows, error) {
    if (!els.leaderList) return;
    els.leaderList.innerHTML = "";

    if (error) {
      const li = document.createElement("li");
      li.textContent = "RANKING OFFLINE";
      els.leaderList.appendChild(li);
      return;
    }

    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "NO SCORE YET";
      els.leaderList.appendChild(li);
      return;
    }

    rows.slice(0, 10).forEach((row, idx) => {
      const li = document.createElement("li");
      const rank = String(row.rank || idx + 1).padStart(2, "0");
      const nick = clampNick(row.nickname).padEnd(3, "A");
      const score = String(row.score || 0).padStart(6, "0");
      li.innerHTML = "<span>" + rank + ". " + nick + "</span><b>" + score + "</b>";
      els.leaderList.appendChild(li);
    });
  }

  async function fetchLeaderboard(gameId) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      renderLeaderboard([], true);
      return [];
    }

    try {
      const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/get_game_leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ p_game_id: gameId, p_limit: 10 }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = await res.json();
      renderLeaderboard(rows, false);
      return rows;
    } catch (err) {
      console.warn("[ARCADE] leaderboard unavailable:", err);
      renderLeaderboard([], true);
      return [];
    }
  }

  function openNamePrompt(score) {
    if (!els.modal || !els.form || !els.input) return Promise.resolve(getNickname());

    if (els.finalScore) els.finalScore.textContent = String(score);
    if (els.status) els.status.textContent = "3글자 닉네임을 입력하세요.";
    els.input.value = getNickname();
    els.modal.hidden = false;
    els.input.focus();
    els.input.select();

    return new Promise((resolve) => {
      promptResolve = resolve;
    });
  }

  function closeNamePrompt(value) {
    if (!promptResolve) return;
    const resolve = promptResolve;
    promptResolve = null;
    if (els.modal) els.modal.hidden = true;
    resolve(value);
  }

  async function submitScore(gameId, score, meta) {
    const numericScore = Math.max(0, Math.floor(Number(score) || 0));
    if (!GAMES[gameId] || numericScore <= 0) return;

    // Prevent accidental double-submit from repeated game-over frames.
    const now = Date.now();
    if (now - lastSubmittedAt < 700) return;
    lastSubmittedAt = now;

    play("gameover");
    setPrompt("HIGH SCORE");
    const nickname = await openNamePrompt(numericScore);
    if (!nickname) {
      setPrompt("PRESS START");
      return;
    }

    const payload = {
      game_id: gameId,
      nickname,
      score: numericScore,
      meta: meta || {},
    };

    try {
      if (els.status) els.status.textContent = "SAVING SCORE...";
      const res = await fetch(SUPABASE_URL + "/rest/v1/" + SCORE_TABLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (els.status) els.status.textContent = "SCORE SAVED.";
      play("coin");
      await fetchLeaderboard(gameId);
    } catch (err) {
      console.warn("[ARCADE] score submit failed:", err);
      if (els.status) els.status.textContent = "SAVE FAILED. SQL SETUP?";
      renderLeaderboard([], true);
    } finally {
      setPrompt("PRESS START");
    }
  }

  function start(gameId) {
    currentGame = GAMES[gameId] ? gameId : currentGame;
    setPrompt("GOOD LUCK");
    play("start");
  }

  function scoreBlip() {
    play("score");
  }

  if (els.input) {
    els.input.addEventListener("input", () => {
      els.input.value = clampNick(els.input.value);
    });
  }

  if (els.form) {
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      closeNamePrompt(setNickname(els.input.value));
    });
  }

  if (els.skip) {
    els.skip.addEventListener("click", () => closeNamePrompt(null));
  }

  document.addEventListener("keydown", (e) => {
    if (!els.modal || els.modal.hidden) return;
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      closeNamePrompt(null);
    }
  }, true);

  window.addEventListener("playgamechange", (e) => {
    setGame(e.detail);
    play("click");
  });

  window.PurmeArcade = {
    fetchLeaderboard,
    getNickname,
    play,
    scoreBlip,
    setGame,
    start,
    submitScore,
  };

  setGame(currentGame);
})();
