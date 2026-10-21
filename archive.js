import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const list = document.getElementById("archiveList");
const status = document.getElementById("archiveStatus");
const tabs = [...document.querySelectorAll("[data-archive-filter]")];
let activeFilter = new URLSearchParams(location.search).get("category") || "all";

function setStatus(message, type="") {
  status.className = "archive-status" + (type ? " " + type : "");
  status.textContent = message;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date(value));
}

async function loadArchive() {
  setStatus("자료를 불러오는 중…");
  list.textContent = "";

  let query = supabase
    .from("archive_items")
    .select("id,title,category,description,file_name,object_path,mime_type,file_size,created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (activeFilter !== "all") query = query.eq("category", activeFilter);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    setStatus("자료를 불러오지 못했습니다.", "error");
    return;
  }

  const rows = data || [];
  setStatus(rows.length ? "" : "등록된 자료가 없습니다.");

  rows.forEach((row) => {
    const item = document.createElement("article");
    item.className = "archive-item";
    item.innerHTML = `
      <div class="archive-item-copy">
        <span>${row.category.toUpperCase()}</span>
        <h2></h2>
        <p></p>
      </div>
      <div class="archive-item-meta">
        <span>${formatDate(row.created_at)}</span>
        <span>${row.file_name}</span>
        <span>${formatBytes(row.file_size)}</span>
        <button type="button" class="button button-primary">다운로드</button>
      </div>
    `;
    item.querySelector("h2").textContent = row.title;
    item.querySelector("p").textContent = row.description || "";
    item.querySelector("button").addEventListener("click", async () => {
      const { data: signed, error: signedError } = await supabase.storage
        .from("member-archive")
        .createSignedUrl(row.object_path, 60);
      if (signedError) {
        console.error(signedError);
        setStatus("다운로드 링크를 만들지 못했습니다.", "error");
        return;
      }
      window.location.href = signed.signedUrl;
    });
    list.appendChild(item);
  });
}

const { data: sessionData } = await supabase.auth.getSession();
if (!sessionData.session) {
  window.location.replace("/login?next=" + encodeURIComponent(location.pathname + location.search));
} else {
  const { data: member } = await supabase
    .from("members")
    .select("status")
    .eq("user_id", sessionData.session.user.id)
    .maybeSingle();

  if (!member || member.status !== "active") {
    setStatus("활성 회원만 자료실을 사용할 수 있습니다.", "error");
  } else {
    tabs.forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.archiveFilter === activeFilter));
      button.addEventListener("click", () => {
        activeFilter = button.dataset.archiveFilter;
        tabs.forEach((b) => b.setAttribute("aria-selected", String(b === button)));
        const url = new URL(location.href);
        if (activeFilter === "all") url.searchParams.delete("category");
        else url.searchParams.set("category", activeFilter);
        history.replaceState({}, "", url);
        loadArchive();
      });
    });
    loadArchive();
  }
}
