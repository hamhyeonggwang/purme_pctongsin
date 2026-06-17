/* ============================================================
   DASHBOARD.SYS  ::  익명 가입 통계
   ============================================================ */
(function () {
  "use strict";

  const SUPABASE_URL = "https://kpviyourqynlhzsqznao.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_iul4iPrWoECeurckKiaQcg_fHTmwQDi";

  const els = {
    total: document.getElementById("dashTotal"),
    status: document.getElementById("dashStatus"),
    levels: document.getElementById("dashLevels"),
    interests: document.getElementById("dashInterests"),
    tools: document.getElementById("dashTools"),
    styles: document.getElementById("dashStyles"),
  };

  const DEMO = {
    total: 12,
    levels: { "AI 처음": 5, "기본 사용": 4, "업무 활용 중": 3 },
    interests: { "문서 자동화": 6, "데이터 분석": 4, "이미지/콘텐츠": 3, "업무 챗봇": 2 },
    tools: { ChatGPT: 7, Gemini: 4, Copilot: 3, NotionAI: 2 },
    meeting_styles: { "오프라인": 6, "온라인": 4, "혼합": 2 },
  };

  function entries(data) {
    return Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  }

  function renderBars(el, data) {
    if (!el) return;
    const rows = entries(data);
    const max = rows.reduce((acc, row) => Math.max(acc, Number(row[1]) || 0), 1);
    el.textContent = "";

    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "terminal-muted";
      empty.textContent = "NO DATA";
      el.appendChild(empty);
      return;
    }

    rows.forEach(([label, count]) => {
      const width = Math.max(8, Math.round((Number(count) / max) * 100));
      const row = document.createElement("div");
      const labelEl = document.createElement("span");
      const track = document.createElement("span");
      const fill = document.createElement("i");
      const countEl = document.createElement("b");

      row.className = "bar-row";
      labelEl.className = "bar-label";
      track.className = "bar-track";
      labelEl.textContent = label;
      fill.style.width = `${width}%`;
      countEl.textContent = count;

      track.appendChild(fill);
      row.append(labelEl, track, countEl);
      el.appendChild(row);
    });
  }

  function render(data, mode) {
    els.total.textContent = String(data.total || 0).padStart(2, "0");
    els.status.textContent = mode;
    renderBars(els.levels, data.levels);
    renderBars(els.interests, data.interests);
    renderBars(els.tools, data.tools);
    renderBars(els.styles, data.meeting_styles);
  }

  async function loadDashboard() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_signup_dashboard`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      render(data, "LIVE");
    } catch (error) {
      console.warn("Dashboard RPC unavailable. Rendering demo data.", error);
      render(DEMO, "DEMO");
    }
  }

  loadDashboard();
})();
