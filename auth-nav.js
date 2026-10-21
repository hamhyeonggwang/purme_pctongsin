import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

async function renderAuthNav() {
  const targets = document.querySelectorAll("[data-auth-link]");
  if (!targets.length) return;

  const { data } = await supabase.auth.getSession();
  const signedIn = Boolean(data.session);

  targets.forEach((link) => {
    link.textContent = signedIn ? "MY PAGE" : "LOGIN";
    link.setAttribute("href", signedIn ? "/mypage" : "/login");
  });
}

renderAuthNav();
supabase.auth.onAuthStateChange(() => renderAuthNav());
