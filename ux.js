(() => {
  "use strict";

  if (new URLSearchParams(window.location.search).get("preview") === "1") {
    document.documentElement.classList.add("preview-mode");
  }

  const sections = [...document.querySelectorAll("[data-stage]")];
  const links = [...document.querySelectorAll("[data-stage-link]")];
  const progress = document.querySelector(".scroll-progress span");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = [...document.querySelectorAll("[data-reveal]")];
  const motionHero = document.querySelector(".motion-hero");
  const staggerGroups = [...document.querySelectorAll("[data-motion-stagger]")];

  if (!reduceMotion && motionHero) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add("home-motion-ready");
      });
    });

    let pointerFrame = 0;
    const setHeroPointer = (event) => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const rect = motionHero.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        motionHero.style.setProperty("--pointer-x", String(x - 0.5));
        motionHero.style.setProperty("--pointer-y", String(y - 0.5));
      });
    };
    motionHero.addEventListener("pointermove", setHeroPointer, { passive: true });
    motionHero.addEventListener("pointerleave", () => {
      motionHero.style.setProperty("--pointer-x", "0");
      motionHero.style.setProperty("--pointer-y", "0");
    });
  } else {
    document.documentElement.classList.add("home-motion-ready");
  }

  staggerGroups.forEach((group) => {
    [...group.children].forEach((child, index) => {
      child.style.setProperty("--stagger-index", String(index));
    });
  });

  const setActive = (stage) => {
    links.forEach((link) => {
      const active = link.dataset.stageLink === stage;
      if (active) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if (!reduceMotion && revealItems.length && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) setActive(visible.target.dataset.stage);
      },
      { rootMargin: "-22% 0px -58% 0px", threshold: [0, 0.2, 0.4, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));
  }

  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.width = `${ratio * 100}%`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });

  document.querySelectorAll(".mobile-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      const details = link.closest("details");
      if (details) details.open = false;
    });
  });
})();