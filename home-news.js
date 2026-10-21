import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ojsotqyonajbkgnsigry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_znfYkftiraIbAqQP_Bu5ZQ_o1gipFI9";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const feature = document.getElementById("homeNewsFeature");
const list = document.getElementById("homeNewsList");
const count = document.getElementById("homeNewsCount");

function fmt(value, short=false){
  const d=new Date(value);
  return new Intl.DateTimeFormat("en-US", short
    ? {month:"short",day:"2-digit"}
    : {month:"short",day:"2-digit",year:"numeric"}
  ).format(d).toUpperCase();
}

function thumbLabel(source){
  const clean=(source||"AI").replace(/[^A-Za-z0-9가-힣]/g,"");
  return clean.slice(0,2).toUpperCase() || "AI";
}

function renderFeature(row){
  feature.textContent="";
  const media=document.createElement("figure");
  media.className="feature-media";
  if(row.image_url){
    const img=document.createElement("img");
    img.src=row.image_url;
    img.alt="";
    img.loading="eager";
    img.decoding="async";
    media.appendChild(img);
  } else {
    const fallback=document.createElement("div");
    fallback.className="news-feature-fallback";
    fallback.textContent=thumbLabel(row.source_name);
    media.appendChild(fallback);
  }
  const fig=document.createElement("figcaption");
  fig.innerHTML="<span>01 / FEATURE</span><span>AI NEWS</span>";
  media.appendChild(fig);

  const copy=document.createElement("div");
  copy.className="feature-copy";
  const meta=document.createElement("div");
  meta.className="story-meta";
  const source=document.createElement("span");
  const time=document.createElement("time");
  source.textContent=row.source_name;
  time.textContent=fmt(row.published_at);
  meta.append(source,time);

  const h3=document.createElement("h3");
  h3.textContent=row.title;
  const p=document.createElement("p");
  p.textContent=row.summary || "";

  const actions=document.createElement("div");
  actions.className="story-actions";
  const a=document.createElement("a");
  a.className="text-link";
  a.href=row.source_url;
  a.target="_blank";
  a.rel="noreferrer";
  a.textContent="원문 보기 ↗";
  actions.appendChild(a);

  copy.append(meta,h3,p,actions);
  feature.append(media,copy);
}

function renderList(rows){
  list.textContent="";
  rows.forEach((row,index)=>{
    const a=document.createElement("a");
    a.href=row.source_url;
    a.target="_blank";
    a.rel="noreferrer";

    const no=document.createElement("span");
    no.className="news-no";
    no.textContent=String(index+2).padStart(2,"0");

    const source=document.createElement("b");
    source.textContent=row.source_name;

    const title=document.createElement("strong");
    title.textContent=row.title;

    const time=document.createElement("time");
    time.textContent=fmt(row.published_at,true);

    const thumb=document.createElement("span");
    thumb.className="news-thumb news-thumb-type";
    const em=document.createElement("em");
    const small=document.createElement("small");
    em.textContent=thumbLabel(row.source_name);
    small.textContent="NEWS";
    thumb.append(em,small);

    a.append(no,source,title,time,thumb);
    list.appendChild(a);
  });
}

const {data,error}=await supabase
  .from("news_posts")
  .select("id,source_name,title,summary,source_url,image_url,published_at,is_featured")
  .eq("is_published",true)
  .order("is_featured",{ascending:false})
  .order("published_at",{ascending:false})
  .limit(5);

if(error){
  console.warn("News load failed",error);
} else if(data?.length){
  const featured=data.find(x=>x.is_featured) || data[0];
  const rest=data.filter(x=>x.id!==featured.id).slice(0,4);
  renderFeature(featured);
  renderList(rest);
  if(count) count.textContent=`LATEST ${Math.min(data.length,5)}`;
}
