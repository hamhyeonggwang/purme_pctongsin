/* ============================================================
   PC-TONGSIN v2.5  ::  인터랙션 스크립트
   ============================================================ */
(function () {
  "use strict";

  const bootEl = document.getElementById("boot");
  const bootLogEl = document.getElementById("bootLog");
  const screenEl = document.getElementById("screen");

  // 부팅 로그 라인 (PC통신 접속 시퀀스 패러디)
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

  let lineIdx = 0;
  let charIdx = 0;
  let finished = false;
  let timer = null;

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
    // 이미 완성된 라인들
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

  // 아무 키/클릭으로 건너뛰기
  function skipHandler() {
    if (finished) return;
    finishBoot();
  }
  window.addEventListener("keydown", skipHandler, { once: false });
  bootEl.addEventListener("click", skipHandler);

  // ---------- 실시간 시계 ----------
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

  // ---------- 푸터 기능키 버튼 스크롤 ----------
  document.querySelectorAll(".fnbar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (target === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // ---------- 숫자키(1~5)로 메뉴 이동 ----------
  const keyMap = {};
  document.querySelectorAll(".menubar a[data-key]").forEach((a) => {
    keyMap[a.getAttribute("data-key")] = a.getAttribute("href");
  });
  window.addEventListener("keydown", (e) => {
    if (!finished) return;
    if (keyMap[e.key]) {
      const el = document.querySelector(keyMap[e.key]);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // 부팅 시작
  typeBoot();
})();
