/* ============================================================
   MEMBERSHIP DASHBOARD :: aggregate-only live data
   ============================================================ */
(() => {
  "use strict";

  const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";

  const els = {
    total: document.getElementById("dashTotal"),
    pending: document.getElementById("dashPending"),
    approved: document.getElementById("dashApproved"),
    recent: document.getElementById("dashRecent"),
    month: document.getElementById("dashMonth"),
    status: document.getElementById("dashStatus"),
    statuses: document.getElementById("dashStatuses"),
    connection: document.getElementById("dashConnectionText"),
  };

  function number(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function renderBars(data) {
    if (!els.statuses) return;

    const rows = [
      ["승인 대기", number(data.pending)],
      ["승인 완료", number(data.approved)],
      ["반려", number(data.rejected)],
    ];
    const max = Math.max(...rows.map(([, count]) => count), 1);
    els.statuses.textContent = "";

    rows.forEach(([label, count]) => {
      const row = document.createElement("div");
      const labelEl = document.createElement("span");
      const track = document.createElement("span");
      const fill = document.createElement("i");
      const countEl = document.createElement("b");

      row.className = "bar-row";
      labelEl.className = "bar-label";
      track.className = "bar-track";
      labelEl.textContent = label;
      fill.style.width = Math.round((count / max) * 100) + "%";
      countEl.textContent = String(count);

      track.appendChild(fill);
      row.append(labelEl, track, countEl);
      els.statuses.appendChild(row);
    });
  }

  function render(data) {
    els.total.textContent = String(number(data.total));
    els.pending.textContent = String(number(data.pending));
    els.approved.textContent = String(number(data.approved));
    els.recent.textContent = String(number(data.last_7_days));
    els.month.textContent = String(number(data.this_month));
    els.status.textContent = "LIVE";
    els.connection.textContent = "Supabase의 실제 가입 신청 집계값입니다.";
    renderBars(data);
  }

  function renderError(message) {
    ["total", "pending", "approved", "recent", "month"].forEach((key) => {
      if (els[key]) els[key].textContent = "—";
    });
    if (els.status) els.status.textContent = "ERROR";
    if (els.statuses) {
      els.statuses.innerHTML = '<p class="terminal-muted">집계 RPC를 확인해주세요.</p>';
    }
    if (els.connection) els.connection.textContent = message;
  }

  async function loadDashboard() {
    try {
      const response = await fetch(SUPABASE_URL + "/rest/v1/rpc/get_membership_dashboard", {
        method: "POST",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json"
        },
        body: "{}"
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error("HTTP " + response.status + " " + body);
      }

      const data = await response.json();
      render(data || {});
    } catch (error) {
      console.warn("Membership dashboard unavailable", error);
      renderError("실제 데이터 연결을 확인할 수 없습니다.");
    }
  }

  loadDashboard();
})();