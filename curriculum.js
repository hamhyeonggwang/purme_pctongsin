/* ============================================================
   PC-TONGSIN v2.5  ::  커리큘럼 터미널 인터랙션
   ============================================================ */
(function () {
  "use strict";

  const TRACKS = {
    beginner: {
      label: "LV.1 AI 활용가",
      log: [
        "> CONNECTING TO OPENAI ACADEMY...",
        "",
        "USER VERIFIED",
        "LOADING CURRICULUM DATA...",
        "",
        "READY.",
        "",
      ],
      header: "NO  TITLE                    OUTPUT",
      divider: "──  ───────────────────────  ──────────────────",
      rows: [
        ["01", "생성형 AI 이해", "AI 활용 계획서"],
        ["02", "프롬프트 기본", "업무용 템플릿"],
        ["03", "문서 자동화", "보고서 초안"],
        ["04", "이메일·메시지 작성", "커뮤니케이션 키트"],
        ["05", "회의록·요약", "회의 요약본"],
        ["06", "검색·리서치", "조사 자료 정리"],
        ["07", "데이터 분석 기초", "분석 보고서"],
        ["08", "이미지·디자인 활용", "시각 자료"],
        ["09", "협업 워크플로우", "팀 공유 템플릿"],
        ["10", "개인 프로젝트 기획", "프로젝트 계획서"],
        ["11", "중간 발표", "중간 성과물"],
        ["12", "성과 발표회", "최종 프로젝트"],
      ],
    },
    intermediate: {
      label: "LV.2 AI 제작자",
      log: [
        "> CONNECTING TO OPENAI ACADEMY...",
        "",
        "USER VERIFIED",
        "LOADING CURRICULUM DATA...",
        "",
        "READY.",
        "",
      ],
      header: "NO  TITLE                    OUTPUT",
      divider: "──  ───────────────────────  ──────────────────",
      rows: [
        ["01", "AI 도구 생태계", "도구 비교표"],
        ["02", "API 기초 이해", "API 문서"],
        ["03", "ChatGPT GPTs 제작", "커스텀 GPT"],
        ["04", "자동화 워크플로우", "Zapier/Make 플로우"],
        ["05", "스크립트 기초", "간단 자동화 스크립트"],
        ["06", "노코드 앱 빌더", "미니 앱 프로토타입"],
        ["07", "데이터 파이프라인", "데이터 처리 흐름도"],
        ["08", "RAG 기초", "지식베이스 구축"],
        ["09", "멀티모달 활용", "멀티모달 산출물"],
        ["10", "팀 자동화 설계", "자동화 설계서"],
        ["11", "프로젝트 개발", "베타 버전"],
        ["12", "성과 발표회", "최종 프로젝트"],
      ],
    },
    advanced: {
      label: "LV.3 AI 설계자",
      log: [
        "> CONNECTING TO OPENAI ACADEMY...",
        "",
        "USER VERIFIED",
        "LOADING CURRICULUM DATA...",
        "",
        "READY.",
        "",
      ],
      header: "NO  TITLE                    OUTPUT",
      divider: "──  ───────────────────────  ──────────────────",
      rows: [
        ["01", "AI 아키텍처 개요", "아키텍처 다이어그램"],
        ["02", "요구사항 분석", "요구사항 정의서"],
        ["03", "프롬프트 엔지니어링 심화", "프롬프트 체계"],
        ["04", "에이전트 설계", "에이전트 설계서"],
        ["05", "API 통합", "통합 시나리오"],
        ["06", "보안·윤리", "가이드라인 문서"],
        ["07", "비용·성능 최적화", "최적화 보고서"],
        ["08", "조직 도입 전략", "도입 로드맵"],
        ["09", "POC 기획", "POC 계획서"],
        ["10", "POC 개발", "POC 프로토타입"],
        ["11", "확장 계획", "확장 로드맵"],
        ["12", "성과 발표회", "최종 프로젝트"],
      ],
    },
  };

  const SPEED = { log: 50, title: 40, body: 20 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const menuEl = document.getElementById("curriculumMenu");
  const terminalEl = document.getElementById("curriculumTerminal");
  const outputEl = document.getElementById("curriculumOutput");
  const trackNameEl = document.getElementById("curriculumTrackName");
  const promptEl = document.getElementById("curriculumPrompt");
  const actionsEl = document.getElementById("curriculumActions");
  const skipBtn = document.getElementById("curriculumSkip");
  const enterBtn = document.getElementById("curriculumEnter");
  const escBtn = document.getElementById("curriculumEsc");
  const applyBtn = document.getElementById("curriculumApplyBtn");
  const tabs = document.querySelectorAll(".board-tab");

  if (!terminalEl || !outputEl) return;

  let activeTrack = null;
  let animToken = 0;
  let timerId = null;
  let terminalActive = false;

  function cancelAnimation() {
    animToken++;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function formatRow(no, title, output) {
    const t = title.padEnd(24, " ");
    return `${no}  ${t}  ${output}`;
  }

  function buildFullText(track) {
    const data = TRACKS[track];
    if (!data) return "";
    const lines = [
      ...data.log,
      data.header,
      data.divider,
      ...data.rows.map(([no, title, output]) => formatRow(no, title, output)),
      "",
    ];
    return lines.join("\n");
  }

  function buildSegments(track) {
    const data = TRACKS[track];
    if (!data) return [];
    const segments = [];

    data.log.forEach((line) => {
      segments.push({ text: line + "\n", speed: SPEED.log, type: "log" });
    });

    segments.push({ text: data.header + "\n", speed: SPEED.title, type: "title" });
    segments.push({ text: data.divider + "\n", speed: SPEED.title, type: "title" });

    data.rows.forEach(([no, title, output]) => {
      segments.push({
        text: formatRow(no, title, output) + "\n",
        speed: SPEED.body,
        type: "body",
      });
    });

    segments.push({ text: "\n", speed: 0, type: "body" });
    return segments;
  }

  function scrollToBottom() {
    outputEl.scrollTop = outputEl.scrollHeight;
    terminalEl.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  function showTerminal(track) {
    cancelAnimation();
    activeTrack = track;
    terminalActive = true;
    const data = TRACKS[track];

    menuEl.hidden = true;
    terminalEl.hidden = false;
    promptEl.hidden = true;
    actionsEl.hidden = true;
    trackNameEl.textContent = data.label;
    outputEl.textContent = "";

    tabs.forEach((tab) => {
      tab.setAttribute("aria-selected", tab.getAttribute("data-track") === track ? "true" : "false");
    });

    if (reducedMotion) {
      outputEl.textContent = buildFullText(track);
      promptEl.hidden = false;
      actionsEl.hidden = false;
      scrollToBottom();
      return;
    }

    runTypewriter(track);
  }

  function runTypewriter(track) {
    cancelAnimation();
    const token = ++animToken;
    const segments = buildSegments(track);
    let segIdx = 0;
    let charIdx = 0;
    let displayed = "";

    function finish() {
      if (token !== animToken) return;
      promptEl.hidden = false;
      actionsEl.hidden = false;
      scrollToBottom();
    }

    function step() {
      if (token !== animToken) return;

      if (segIdx >= segments.length) {
        finish();
        return;
      }

      const seg = segments[segIdx];
      if (charIdx < seg.text.length) {
        displayed += seg.text[charIdx];
        outputEl.textContent = displayed;
        charIdx++;
        scrollToBottom();
        timerId = setTimeout(step, seg.speed);
      } else {
        segIdx++;
        charIdx = 0;
        timerId = setTimeout(step, 0);
      }
    }

    step();
  }

  function showMenu() {
    cancelAnimation();
    activeTrack = null;
    terminalActive = false;
    menuEl.hidden = false;
    terminalEl.hidden = true;
    outputEl.textContent = "";
    promptEl.hidden = true;
    actionsEl.hidden = true;

    tabs.forEach((tab) => tab.setAttribute("aria-selected", "false"));
  }

  function skipToEnd() {
    if (!activeTrack || reducedMotion) return;
    cancelAnimation();
    outputEl.textContent = buildFullText(activeTrack);
    promptEl.hidden = false;
    actionsEl.hidden = false;
    scrollToBottom();
  }

  function goToJoin() {
    window.location.href = "joinin";
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const track = tab.getAttribute("data-track");
      if (track === activeTrack && terminalActive) return;
      showTerminal(track);
    });
  });

  if (skipBtn) skipBtn.addEventListener("click", skipToEnd);
  if (enterBtn) enterBtn.addEventListener("click", goToJoin);
  if (escBtn) escBtn.addEventListener("click", showMenu);
  if (applyBtn) applyBtn.addEventListener("click", goToJoin);

  document.addEventListener("keydown", (e) => {
    const inCurriculum = document.getElementById("curriculum");
    if (!inCurriculum) return;

    const rect = inCurriculum.getBoundingClientRect();
    const visible = rect.top < window.innerHeight && rect.bottom > 0;
    if (!visible && !terminalActive) return;

    if (!terminalActive) {
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        const tab = document.querySelector(`.board-tab[data-key="${e.key}"]`);
        if (tab) {
          e.preventDefault();
          showTerminal(tab.getAttribute("data-track"));
        }
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      showMenu();
      return;
    }

    if (e.key === "Enter" && actionsEl && !actionsEl.hidden) {
      e.preventDefault();
      goToJoin();
    }
  });

  window.addEventListener("beforeunload", cancelAnimation);
})();
