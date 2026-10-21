import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const status = document.getElementById("mypageStatus");
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
  }
}

document.getElementById("memberLogout")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.replace("/");
});
