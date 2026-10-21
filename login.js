import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const form = document.getElementById("memberLoginForm");
const email = document.getElementById("memberEmail");
const password = document.getElementById("memberPassword");
const reset = document.getElementById("memberResetPassword");
const status = document.getElementById("memberLoginStatus");
const next = new URLSearchParams(window.location.search).get("next") || "/mypage";

function setStatus(message, type="") {
  status.className = "member-status" + (type ? " " + type : "");
  status.textContent = message;
}

const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session) {
  window.location.replace(next);
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const emailValue = email.value.trim().toLowerCase();
  const passwordValue = password.value;

  if (!emailValue || !passwordValue) return;
  setStatus("로그인 중…");

  const { error } = await supabase.auth.signInWithPassword({
    email: emailValue,
    password: passwordValue
  });

  if (error) {
    console.error(error);
    setStatus("이메일 또는 비밀번호를 확인해주세요.", "error");
    return;
  }

  window.location.replace(next);
});

reset?.addEventListener("click", async () => {
  const emailValue = email.value.trim().toLowerCase();
  if (!emailValue) {
    setStatus("먼저 이메일을 입력해주세요.", "error");
    email.focus();
    return;
  }

  setStatus("비밀번호 재설정 메일을 보내는 중…");

  const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
    redirectTo: window.location.origin + "/set-password?next=/mypage"
  });

  if (error) {
    console.error(error);
    setStatus("재설정 메일 발송에 실패했습니다.", "error");
    return;
  }

  setStatus("비밀번호 재설정 메일을 확인해주세요.", "success");
});
