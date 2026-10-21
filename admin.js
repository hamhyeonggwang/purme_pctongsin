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
  password: document.getElementById("adminPassword"),
  resetPassword: document.getElementById("adminResetPassword"),
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
  tabs: [...document.querySelectorAll("[data-filter]")],
  projectStatus: document.getElementById("adminProjectStatus"),
  projectList: document.getElementById("adminProjectList"),
  projectTabs: [...document.querySelectorAll("[data-project-filter]")],
  archiveForm: document.getElementById("adminArchiveForm"),
  archiveTitle: document.getElementById("archiveTitle"),
  archiveCategory: document.getElementById("archiveCategory"),
  archiveDescription: document.getElementById("archiveDescription"),
  archiveFile: document.getElementById("archiveFile"),
  archiveStatus: document.getElementById("adminArchiveStatus"),
  archiveList: document.getElementById("adminArchiveList"),
  newsForm: document.getElementById("adminNewsForm"),
  newsSource: document.getElementById("newsSource"),
  newsPublishedAt: document.getElementById("newsPublishedAt"),
  newsTitle: document.getElementById("newsTitle"),
  newsSummary: document.getElementById("newsSummary"),
  newsSourceUrl: document.getElementById("newsSourceUrl"),
  newsImageUrl: document.getElementById("newsImageUrl"),
  newsFeatured: document.getElementById("newsFeatured"),
  newsPublished: document.getElementById("newsPublished"),
  newsStatus: document.getElementById("adminNewsStatus"),
  newsList: document.getElementById("adminNewsList")
};

let activeFilter = "pending";
let activeProjectFilter = "pending";
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

  await Promise.all([loadSummary(), loadRequests(), loadProjectApplications()]);
}

function setFilter(filter) {
  activeFilter = filter;
  els.tabs.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.filter === filter));
  });
  loadRequests();
}

async function loadProjectApplications() {
  if (!els.projectList) return;
  setStatus(els.projectStatus, "불러오는 중…");
  els.projectList.textContent = "";

  const { data, error } = await supabase.rpc("get_admin_project_applications", {
    p_status: activeProjectFilter === "all" ? null : activeProjectFilter
  });

  if (error) {
    console.error(error);
    setStatus(els.projectStatus, "프로젝트 신청 목록을 불러오지 못했습니다.", "error");
    return;
  }

  const rows = data || [];
  setStatus(els.projectStatus, rows.length ? "" : "해당 상태의 프로젝트 신청이 없습니다.");

  rows.forEach((row) => {
    const article = document.createElement("article");
    article.className = "admin-request";

    const top = document.createElement("div");
    top.className = "admin-request-top";
    const identity = document.createElement("div");
    const name = document.createElement("h2");
    const dept = document.createElement("p");
    name.textContent = row.applicant_name;
    dept.textContent = row.applicant_department;
    identity.append(name, dept);

    const badge = document.createElement("span");
    badge.className = "admin-badge " + row.status;
    badge.textContent = statusLabel(row.status);
    top.append(identity, badge);

    const meta = document.createElement("dl");
    meta.className = "admin-request-meta";
    const fields = [
      ["PROJECT", row.project_code + " · " + row.project_title],
      ["EMAIL", row.applicant_email],
      ["REQUESTED", formatDate(row.created_at)]
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
      approve.addEventListener("click", () => reviewProject(row.id, "approved", row.applicant_name, row.project_title));

      const reject = document.createElement("button");
      reject.type = "button";
      reject.className = "button admin-reject";
      reject.textContent = "반려";
      reject.addEventListener("click", () => reviewProject(row.id, "rejected", row.applicant_name, row.project_title));

      actions.append(approve, reject);
      article.appendChild(actions);
    }

    els.projectList.appendChild(article);
  });
}

async function reviewProject(id, decision, name, projectTitle) {
  const label = decision === "approved" ? "승인" : "반려";
  if (!window.confirm(`${name}의 ‘${projectTitle}’ 참여 신청을 ${label}할까요?`)) return;

  setStatus(els.projectStatus, `${label} 처리 중…`);
  const { error } = await supabase.rpc("review_project_application", {
    p_application_id: id,
    p_decision: decision
  });

  if (error) {
    console.error(error);
    const message = String(error.message || "").includes("capacity")
      ? "프로젝트 정원이 모두 찼습니다."
      : `${label} 처리에 실패했습니다.`;
    setStatus(els.projectStatus, message, "error");
    return;
  }

  setStatus(els.projectStatus, `${label} 처리했습니다.`, "success");
  await loadProjectApplications();
}

function setProjectFilter(filter) {
  activeProjectFilter = filter;
  els.projectTabs.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.projectFilter === filter));
  });
  loadProjectApplications();
}

async function loadNewsPosts() {
  if (!els.newsList) return;
  els.newsList.textContent = "";
  const { data, error } = await supabase
    .from("news_posts")
    .select("id,source_name,title,source_url,published_at,is_featured,is_published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error(error);
    setStatus(els.newsStatus, "AI 소식 목록을 불러오지 못했습니다.", "error");
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    setStatus(els.newsStatus, "등록된 AI 소식이 없습니다.");
    return;
  }

  rows.forEach((row) => {
    const article=document.createElement("article");
    article.className="admin-request";

    const top=document.createElement("div");
    top.className="admin-request-top";
    const info=document.createElement("div");
    const title=document.createElement("h2");
    const source=document.createElement("p");
    title.textContent=row.title;
    source.textContent=row.source_name;
    info.append(title,source);

    const badge=document.createElement("span");
    badge.className="admin-badge " + (row.is_published ? "approved" : "rejected");
    badge.textContent=row.is_published ? (row.is_featured ? "대표 / 게시" : "게시") : "비공개";
    top.append(info,badge);

    const meta=document.createElement("dl");
    meta.className="admin-request-meta";
    [["PUBLISHED",formatDate(row.published_at)],["URL",row.source_url],["FEATURED",row.is_featured ? "YES" : "NO"]].forEach(([label,value])=>{
      const item=document.createElement("div");
      const dt=document.createElement("dt");
      const dd=document.createElement("dd");
      dt.textContent=label; dd.textContent=value;
      item.append(dt,dd); meta.appendChild(item);
    });

    const actions=document.createElement("div");
    actions.className="admin-actions";

    const toggle=document.createElement("button");
    toggle.type="button";
    toggle.className="button admin-reject";
    toggle.textContent=row.is_published ? "비공개" : "게시";
    toggle.addEventListener("click", async()=>{
      setStatus(els.newsStatus,"변경 중…");
      const {error:updateError}=await supabase
        .from("news_posts")
        .update({is_published:!row.is_published})
        .eq("id",row.id);
      if(updateError){
        console.error(updateError);
        setStatus(els.newsStatus,"게시 상태 변경에 실패했습니다.","error");
        return;
      }
      setStatus(els.newsStatus,"변경했습니다.","success");
      await loadNewsPosts();
    });

    const remove=document.createElement("button");
    remove.type="button";
    remove.className="button admin-reject";
    remove.textContent="삭제";
    remove.addEventListener("click",async()=>{
      if(!window.confirm("이 AI 소식을 삭제할까요?")) return;
      const {error:deleteError}=await supabase.from("news_posts").delete().eq("id",row.id);
      if(deleteError){
        console.error(deleteError);
        setStatus(els.newsStatus,"삭제에 실패했습니다.","error");
        return;
      }
      setStatus(els.newsStatus,"삭제했습니다.","success");
      await loadNewsPosts();
    });

    actions.append(toggle,remove);
    article.append(top,meta,actions);
    els.newsList.appendChild(article);
  });
}

async function createNewsPost(event){
  event.preventDefault();
  setStatus(els.newsStatus,"등록 중…");

  if(els.newsFeatured.checked){
    const {error:clearError}=await supabase
      .from("news_posts")
      .update({is_featured:false})
      .eq("is_featured",true);
    if(clearError){
      console.error(clearError);
      setStatus(els.newsStatus,"기존 대표 기사 상태 변경에 실패했습니다.","error");
      return;
    }
  }

  const publishedAt = new Date(els.newsPublishedAt.value + "T09:00:00+09:00").toISOString();
  const {error}=await supabase.from("news_posts").insert({
    source_name:els.newsSource.value.trim(),
    title:els.newsTitle.value.trim(),
    summary:els.newsSummary.value.trim() || null,
    source_url:els.newsSourceUrl.value.trim(),
    image_url:els.newsImageUrl.value.trim() || null,
    published_at:publishedAt,
    is_featured:els.newsFeatured.checked,
    is_published:els.newsPublished.checked,
    created_by:currentSession.user.id
  });

  if(error){
    console.error(error);
    setStatus(els.newsStatus,"AI 소식 등록에 실패했습니다.","error");
    return;
  }

  els.newsForm.reset();
  els.newsPublished.checked=true;
  els.newsPublishedAt.value=new Date().toISOString().slice(0,10);
  setStatus(els.newsStatus,"AI 소식을 등록했습니다.","success");
  await loadNewsPosts();
}

function safeObjectName(name) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  return crypto.randomUUID() + ext;
}

async function loadArchiveItems() {
  if (!els.archiveList) return;
  els.archiveList.textContent = "";
  const { data, error } = await supabase
    .from("archive_items")
    .select("id,title,category,file_name,object_path,file_size,created_at,is_published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setStatus(els.archiveStatus, "자료 목록을 불러오지 못했습니다.", "error");
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    setStatus(els.archiveStatus, "등록된 자료가 없습니다.");
    return;
  }

  rows.forEach((row) => {
    const article = document.createElement("article");
    article.className = "admin-request";
    const top = document.createElement("div");
    top.className = "admin-request-top";
    const info = document.createElement("div");
    const title = document.createElement("h2");
    const category = document.createElement("p");
    title.textContent = row.title;
    category.textContent = row.category.toUpperCase();
    info.append(title, category);
    top.append(info);

    const meta = document.createElement("dl");
    meta.className = "admin-request-meta";
    [["FILE", row.file_name], ["SIZE", row.file_size ? String(row.file_size) + " B" : "—"], ["CREATED", formatDate(row.created_at)]].forEach(([label,value]) => {
      const item=document.createElement("div");
      const dt=document.createElement("dt");
      const dd=document.createElement("dd");
      dt.textContent=label; dd.textContent=value;
      item.append(dt,dd); meta.appendChild(item);
    });

    const actions=document.createElement("div");
    actions.className="admin-actions";
    const remove=document.createElement("button");
    remove.type="button";
    remove.className="button admin-reject";
    remove.textContent="삭제";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`‘${row.title}’ 자료를 삭제할까요?`)) return;
      setStatus(els.archiveStatus, "삭제 중…");
      const { error: storageError } = await supabase.storage.from("member-archive").remove([row.object_path]);
      if (storageError) {
        console.error(storageError);
        setStatus(els.archiveStatus, "파일 삭제에 실패했습니다.", "error");
        return;
      }
      const { error: rowError } = await supabase.from("archive_items").delete().eq("id", row.id);
      if (rowError) {
        console.error(rowError);
        setStatus(els.archiveStatus, "자료 정보 삭제에 실패했습니다.", "error");
        return;
      }
      setStatus(els.archiveStatus, "삭제했습니다.", "success");
      await loadArchiveItems();
    });
    actions.append(remove);
    article.append(top,meta,actions);
    els.archiveList.appendChild(article);
  });
}

async function uploadArchive(event) {
  event.preventDefault();
  const file = els.archiveFile.files?.[0];
  if (!file) return;

  setStatus(els.archiveStatus, "업로드 중…");
  const objectPath = `${els.archiveCategory.value}/${safeObjectName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("member-archive")
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });

  if (uploadError) {
    console.error(uploadError);
    setStatus(els.archiveStatus, "파일 업로드에 실패했습니다.", "error");
    return;
  }

  const { error: insertError } = await supabase.from("archive_items").insert({
    title: els.archiveTitle.value.trim(),
    category: els.archiveCategory.value,
    description: els.archiveDescription.value.trim() || null,
    file_name: file.name,
    object_path: objectPath,
    mime_type: file.type || null,
    file_size: file.size,
    is_published: true,
    created_by: currentSession.user.id
  });

  if (insertError) {
    console.error(insertError);
    await supabase.storage.from("member-archive").remove([objectPath]);
    setStatus(els.archiveStatus, "자료 정보 저장에 실패했습니다.", "error");
    return;
  }

  els.archiveForm.reset();
  setStatus(els.archiveStatus, "자료를 업로드했습니다.", "success");
  await loadArchiveItems();
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

  await Promise.all([loadSummary(), loadRequests(), loadProjectApplications(), loadNewsPosts(), loadArchiveItems()]);
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
  const password = els.password.value;
  if (!email || !password) return;

  setStatus(els.loginStatus, "로그인 중…");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.session) {
    console.error(error);
    setStatus(els.loginStatus, "이메일 또는 비밀번호를 확인해주세요.", "error");
    return;
  }

  try {
    await enterAdmin(data.session);
  } catch (err) {
    console.error(err);
    setStatus(els.loginStatus, "관리자 권한 확인에 실패했습니다.", "error");
  }
});

els.resetPassword?.addEventListener("click", async () => {
  const email = els.email.value.trim().toLowerCase();
  if (!email) {
    setStatus(els.loginStatus, "먼저 이메일을 입력해주세요.", "error");
    els.email.focus();
    return;
  }

  setStatus(els.loginStatus, "비밀번호 재설정 메일을 보내는 중…");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/set-password?next=/admin"
  });

  if (error) {
    console.error(error);
    setStatus(els.loginStatus, "재설정 메일 발송에 실패했습니다.", "error");
    return;
  }

  setStatus(els.loginStatus, "비밀번호 재설정 메일을 확인해주세요.", "success");
});

els.signOut?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.replace("/admin");
});

els.refresh?.addEventListener("click", async () => {
  await Promise.all([loadSummary(), loadRequests(), loadProjectApplications(), loadNewsPosts(), loadArchiveItems()]);
});

els.tabs.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

els.projectTabs.forEach((button) => {
  button.addEventListener("click", () => setProjectFilter(button.dataset.projectFilter));
});

els.archiveForm?.addEventListener("submit", uploadArchive);
els.newsForm?.addEventListener("submit", createNewsPost);
if (els.newsPublishedAt && !els.newsPublishedAt.value) {
  els.newsPublishedAt.value = new Date().toISOString().slice(0,10);
}
// data-project-filter listener marker

supabase.auth.onAuthStateChange((_event, session) => {
  if (session && session !== currentSession) {
    enterAdmin(session).catch(console.error);
  }
});

syncSession();
