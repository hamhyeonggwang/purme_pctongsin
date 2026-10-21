import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const form = document.getElementById("memberLoginForm");
const email = document.getElementById("memberEmail");
const status = document.getElementById("memberLoginStatus");

function setStatus(message, type="") {
  status.className = "member-status" + (type ? " " + type : "");
  status.textContent = message;
}

const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session) {
  window.location.replace("/mypage");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = email.value.trim().toLowerCase();
  if (!value) return;
  setStatus("로그인 링크를 보내는 중…");

  const { error } = await supabase.auth.signInWithOtp({
    email: value,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: window.location.origin + "/mypage"
    }
  });

  if (error) {
    console.error(error);
    setStatus("승인된 회원 이메일을 확인해주세요.", "error");
    return;
  }
  setStatus("이메일의 로그인 링크를 확인해주세요.", "success");
});
