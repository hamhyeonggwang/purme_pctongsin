import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const status = document.getElementById("mypageStatus");

async function loadProjectActivity(userId) {
  const { data, error } = await supabase
    .from("project_applications")
    .select("id,status,created_at,project_id,projects(code,title,project_type)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const list = document.getElementById("memberProjectList");
  const approvedCount = document.getElementById("memberProjectCount");
  const pendingCount = document.getElementById("memberPendingCount");

  if (error) {
    console.error(error);
    approvedCount.textContent = "—";
    pendingCount.textContent = "—";
    list.innerHTML = '<p class="member-empty">프로젝트 활동을 불러오지 못했습니다.</p>';
    return;
  }

  const rows = data || [];
  approvedCount.textContent = String(rows.filter((row) => row.status === "approved").length);
  pendingCount.textContent = String(rows.filter((row) => row.status === "pending").length);
  list.textContent = "";

  if (!rows.length) {
    list.innerHTML = '<p class="member-empty">아직 신청한 프로젝트가 없습니다. <a href="/#try">프로젝트 보기 →</a></p>';
    return;
  }

  const label = { pending: "승인 대기", approved: "참여 중", rejected: "반려" };

  rows.forEach((row) => {
    const item = document.createElement("article");
    item.className = "member-project-row";
    const project = row.projects || {};
    item.innerHTML = `
      <div>
        <span>${project.code || "PROJECT"}</span>
        <h3></h3>
      </div>
      <strong class="member-project-status ${row.status}">${label[row.status] || row.status}</strong>
    `;
    item.querySelector("h3").textContent = project.title || "프로젝트";
    list.appendChild(item);
  });
}

const { data: sessionData } = await supabase.auth.getSession();

if (!sessionData.session) {
  window.location.replace("/login");
} else {
  const user = sessionData.session.user;
  const { data: member, error } = await supabase
    .from("members")
    .select("name,department,email,role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !member || member.status !== "active") {
    status.textContent = "활성 회원 정보를 확인할 수 없습니다.";
  } else {
    document.getElementById("memberName").textContent = member.name;
    document.getElementById("memberDepartment").textContent = member.department;
    document.getElementById("memberEmailValue").textContent = member.email;
    document.getElementById("memberRole").textContent = member.role.toUpperCase();
    await loadProjectActivity(user.id);
  }
}

document.getElementById("memberLogout")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.replace("/");
});
