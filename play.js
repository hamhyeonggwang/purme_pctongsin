/* ============================================================
   PLAY.EXE  ::  게임 선택
   ============================================================ */
(function () {
  "use strict";

  const tabs = document.querySelectorAll(".game-tabs .board-tab");
  const panels = {
    pacman: document.getElementById("gamePacman"),
    tetris: document.getElementById("gameTetris"),
    galaga: document.getElementById("gameGalaga"),
    arkanoid: document.getElementById("gameArkanoid"),
  };
  const titleEl = document.getElementById("playWindowTitle");
  const welcomeEl = document.getElementById("playWelcome");

  if (!tabs.length || !panels.pacman || !panels.tetris || !panels.galaga || !panels.arkanoid) return;

  const TITLES = {
    pacman: "> PLAY.EXE — PURME-MAN",
    tetris: "> PLAY.EXE — TETRIS",
    galaga: "> PLAY.EXE — GALAGA",
    arkanoid: "> PLAY.EXE — ARKANOID",
  };

  const WELCOME = {
    pacman: "PLAY.EXE LOADED — PURME-MAN v1.0 READY...",
    tetris: "PLAY.EXE LOADED — TETRIS v1.0 READY...",
    galaga: "PLAY.EXE LOADED — GALAGA v1.0 READY...",
    arkanoid: "PLAY.EXE LOADED — ARKANOID v1.0 READY...",
  };

  function switchGame(id) {
    Object.keys(panels).forEach((key) => {
      panels[key].hidden = key !== id;
    });
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
