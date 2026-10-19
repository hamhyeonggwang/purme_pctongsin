(() => {
  "use strict";

  const SUPABASE_URL = "https://kpviyourqynlhzsqznao.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iul4iPrWoECeurckKiaQcg_fHTmwQDi";

  const form = document.getElementById("join-form");
  const submit = document.getElementById("joinSubmit");
  const status = document.getElementById("joinStatus");
  if (!form || !submit || !status) return;

  const setStatus = (message, type = "") => {
    status.className = "form-status" + (type ? " " + type : "");
    status.textContent = message;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    const name = document.getElementById("joinName").value.trim();
    const department = document.getElementById("joinDepartment").value.trim();
    const email = document.getElementById("joinEmail").value.trim().toLowerCase();

    if (!name || !department || !email) {
      setStatus("이름, 부서·소속, 이메일을 모두 입력해주세요.", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submit.disabled = true;
    submit.textContent = "신청 중…";

    try {
      const response = await fetch(SUPABASE_URL + "/rest/v1/join_requests", {
        method: "POST",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ name, department, email })
      });

      if (response.ok) {
        setStatus("가입 신청이 접수되었습니다. 운영진 승인 후 이메일로 로그인 안내를 드립니다.", "success");
        form.reset();
        return;
      }

      if (response.status === 409) {
        setStatus("이미 접수되었거나 승인된 이메일입니다. 운영진 확인을 기다려주세요.", "error");
        return;
      }

      throw new Error("HTTP " + response.status);
    } catch (error) {
      console.warn("Join request failed", error);
      setStatus("현재 가입 신청 시스템을 연결하는 중입니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "가입 신청하기";
    }
  });
})();