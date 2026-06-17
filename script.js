/* ============================================================
   PC-TONGSIN v2.5  ::  인터랙션 스크립트
   ============================================================ */
(function () {
  "use strict";

  const bootEl = document.getElementById("boot");
  const bootLogEl = document.getElementById("bootLog");
  const screenEl = document.getElementById("screen");
  const isCurriculumPage = /curriculum(?:\.html)?$/.test(window.location.pathname);

  let lineIdx = 0;
  let charIdx = 0;
  let finished = false;
  let timer = null;

  const bootLines = [
    "PURME CLUB PC-TONGSIN v2.5",
    "(C) 1988-2026 PURME AI CLUB. ALL RIGHTS RESERVED.",
    "",
    "MEMORY TEST ... 640K OK",
    "DETECTING MODEM ... US ROBOTICS 56K [OK]",
    "DIALING 0 1 4 1 0 ...",
    "  ... CONNECT 56000bps",
    "HANDSHAKE ........ OK",
    "LOGIN: purme  ***********",
    "LOADING AI.MODULE .... OK",
    "WELCOME, PURME MEMBER!",
    "",
    "접속을 환영합니다. 잠시만 기다려 주세요_",
  ];

  function navigateTo(href) {
    if (!href) return;
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = href;
    }
  }

  function activateFnButton(fkey) {
    const el = document.querySelector(`.fnbar [data-fkey="${fkey}"]`);
    if (el) el.click();
  }

  function typeBoot() {
    if (lineIdx >= bootLines.length) {
      finishBoot();
      return;
    }
    const line = bootLines[lineIdx];
    bootLogEl.textContent = bootLogEl.textContent.replace(/_$/, "");

    if (charIdx <= line.length) {
      bootLogEl.textContent =
        currentText() + line.slice(0, charIdx) + "_";
      charIdx++;
      timer = setTimeout(typeBoot, line.length ? 18 : 0);
    } else {
      bootLogEl.textContent = currentText() + line + "\n";
      lineIdx++;
      charIdx = 0;
      timer = setTimeout(typeBoot, line ? 90 : 30);
    }
  }

  function currentText() {
    return bootLines.slice(0, lineIdx).join("\n") + (lineIdx > 0 ? "\n" : "");
  }

  function finishBoot() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    setTimeout(() => {
      bootEl.style.transition = "opacity 0.4s";
      bootEl.style.opacity = "0";
      setTimeout(() => {
        bootEl.remove();
        screenEl.hidden = false;
        startClock();
      }, 400);
    }, 600);
  }

  function skipHandler() {
    if (finished) return;
    finishBoot();
  }

  function startClock() {
    const timeEl = document.getElementById("welcomeTime");
    if (!timeEl) return;
    function pad(n) { return String(n).padStart(2, "0"); }
    function tick() {
      const d = new Date();
      const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      timeEl.textContent = `${date}  ${time}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  document.querySelectorAll(".fnbar button, .fnbar a[data-fkey]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const href = btn.getAttribute("data-href");
      const target = btn.getAttribute("data-target");
      if (href) {
        window.location.href = href;
      } else if (target) {
        navigateTo(target);
      }
    });
  });

  const keyMap = {};
  document.querySelectorAll(".menubar a[data-key]").forEach((a) => {
    keyMap[a.getAttribute("data-key")] = a.getAttribute("href");
  });

  window.addEventListener("keydown", (e) => {
    if (!finished) return;

    const fnMatch = e.key.match(/^F(\d+)$/);
    if (fnMatch) {
      e.preventDefault();
      activateFnButton(fnMatch[1]);
      return;
    }

    if (keyMap[e.key]) {
      if (isCurriculumPage && (e.key === "1" || e.key === "2" || e.key === "3")) return;
      e.preventDefault();
      navigateTo(keyMap[e.key]);
    }
  });

  if (bootEl && bootLogEl) {
    window.addEventListener("keydown", skipHandler, { once: false });
    bootEl.addEventListener("click", skipHandler);
    typeBoot();
  } else {
    finished = true;
    if (screenEl) screenEl.hidden = false;
    startClock();
  }
})();
