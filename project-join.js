import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const cards = [...document.querySelectorAll("[data-project-slug]")];
if (!cards.length) throw new Error("No project cards");

const { data: projectData, error: projectError } = await supabase.rpc("get_open_projects");
if (projectError) {
  console.warn("Project data unavailable", projectError);
} else {
  const bySlug = new Map((projectData || []).map((row) => [row.slug, row]));
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  let ownApplications = [];
  if (session) {
    const { data } = await supabase
      .from("project_applications")
      .select("project_id,status")
      .eq("user_id", session.user.id);
    ownApplications = data || [];
  }

  cards.forEach((card) => {
    const project = bySlug.get(card.dataset.projectSlug);
    if (!project) return;

    const count = card.querySelector("[data-project-count]");
    const button = card.querySelector("[data-project-apply]");
    const own = ownApplications.find((item) => item.project_id === project.id);

    if (count) {
      count.textContent = project.capacity
        ? `${project.approved_count} / ${project.capacity}명`
        : `${project.approved_count}명 참여`;
    }

    if (!button) return;

    if (own) {
      button.textContent =
        own.status === "approved" ? "참여 중" :
        own.status === "pending" ? "승인 대기" : "반려";
      button.dataset.applicationStatus = own.status;
      button.setAttribute("aria-disabled", "true");
    }

    button.addEventListener("click", async (event) => {
      event.preventDefault();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      if (button.getAttribute("aria-disabled") === "true") return;

      button.setAttribute("aria-disabled", "true");
      button.textContent = "신청 중…";

      const { error } = await supabase
        .from("project_applications")
        .insert({
          project_id: project.id,
          user_id: session.user.id,
          status: "pending"
        });

      if (error) {
        console.error(error);
        if (error.code === "23505") {
          button.textContent = "이미 신청됨";
        } else {
          button.textContent = "신청 실패";
          button.removeAttribute("aria-disabled");
        }
        return;
      }

      button.textContent = "승인 대기";
      button.dataset.applicationStatus = "pending";
    });
  });
}
