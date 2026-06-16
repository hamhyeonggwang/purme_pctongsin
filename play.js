/* ============================================================
   PLAY.EXE  ::  게임 선택
   ============================================================ */
(function () {
  "use strict";

  const tabs = document.querySelectorAll(".game-tabs .board-tab");
  const pacmanPanel = document.getElementById("gamePacman");
  const tetrisPanel = document.getElementById("gameTetris");
  const titleEl = document.getElementById("playWindowTitle");
  const welcomeEl = document.getElementById("playWelcome");

  if (!tabs.length || !pacmanPanel || !tetrisPanel) return;

  const TITLES = {
    pacman: "> PLAY.EXE — PURME-MAN",
    tetris: "> PLAY.EXE — TETRIS",
  };

  const WELCOME = {
    pacman: "PLAY.EXE LOADED — PURME-MAN v1.0 READY...",
    tetris: "PLAY.EXE LOADED — TETRIS v1.0 READY...",
  };

  function switchGame(id) {
    pacmanPanel.hidden = id !== "pacman";
    tetrisPanel.hidden = id !== "tetris";
    if (titleEl) titleEl.textContent = TITLES[id] || "> PLAY.EXE";
    if (welcomeEl) {
      const timeEl = welcomeEl.querySelector(".welcome-time");
      welcomeEl.textContent = (WELCOME[id] || WELCOME.pacman) + " ";
      if (timeEl) welcomeEl.appendChild(timeEl);
    }
    tabs.forEach((tab) => {
      tab.setAttribute("aria-selected", tab.getAttribute("data-game") === id ? "true" : "false");
    });
    window.dispatchEvent(new CustomEvent("playgamechange", { detail: id }));
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchGame(tab.getAttribute("data-game")));
  });

  switchGame("pacman");
})();
