(function () {
  const checkIntervalMs = 20000;
  const quietReloadDelayMs = 1200;
  const pageUrl = new URL(window.location.href);

  if (pageUrl.protocol === "file:" || pageUrl.pathname.endsWith("/admin.html")) return;
  if (!pageUrl.pathname.endsWith(".html") && !pageUrl.pathname.endsWith("/")) return;

  let currentSignature = "";
  let isChecking = false;

  window.addEventListener("DOMContentLoaded", () => {
    currentSignature = getPageSignature(document.documentElement.outerHTML);
    window.setInterval(checkForUpdatedPage, checkIntervalMs);
  });

  async function checkForUpdatedPage() {
    if (isChecking || document.hidden) return;
    isChecking = true;

    try {
      const response = await fetch(getFreshPageUrl(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (!response.ok) return;

      const html = await response.text();
      const nextSignature = getPageSignature(html);
      if (currentSignature && nextSignature && nextSignature !== currentSignature) {
        showUpdateNotice();
        window.setTimeout(() => window.location.reload(), quietReloadDelayMs);
      }
    } catch {
      // Network hiccups should not interrupt readers.
    } finally {
      isChecking = false;
    }
  }

  function getFreshPageUrl() {
    const freshUrl = new URL(window.location.href);
    freshUrl.searchParams.set("_live", Date.now().toString());
    return freshUrl.href;
  }

  function getPageSignature(html) {
    return html
      .replace(/<script\b[^>]*\brealtime-update\.js[^>]*><\/script>/gi, "")
      .replace(/<div class="live-update-notice"[\s\S]*?<\/div>/gi, "")
      .replace(/_live=\d+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function showUpdateNotice() {
    if (document.querySelector(".live-update-notice")) return;

    const notice = document.createElement("div");
    notice.className = "live-update-notice";
    notice.textContent = "กำลังอัปเดตกฎล่าสุด...";
    document.body.append(notice);
  }
})();
