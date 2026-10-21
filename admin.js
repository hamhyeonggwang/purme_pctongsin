import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce"
  }
});

const els = {
  login: document.getElementById("adminLogin"),
  loginForm: document.getElementById("adminLoginForm"),
  email: document.getElementById("adminEmail"),
  loginStatus: document.getElementById("adminLoginStatus"),
  app: document.getElementById("adminApp"),
  appStatus: document.getElementById("adminAppStatus"),
  sessionLabel: document.getElementById("adminSessionLabel"),
  signOut: document.getElementById("adminSignOut"),
  refresh: document.getElementById("adminRefresh"),
  list: document.getElementById("adminRequestList"),
  total: document.getElementById("adminTotal"),
  pending: document.getElementById("adminPending"),
  approved: document.getElementById("adminApproved"),
  rejected: document.getElementById("adminRejected"),
  tabs: [...document.querySelectorAll("[data-filter]")]
};

let activeFilter = "pending";
let currentSession = null;

function setStatus(el, message, type = "") {
  if (!el) return;
  el.className = "admin-status" + (type ? " " + type : "");
  el.textContent = message;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function statusLabel(status) {
  return {
    pending: "승인 대기",
    approved: "승인 완료",
    rejected: "반려"
  }[status] || status;
}

async function checkAdmin() {
  const { data, error } = await supabase.rpc("is_pc_admin");
  if (error) throw error;
  return data === true;
}

async function loadSummary() {
  const { data, error } = await supabase.rpc("get_membership_dashboard");
  if (error) throw error;

  els.total.textContent = String(data?.total ?? 0);
  els.pending.textContent = String(data?.pending ?? 0);
  els.approved.textContent = String(data?.approved ?? 0);
  els.rejected.textContent = String(data?.rejected ?? 0);
}

async function loadRequests() {
  setStatus(els.appStatus, "불러오는 중…");
  els.list.textContent = "";

  const params = { p_status: activeFilter === "all" ? null : activeFilter };
  const { data, error } = await supabase.rpc("get_admin_join_requests", params);

  if (error) {
    console.error(error);
    setStatus(els.appStatus, "가입 신청 목록을 불러오지 못했습니다.", "error");
    return;
  }

  renderRequests(data || []);
  setStatus(els.appStatus, data?.length ? "" : "해당 상태의 신청이 없습니다.");
}

function renderRequests(rows) {
  els.list.textContent = "";

  rows.forEach((row) => {
    const article = document.createElement("article");
    article.className = "admin-request";

    const top = document.createElement("div");
    top.className = "admin-request-top";

    const identity = document.createElement("div");
    const name = document.createElement("h2");
    const dept = document.createElement("p");
    name.textContent = row.name;
    dept.textContent = row.department;
    identity.append(name, dept);

    const badge = document.createElement("span");
    badge.className = "admin-badge " + row.status;
    badge.textContent = statusLabel(row.status);

    top.append(identity, badge);

    const meta = document.createElement("dl");
    meta.className = "admin-request-meta";

    const fields = [
      ["EMAIL", row.email],
      ["REQUESTED", formatDate(row.created_at)],
      ["REVIEWED", formatDate(row.reviewed_at)]
    ];

    fields.forEach(([label, value]) => {
      const item = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      item.append(dt, dd);
      meta.appendChild(item);
    });

    article.append(top, meta);

    if (row.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "button admin-approve";
      approve.textContent = "승인";
      approve.addEventListener("click", () => review(row.id, "approved", row.name));

      const reject = document.createElement("button");
      reject.type = "button";
      reject.className = "button admin-reject";
      reject.textContent = "반려";
      reject.addEventListener("click", () => review(row.id, "rejected", row.name));

      actions.append(approve, reject);
      article.appendChild(actions);
    }

    els.list.appendChild(article);
  });
}

async function review(id, decision, name) {
  const label = decision === "approved" ? "승인" : "반려";
  if (!window.confirm(`${name} 신청을 ${label} 처리할까요?`)) return;

  setStatus(els.appStatus, `${label} 처리 중…`);

  let error = null;

  if (decision === "approved") {
    const response = await supabase.functions.invoke("approve-member", {
      body: { request_id: id }
    });
    error = response.error;
  } else {
    const response = await supabase.rpc("review_join_request", {
      p_request_id: id,
      p_decision: "rejected"
    });
    error = response.error;
  }

  if (error) {
    console.error(error);
    setStatus(els.appStatus, `${label} 처리에 실패했습니다.`, "error");
    return;
  }

  setStatus(
    els.appStatus,
    decision === "approved"
      ? "승인 완료 · 회원 초대 메일을 발송했습니다."
      : "반려 처리했습니다.",
    "success"
  );

  await Promise.all([loadSummary(), loadRequests()]);
}

function setFilter(filter) {
  activeFilter = filter;
  els.tabs.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.filter === filter));
  });
  loadRequests();
}

async function enterAdmin(session) {
  currentSession = session;
  const allowed = await checkAdmin();

  if (!allowed) {
    els.login.hidden = false;
    els.app.hidden = true;
    els.sessionLabel.textContent = "NO ADMIN ACCESS";
    els.signOut.hidden = false;
    setStatus(els.loginStatus, "이 계정에는 운영진 권한이 없습니다.", "error");
    return;
  }

  els.login.hidden = true;
  els.app.hidden = false;
  els.signOut.hidden = false;
  els.sessionLabel.textContent = session.user.email || "SIGNED IN";
  setStatus(els.loginStatus, "");

  await Promise.all([loadSummary(), loadRequests()]);
}

async function syncSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setStatus(els.loginStatus, "로그인 상태를 확인하지 못했습니다.", "error");
    return;
  }

  if (data.session) {
    try {
      await enterAdmin(data.session);
    } catch (err) {
      console.error(err);
      setStatus(els.loginStatus, "관리자 권한 확인에 실패했습니다.", "error");
    }
  } else {
    currentSession = null;
    els.login.hidden = false;
    els.app.hidden = true;
    els.signOut.hidden = true;
    els.sessionLabel.textContent = "SIGNED OUT";
  }
}

els.loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = els.email.value.trim().toLowerCase();
  if (!email) return;

  setStatus(els.loginStatus, "로그인 링크를 보내는 중…");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: window.location.origin + "/admin"
    }
  });

  if (error) {
    console.error(error);
    setStatus(els.loginStatus, "등록된 운영진 계정을 확인해주세요.", "error");
    return;
  }

  setStatus(els.loginStatus, "이메일의 로그인 링크를 확인해주세요.", "success");
});

els.signOut?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.replace("/admin");
});

els.refresh?.addEventListener("click", async () => {
  await Promise.all([loadSummary(), loadRequests()]);
});

els.tabs.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session && session !== currentSession) {
    enterAdmin(session).catch(console.error);
  }
});

syncSession();
