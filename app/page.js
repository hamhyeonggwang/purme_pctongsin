import {
  archiveCategories,
  gallerySeed,
  issue,
  news,
  projects,
  selectedWork,
} from "@/data/seed";

function SiteHeader() {
  const nav = [
    ["AI NEWS", "#news"],
    ["PROJECT", "#projects"],
    ["ARCHIVE", "#archive"],
    ["GALLERY", "#gallery"],
  ];

  return (
    <header className="border-b border-ink/20">
      <div className="site-shell flex min-h-18 items-center justify-between gap-6">
        <a
          href="#top"
          className="brand-logo text-2xl font-black tracking-[-0.055em] md:text-3xl"
          aria-label="PC통신 홈"
        >
          [PC통신]
        </a>

        <nav className="hidden items-center gap-7 font-mono text-[0.7rem] font-bold tracking-[0.12em] md:flex">
          {nav.map(([label, href]) => (
            <a key={label} className="nav-link" href={href}>
              {label}
            </a>
          ))}
          <span className="h-5 w-px bg-ink/20" aria-hidden="true" />
          <a className="nav-link" href="#join">
            LOGIN
          </a>
        </nav>

        <details className="relative md:hidden">
          <summary className="cursor-pointer border border-ink px-3 py-2 font-mono text-[0.68rem] font-bold tracking-[0.12em]">
            MENU
          </summary>
          <nav className="absolute right-0 top-[calc(100%+0.6rem)] z-30 grid min-w-52 gap-px border border-ink bg-ink shadow-xl">
            {nav.map(([label, href]) => (
              <a
                key={label}
                className="bg-paper px-5 py-4 font-mono text-[0.68rem] font-bold tracking-[0.12em]"
                href={href}
              >
                {label}
              </a>
            ))}
            <a
              className="bg-acid px-5 py-4 font-mono text-[0.68rem] font-bold tracking-[0.12em]"
              href="#join"
            >
              LOGIN
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}

function SectionHeader({ eyebrow, title, meta }) {
  return (
    <div className="mb-8 border-t border-ink pt-4 md:mb-12">
      <div className="mb-4 flex items-center justify-between gap-4 font-mono text-[0.65rem] font-bold tracking-[0.14em] text-muted">
        <span>{eyebrow}</span>
        <span>{meta}</span>
      </div>
      <h2 className="text-[clamp(2.6rem,6vw,6.6rem)] font-black leading-[0.86] tracking-[-0.075em]">
        {title}
      </h2>
    </div>
  );
}

function EditorialPoster({ item, inverse = false, compact = false, label }) {
  return (
    <div
      className={
        "editorial-poster " +
        (inverse ? "editorial-poster--inverse " : "") +
        (compact ? "min-h-[14rem] md:min-h-[18rem]" : "min-h-[22rem] md:min-h-[34rem]")
      }
      aria-hidden="true"
    >
      <span className="poster-index">{label ?? item.rank + " / " + item.category}</span>
      <span className={"poster-word " + (compact ? "poster-word--compact" : "")}>
        {item.posterWord}
      </span>
      <span className="poster-cursor">_</span>
    </div>
  );
}

function FeaturedNews({ item }) {
  return (
    <article>
      <EditorialPoster item={item} />
      <div className="p-5 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-4 font-mono text-[0.65rem] font-bold tracking-[0.13em] text-muted">
          <span>{item.rank} / {item.category}</span>
          <span>{item.date}</span>
        </div>
        <h2 className="max-w-[18ch] text-[clamp(2rem,4vw,4.7rem)] font-black leading-[0.92] tracking-[-0.06em]">
          {item.title}
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg">
          {item.summary}
        </p>
        <p className="mt-5 border-l-4 border-acid pl-4 text-sm font-bold leading-6 md:text-base">
          {item.comment}
        </p>
        <a
          className="mt-7 inline-block font-mono text-[0.68rem] font-black tracking-[0.13em]"
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          ORIGINAL / {item.source.toUpperCase()} ↗
        </a>
      </div>
    </article>
  );
}

function SecondaryNews({ item, inverse = false }) {
  return (
    <article className={inverse ? "bg-ink text-white" : "bg-paper text-ink"}>
      <EditorialPoster item={item} inverse={inverse} compact />
      <div className="p-5 md:p-7">
        <div
          className={
            "mb-4 flex items-center justify-between gap-3 font-mono text-[0.62rem] font-bold tracking-[0.13em] " +
            (inverse ? "text-white/55" : "text-muted")
          }
        >
          <span>{item.rank} / {item.category}</span>
          <span>{item.date}</span>
        </div>
        <h3 className="text-[clamp(1.45rem,2.6vw,2.8rem)] font-black leading-[0.95] tracking-[-0.05em]">
          {item.title}
        </h3>
        <p className={"mt-4 text-sm leading-6 " + (inverse ? "text-white/65" : "text-muted")}>
          {item.summary}
        </p>
      </div>
    </article>
  );
}

function NewsIndex({ items }) {
  return (
    <div className="border-y border-ink">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="news-index-row grid gap-2 border-b border-ink/25 py-5 last:border-b-0 md:grid-cols-[4rem_9rem_1fr_6rem] md:items-center"
        >
          <span className="font-mono text-[0.68rem] font-black tracking-[0.12em]">{item.rank}</span>
          <span className="font-mono text-[0.68rem] font-black tracking-[0.1em] text-muted">
            {item.category}
          </span>
          <strong className="text-lg tracking-[-0.025em] md:text-xl">{item.title}</strong>
          <span className="font-mono text-[0.65rem] font-bold tracking-[0.1em] text-muted md:text-right">
            {item.date}
          </span>
        </a>
      ))}
    </div>
  );
}

function ProjectFeature({ project, index }) {
  const people = project.capacity
    ? String(project.members).padStart(2, "0") + " / " + String(project.capacity).padStart(2, "0") + " MEMBERS"
    : String(project.members).padStart(2, "0") + " MEMBERS";

  return (
    <article className="overflow-hidden border border-white/20 bg-paper">
      <div className="editorial-poster min-h-[17rem]">
        <span className="poster-index">{project.number}</span>
        <span className="poster-word poster-word--compact">{project.posterWord}</span>
        <span className="poster-cursor">_</span>
      </div>
      <div className="p-6 md:p-7">
        <div className="mb-4 flex items-center justify-between gap-4 font-mono text-[0.65rem] font-black tracking-[0.12em]">
          <span className="bg-acid px-2 py-1">{project.status}</span>
          <span>{people}</span>
        </div>
        <h3 className="text-3xl font-black tracking-[-0.05em] md:text-4xl">{project.title}</h3>
        <p className="mt-4 max-w-xl leading-7 text-muted">{project.summary}</p>
        <button
          type="button"
          className="mt-7 w-full border border-ink bg-ink px-5 py-4 font-mono text-[0.7rem] font-black tracking-[0.13em] text-white transition hover:bg-acid hover:text-ink focus-visible:bg-acid focus-visible:text-ink"
          aria-label={project.title + " 참여 신청"}
        >
          JOIN PROJECT / {String(index + 1).padStart(2, "0")}
        </button>
      </div>
    </article>
  );
}

function SelectedWork({ work }) {
  return (
    <article className="grid gap-px border border-ink bg-ink lg:grid-cols-[1.45fr_0.8fr]">
      <div className="bg-paper">
        <div className="editorial-poster min-h-[23rem] md:min-h-[34rem]">
          <span className="poster-index">{work.number}</span>
          <span className="poster-word">{work.posterWord}</span>
          <span className="poster-cursor">_</span>
        </div>
      </div>
      <div className="flex flex-col justify-between bg-white p-6 md:p-9">
        <div>
          <p className="font-mono text-[0.65rem] font-black tracking-[0.13em] text-muted">
            {work.placeholder ? "SEED / TO BE REPLACED" : "COMPLETED"}
          </p>
          <h3 className="mt-5 text-[clamp(2.2rem,4vw,4.5rem)] font-black leading-[0.92] tracking-[-0.065em]">
            {work.title}
          </h3>
          <p className="mt-6 text-base leading-7 text-muted md:text-lg">{work.summary}</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-2">
          <a className="border border-ink px-4 py-4 text-center font-mono text-[0.68rem] font-black tracking-[0.12em]" href="#projects">
            PROJECT
          </a>
          <a className="bg-ink px-4 py-4 text-center font-mono text-[0.68rem] font-black tracking-[0.12em] text-white" href="#gallery">
            RESULT →
          </a>
        </div>
      </div>
    </article>
  );
}

function ArchiveCategories({ items }) {
  return (
    <div className="border-y border-ink">
      {items.map((item) => (
        <div
          key={item.number}
          className="grid items-center gap-3 border-b border-ink/25 py-5 last:border-b-0 md:grid-cols-[5rem_1fr_auto]"
        >
          <span className="font-mono text-[0.68rem] font-black tracking-[0.12em]">{item.number}</span>
          <strong className="text-2xl tracking-[-0.04em] md:text-3xl">{item.title}</strong>
          <span className="font-mono text-[0.65rem] font-bold tracking-[0.1em] text-muted">
            {String(item.count).padStart(2, "0")} FILES
          </span>
        </div>
      ))}
    </div>
  );
}

function GalleryGrid({ items }) {
  const sizes = {
    large: "md:col-span-7 md:row-span-2 min-h-[28rem]",
    tall: "md:col-span-5 md:row-span-2 min-h-[28rem]",
    medium: "md:col-span-5 min-h-[18rem]",
    small: "md:col-span-3 min-h-[18rem]",
  };

  return (
    <div className="grid gap-3 md:grid-cols-12">
      {items.map((item) => (
        <article
          key={item.id}
          className={"gallery-tile relative overflow-hidden p-5 md:p-7 " + sizes[item.size]}
        >
          <span className="font-mono text-[0.64rem] font-black tracking-[0.13em] text-muted">
            {item.label}
          </span>
          <strong className="absolute bottom-4 left-4 text-[clamp(3rem,8vw,8rem)] font-black leading-[0.72] tracking-[-0.09em] md:bottom-6 md:left-6">
            {item.word}
          </strong>
          <span className="absolute right-5 top-5 block h-5 w-5 bg-acid" aria-hidden="true" />
        </article>
      ))}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer id="join" className="bg-ink py-10 text-white">
      <div className="site-shell grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-3xl font-black tracking-[-0.055em]">[PC통신]</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
            AI를 읽고, 써보고, 만들고, 공유합니다. 사용의 차이가 결과의 차이를 만듭니다.
          </p>
        </div>
        <div className="font-mono text-[0.65rem] font-bold leading-6 tracking-[0.12em] text-white/45 md:text-right">
          <p><span className="text-acid">●</span> ONLINE</p>
          <p>AI × PEOPLE × PROJECT</p>
          <p>FOUNDATION v0.1</p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [featured, secondaryA, secondaryB] = news;

  return (
    <main id="top">
      <SiteHeader />

      <section className="site-shell pb-8 pt-12 md:pb-14 md:pt-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <h1 className="max-w-[12ch] text-[clamp(3.8rem,9.2vw,9.5rem)] font-black leading-[0.82] tracking-[-0.085em]">
            사용의 차이가<br />결과의 차이를 만든다.
          </h1>
          <div className="border-l-4 border-acid pl-4 font-mono text-[0.66rem] font-bold leading-6 tracking-[0.13em] text-muted lg:mb-2">
            <p>{issue.label}</p>
            <p>{issue.period}</p>
            <p className="text-ink">● ONLINE</p>
          </div>
        </div>
      </section>

      <section id="news" className="site-shell pb-22 md:pb-30">
        <div className="grid gap-px border border-ink bg-ink lg:grid-cols-[1.55fr_0.85fr]">
          <div className="bg-paper"><FeaturedNews item={featured} /></div>
          <div className="grid gap-px bg-ink">
            <SecondaryNews item={secondaryA} />
            <SecondaryNews item={secondaryB} inverse />
          </div>
        </div>
      </section>

      <section className="site-shell pb-22 md:pb-30">
        <SectionHeader eyebrow="ISSUE 001 / EDITOR'S INDEX" title="THIS WEEK IN AI" meta="05 STORIES" />
        <NewsIndex items={news} />
        <div className="mt-6 text-right">
          <a href="#news" className="text-link">VIEW ALL →</a>
        </div>
      </section>

      <section id="projects" className="bg-ink py-20 text-white md:py-28">
        <div className="site-shell">
          <p className="font-mono text-[0.7rem] font-bold tracking-[0.16em] text-acid">READ → TRY → MAKE</p>
          <h2 className="mt-4 max-w-[11ch] text-[clamp(3.5rem,8vw,8.4rem)] font-black leading-[0.83] tracking-[-0.08em]">
            MAKE SOMETHING REAL.
          </h2>
          <p className="mt-6 text-lg font-bold tracking-[-0.025em] text-white/65 md:text-2xl">읽는 것에서 만드는 것으로.</p>

          <div className="mt-14 border-t border-white/35 pt-4">
            <div className="mb-7 flex justify-between font-mono text-[0.68rem] font-bold tracking-[0.13em] text-white/55">
              <span>NOW RECRUITING</span><span>01 / 02</span>
            </div>
            <div className="grid gap-5 text-ink lg:grid-cols-2">
              {projects.map((project, index) => (
                <ProjectFeature key={project.id} project={project} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell py-22 md:py-30">
        <SectionHeader eyebrow="COMPLETED PROJECT / RESULT" title="SELECTED WORK" meta="WHAT WE MADE" />
        <SelectedWork work={selectedWork} />
      </section>

      <section id="archive" className="site-shell pb-22 md:pb-30">
        <SectionHeader eyebrow="MEMBER RESOURCE" title="ARCHIVE" meta="6 CATEGORIES" />
        <p className="mb-10 max-w-2xl text-base leading-7 text-muted md:text-lg">
          제품 이름이 아니라 사용 목적을 기준으로 지식을 쌓습니다. ChatGPT, Claude, Gemini 같은 도구명은 태그로 관리합니다.
        </p>
        <ArchiveCategories items={archiveCategories} />
      </section>

      <section id="gallery" className="site-shell pb-22 md:pb-30">
        <SectionHeader eyebrow="PROJECT RESULT SHOWCASE" title="WHAT WE MADE." meta="EDITORIAL GRID" />
        <GalleryGrid items={gallerySeed} />
        <p className="mt-5 font-mono text-[0.66rem] leading-5 tracking-[0.09em] text-muted">
          FOUNDATION NOTE — 현재 Gallery는 레이아웃 검증용 Seed입니다. 실제 프로젝트 스크린샷으로 교체합니다.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
