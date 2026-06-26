document.documentElement.classList.add("page-loading");

const pageLoadStartedAt = performance.now();
const minimumLoaderTime = 480;

window.addEventListener("DOMContentLoaded", () => {
  setupPageProtection();
  setupAgencyDropdowns();
  setupRuleSearch();
  revealPageWhenFontsAreReady();
});

window.addEventListener("pageshow", () => {
  document.documentElement.classList.remove("page-leaving");
  revealPageWhenFontsAreReady();
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  if (link.target || link.hasAttribute("download")) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const url = new URL(link.href, window.location.href);
  const isSameSite = url.origin === window.location.origin;
  const isHtmlPage = url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (!isSameSite || !isHtmlPage || url.href === window.location.href) return;

  event.preventDefault();
  document.documentElement.classList.add("page-leaving");
  window.setTimeout(() => { window.location.href = url.href; }, 220);
});

async function revealPageWhenFontsAreReady() {
  const fontsReady = document.fonts ? document.fonts.ready.catch(() => undefined) : Promise.resolve();
  const fallbackTimer = new Promise((resolve) => { window.setTimeout(resolve, 900); });
  await Promise.race([fontsReady, fallbackTimer]);

  const remainingLoaderTime = minimumLoaderTime - (performance.now() - pageLoadStartedAt);
  if (remainingLoaderTime > 0) {
    await new Promise((resolve) => { window.setTimeout(resolve, remainingLoaderTime); });
  }

  requestAnimationFrame(() => {
    document.documentElement.classList.remove("page-loading");
    document.documentElement.classList.add("page-ready");
  });
}

function setupAgencyDropdowns() {
  document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
    dropdown.addEventListener("mouseenter", () => dropdown.classList.add("open"));
    dropdown.addEventListener("mouseleave", () => dropdown.classList.remove("open"));
    dropdown.addEventListener("focusin", () => dropdown.classList.add("open"));
    dropdown.addEventListener("focusout", (event) => {
      if (!dropdown.contains(event.relatedTarget)) dropdown.classList.remove("open");
    });
  });
}

function setupPageProtection() {
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const keyCode = event.keyCode;

    if ((event.ctrlKey || event.metaKey) && (key === "s" || keyCode === 83)) {
      event.preventDefault();
      return false;
    }

    if (event.key === "F12" || keyCode === 123) {
      event.preventDefault();
      return false;
    }

    if (event.ctrlKey && event.shiftKey && (key === "i" || key === "j" || key === "c" || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
      event.preventDefault();
      return false;
    }

    if ((event.ctrlKey || event.metaKey) && (key === "u" || keyCode === 85)) {
      event.preventDefault();
      return false;
    }

    return undefined;
  }, false);

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  }, false);
}

function setupRuleSearch() {
  const nav = document.querySelector(".top-nav");
  const login = document.querySelector(".login-link");
  if (!nav || !login || document.querySelector(".rule-search")) return;

  const search = document.createElement("div");
  search.className = "rule-search";
  search.innerHTML = '<input type="search" placeholder="ค้นหากฎ..." aria-label="ค้นหากฎ" autocomplete="off"><div class="search-results" role="listbox"></div>';
  login.before(search);

  const input = search.querySelector("input");
  const results = search.querySelector(".search-results");
  const pages = [
    { url: "general.html", title: "กฎเมือง" },
    { url: "roleplay.html", title: "กฎโรลเพลย์" },
    { url: "crime.html", title: "กฎอาชญากรรม" },
    { url: "safezone.html", title: "พื้นที่ปลอดภัย" },
    { url: "activity.html", title: "กฎกิจกรรม" },
    { url: "agency.html", title: "หน่วยงาน" },
    { url: "agency-medical.html", title: "หน่วยงานแพทย์" },
    { url: "agency-police.html", title: "หน่วยงานตำรวจ" },
    { url: "agency-police-basic.html", title: "กฎพื้นฐานตำรวจ" },
    { url: "agency-police-penalty.html", title: "อัตราโทษ" },
    { url: "agency-police-operation.html", title: "การปฏิบัติหน้าที่ตำรวจ" },
    { url: "agency-police-warrant.html", title: "หมายจับ" },
    { url: "agency-police-blacklist.html", title: "Blacklist ตำรวจ" },
    { url: "agency-police-discipline.html", title: "วินัยตำรวจ" },
    { url: "agency-council.html", title: "หน่วยงานสภา" },
    { url: "agency-council-member-rules.html", title: "กฎสมาชิกสภา" },
    { url: "agency-council-contact-rules.html", title: "กฎติดต่อสภา" },
    { url: "agency-council-story-rules.html", title: "กฎ Story" },
    { url: "agency-council-story-buy.html", title: "กฎซื้อ Story" },
    { url: "agency-council-story-format.html", title: "รูปแบบ Story" },
    { url: "agency-council-story-protect.html", title: "กฎ Protect" },
    { url: "agency-council-story-report.html", title: "รายงาน Story" },
    { url: "agency-council-gang-family.html", title: "แก๊งและครอบครัว" },
    { url: "agency-council-gang-rules.html", title: "กฎแก๊ง" },
    { url: "agency-council-family-rules.html", title: "กฎครอบครัว" },
    { url: "agency-council-dissolution.html", title: "ยุบแก๊ง/ครอบครัว" },
    { url: "agency-council-transaction.html", title: "ธุรกรรมสภา" },
    { url: "agency-council-blacklist.html", title: "กฎ Blacklist" },
    { url: "agency-council-work.html", title: "การทำงานสภา" },
    { url: "penalty.html", title: "บทลงโทษ" }
  ];
  let searchIndexPromise;

  input.addEventListener("input", async () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      search.classList.remove("open");
      results.innerHTML = "";
      return;
    }

    const index = await getSearchIndex();
    const matches = index
      .map((page) => ({ ...page, score: scorePage(page, query), snippet: makeSnippet(page.text, query) }))
      .filter((page) => page.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    search.classList.add("open");
    results.innerHTML = matches.length
      ? matches.map((page) => `<a href="${page.url}" role="option"><strong>${escapeHtml(page.title)}</strong><span>${escapeHtml(page.snippet)}</span></a>`).join("")
      : '<div class="search-empty">ไม่พบกฎที่ค้นหา</div>';
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      input.value = "";
      search.classList.remove("open");
      results.innerHTML = "";
      input.blur();
    }
  });

  document.addEventListener("click", (event) => {
    if (!search.contains(event.target)) search.classList.remove("open");
  });

  async function getSearchIndex() {
    if (!searchIndexPromise) {
      searchIndexPromise = Promise.all(pages.map(async (page) => {
        try {
          const response = await fetch(page.url);
          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          const title = doc.querySelector("h1")?.textContent.trim() || page.title;
          const text = doc.body?.innerText.replace(/\s+/g, " ").trim() || "";
          return { ...page, title, text, textLower: text.toLowerCase() };
        } catch {
          return { ...page, text: page.title, textLower: page.title.toLowerCase() };
        }
      }));
    }
    return searchIndexPromise;
  }

  function scorePage(page, query) {
    let score = 0;
    if (page.title.toLowerCase().includes(query)) score += 6;
    if (page.textLower.includes(query)) score += 2;
    score += page.textLower.split(query).length - 1;
    return score;
  }

  function makeSnippet(text, query) {
    const lower = text.toLowerCase();
    const index = lower.indexOf(query);
    if (index === -1) return text.slice(0, 96) + (text.length > 96 ? "..." : "");
    const start = Math.max(0, index - 42);
    const end = Math.min(text.length, index + query.length + 72);
    return `${start > 0 ? "..." : ""}${text.slice(start, end)}${end < text.length ? "..." : ""}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
}
