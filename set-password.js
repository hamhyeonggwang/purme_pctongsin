import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const form = document.getElementById("passwordForm");
const password = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const status = document.getElementById("passwordStatus");
const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "/mypage";

function setStatus(message, type="") {
  status.className = "member-status" + (type ? " " + type : "");
  status.textContent = message;
}

const { data } = await supabase.auth.getSession();
if (!data.session) {
  setStatus("이 링크의 인증 세션을 확인할 수 없습니다. 다시 비밀번호 설정 메일을 요청해주세요.", "error");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (password.value !== confirmPassword.value) {
    setStatus("비밀번호가 서로 일치하지 않습니다.", "error");
    return;
  }

  if (password.value.length < 8) {
    setStatus("비밀번호는 8자 이상이어야 합니다.", "error");
    return;
  }

  setStatus("비밀번호를 저장하는 중…");

  const { error } = await supabase.auth.updateUser({
    password: password.value
  });

  if (error) {
    console.error(error);
    setStatus("비밀번호 설정에 실패했습니다. 링크를 다시 요청해주세요.", "error");
    return;
  }

  setStatus("비밀번호가 설정되었습니다.", "success");
  window.setTimeout(() => window.location.replace(next), 500);
});
