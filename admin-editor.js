const pages = [
  ["general.html", "กฎเมือง"],
  ["roleplay.html", "กฎโรลเพลย์"],
  ["crime.html", "กฎอาชญากรรม"],
  ["safezone.html", "พื้นที่ปลอดภัย"],
  ["activity.html", "กฎกิจกรรม"],
  ["agency-medical.html", "หน่วยงานแพทย์"],
  ["agency-police.html", "หน่วยงานตำรวจ"],
  ["agency-police-basic.html", "กฎพื้นฐานตำรวจ"],
  ["agency-police-penalty.html", "อัตราโทษตำรวจ"],
  ["agency-police-operation.html", "การปฏิบัติหน้าที่ตำรวจ"],
  ["agency-police-warrant.html", "หมายจับตำรวจ"],
  ["agency-police-blacklist.html", "Blacklist ตำรวจ"],
  ["agency-police-discipline.html", "วินัยตำรวจ"],
  ["agency-council.html", "หน่วยงานสภา"],
  ["agency-council-member-rules.html", "กฎสมาชิกสภา"],
  ["agency-council-contact-rules.html", "กฎติดต่อสภา"],
  ["agency-council-story-rules.html", "กฎ Story"],
  ["agency-council-story-buy.html", "กฎซื้อ Story"],
  ["agency-council-story-format.html", "รูปแบบ Story"],
  ["agency-council-story-protect.html", "กฎ Protect"],
  ["agency-council-story-report.html", "รายงาน Story"],
  ["agency-council-gang-family.html", "แก๊งและครอบครัว"],
  ["agency-council-gang-rules.html", "กฎแก๊ง"],
  ["agency-council-family-rules.html", "กฎครอบครัว"],
  ["agency-council-dissolution.html", "ยุบแก๊ง/ครอบครัว"],
  ["agency-council-transaction.html", "ธุรกรรมสภา"],
  ["agency-council-blacklist.html", "Blacklist สภา"],
  ["agency-council-work.html", "การทำงานสภา"],
  ["penalty.html", "บทลงโทษ"]
].map(([file, title]) => ({ file, title }));

const state = {
  directoryHandle: null,
  fileHandles: new Map(),
  importedFiles: new Map(),
  github: {
    connected: false,
    owner: "",
    repo: "",
    branch: "main",
    token: "",
    files: new Map()
  },
  currentFile: null,
  currentHtml: "",
  doc: null,
  sections: []
};

const els = {
  pickFolderButton: document.querySelector("#pickFolderButton"),
  fileImportInput: document.querySelector("#fileImportInput"),
  githubOwnerInput: document.querySelector("#githubOwnerInput"),
  githubRepoInput: document.querySelector("#githubRepoInput"),
  githubBranchInput: document.querySelector("#githubBranchInput"),
  githubTokenInput: document.querySelector("#githubTokenInput"),
  githubConnectButton: document.querySelector("#githubConnectButton"),
  pageList: document.querySelector("#pageList"),
  connectionStatus: document.querySelector("#connectionStatus"),
  currentPageTitle: document.querySelector("#currentPageTitle"),
  emptyState: document.querySelector("#emptyState"),
  editorForm: document.querySelector("#editorForm"),
  heroTitleInput: document.querySelector("#heroTitleInput"),
  heroDescriptionInput: document.querySelector("#heroDescriptionInput"),
  sectionEditorList: document.querySelector("#sectionEditorList"),
  addSectionButton: document.querySelector("#addSectionButton"),
  saveButton: document.querySelector("#saveButton"),
  sectionTemplate: document.querySelector("#sectionTemplate"),
  ruleItemTemplate: document.querySelector("#ruleItemTemplate")
};

renderPageList();
restoreGithubSettings();

els.pickFolderButton.addEventListener("click", pickFolder);
els.fileImportInput.addEventListener("change", importFiles);
els.githubConnectButton.addEventListener("click", connectGithub);
els.addSectionButton.addEventListener("click", () => {
  state.sections.push({ label: "RULE", heading: "หมวดใหม่", listType: "ul", items: [{ text: "", html: "", dirty: true }] });
  renderSections();
  markReady();
});
els.saveButton.addEventListener("click", saveCurrentPage);

function renderPageList() {
  els.pageList.innerHTML = "";
  pages.forEach((page) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-list-button";
    button.textContent = page.title;
    button.dataset.file = page.file;
    button.addEventListener("click", () => loadPage(page.file));
    els.pageList.append(button);
  });
}

async function pickFolder() {
  if (!window.showDirectoryPicker) {
    showToast("เบราว์เซอร์นี้ยังไม่รองรับการบันทึกทับไฟล์โดยตรง ให้ใช้ Chrome หรือ Edge รุ่นใหม่");
    return;
  }

  state.directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  state.fileHandles.clear();
  state.github.connected = false;

  for (const page of pages) {
    try {
      const handle = await state.directoryHandle.getFileHandle(page.file);
      state.fileHandles.set(page.file, handle);
    } catch {
      // Some pages may not exist in older copies of the site.
    }
  }

  els.connectionStatus.textContent = `Local folder: ${state.fileHandles.size} หน้า`;
  showToast("เลือกโฟลเดอร์แล้ว เลือกหน้ากฎที่ต้องการแก้ได้เลย");
}

async function importFiles(event) {
  const files = [...event.target.files].filter((file) => file.name.endsWith(".html"));
  for (const file of files) {
    state.importedFiles.set(file.name, await file.text());
  }
  els.connectionStatus.textContent = `นำเข้าแล้ว: ${state.importedFiles.size} ไฟล์`;
  showToast("นำเข้าไฟล์แล้ว เลือกหน้าที่ต้องการแก้ไขได้เลย");
}

async function connectGithub() {
  const owner = els.githubOwnerInput.value.trim();
  const repo = els.githubRepoInput.value.trim();
  const branch = els.githubBranchInput.value.trim() || "main";
  const token = els.githubTokenInput.value.trim();

  if (!owner || !repo || !token) {
    showToast("กรอก owner, repo และ token ให้ครบก่อนเชื่อม GitHub");
    return;
  }

  state.github = { connected: true, owner, repo, branch, token, files: new Map() };
  localStorage.setItem("ruleAdminGithub", JSON.stringify({ owner, repo, branch }));

  try {
    await githubRequest(`/repos/${owner}/${repo}`, { method: "GET" });
    els.connectionStatus.textContent = `GitHub: ${owner}/${repo} (${branch})`;
    showToast("เชื่อม GitHub แล้ว เลือกหน้ากฎที่ต้องการแก้ได้เลย");
  } catch (error) {
    state.github.connected = false;
    showToast(`เชื่อม GitHub ไม่สำเร็จ: ${error.message}`);
  }
}

function restoreGithubSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("ruleAdminGithub") || "{}");
    if (saved.owner) els.githubOwnerInput.value = saved.owner;
    if (saved.repo) els.githubRepoInput.value = saved.repo;
    if (saved.branch) els.githubBranchInput.value = saved.branch;
  } catch {
    // Ignore invalid saved settings.
  }
}

async function loadPage(fileName) {
  const html = await readHtml(fileName);
  if (!html) {
    showToast("ยังไม่มีไฟล์หน้านี้ ให้เลือกโฟลเดอร์เว็บ, นำเข้าไฟล์, หรือเชื่อม GitHub ก่อน");
    return;
  }

  state.currentFile = fileName;
  state.currentHtml = html;
  state.doc = new DOMParser().parseFromString(html, "text/html");
  state.sections = readSections(state.doc);

  const page = pages.find((item) => item.file === fileName);
  els.currentPageTitle.textContent = page ? page.title : fileName;
  els.heroTitleInput.value = state.doc.querySelector(".page-hero h1")?.textContent.trim() || "";
  els.heroDescriptionInput.value = state.doc.querySelector(".page-hero p")?.textContent.trim() || "";
  els.emptyState.hidden = true;
  els.editorForm.hidden = false;
  els.saveButton.disabled = false;

  document.querySelectorAll(".page-list-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.file === fileName);
  });

  renderSections();
}

async function readHtml(fileName) {
  if (state.github.connected) {
    const githubFile = await readGithubFile(fileName);
    state.github.files.set(fileName, githubFile);
    return githubFile.content;
  }

  if (state.fileHandles.has(fileName)) {
    const file = await state.fileHandles.get(fileName).getFile();
    return file.text();
  }
  if (state.importedFiles.has(fileName)) return state.importedFiles.get(fileName);

  try {
    const response = await fetch(fileName, { cache: "no-store" });
    if (response.ok) return response.text();
  } catch {
    // Opening admin.html as a file cannot fetch sibling files in many browsers.
  }

  return "";
}

async function readGithubFile(fileName) {
  const data = await githubRequest(`/repos/${state.github.owner}/${state.github.repo}/contents/${encodeURIComponent(fileName)}?ref=${encodeURIComponent(state.github.branch)}`, {
    method: "GET"
  });
  return {
    content: decodeBase64Utf8(data.content || ""),
    sha: data.sha
  };
}

function readSections(doc) {
  return [...doc.querySelectorAll(".rule-detail")].map((article) => {
    const list = article.querySelector("ol, ul");
    return {
      label: article.querySelector(":scope > span")?.textContent.trim() || "RULE",
      heading: article.querySelector(":scope > h3")?.textContent.trim() || "หมวดกฎ",
      listType: list?.tagName.toLowerCase() || "ul",
      items: [...(list?.querySelectorAll(":scope > li") || [])].map((item) => ({
        text: item.textContent.trim(),
        html: item.innerHTML,
        dirty: false
      }))
    };
  });
}

function renderSections() {
  els.sectionEditorList.innerHTML = "";
  state.sections.forEach((section, sectionIndex) => {
    const node = els.sectionTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.sectionIndex = sectionIndex;
    node.querySelector(".section-index").textContent = `SECTION ${sectionIndex + 1}`;
    node.querySelector('[data-field="label"]').value = section.label;
    node.querySelector('[data-field="heading"]').value = section.heading;
    node.querySelector('[data-field="listType"]').value = section.listType;

    node.querySelector('[data-field="label"]').addEventListener("input", (event) => { section.label = event.target.value; });
    node.querySelector('[data-field="heading"]').addEventListener("input", (event) => { section.heading = event.target.value; });
    node.querySelector('[data-field="listType"]').addEventListener("change", (event) => { section.listType = event.target.value; });
    node.querySelector('[data-action="remove-section"]').addEventListener("click", () => {
      state.sections.splice(sectionIndex, 1);
      renderSections();
    });
    node.querySelector('[data-action="add-rule"]').addEventListener("click", () => {
      section.items.push({ text: "", html: "", dirty: true });
      renderSections();
    });

    const itemList = node.querySelector(".rule-item-list");
    section.items.forEach((item, itemIndex) => {
      const itemNode = els.ruleItemTemplate.content.firstElementChild.cloneNode(true);
      itemNode.querySelector(".rule-item-number").textContent = `${itemIndex + 1}.`;
      const textarea = itemNode.querySelector('[data-field="ruleText"]');
      textarea.value = item.text;
      textarea.addEventListener("input", (event) => {
        item.text = event.target.value;
        item.dirty = true;
      });
      itemNode.querySelector('[data-action="remove-rule"]').addEventListener("click", () => {
        section.items.splice(itemIndex, 1);
        renderSections();
      });
      itemList.append(itemNode);
    });

    els.sectionEditorList.append(node);
  });
}

async function saveCurrentPage() {
  if (!state.currentFile || !state.doc) return;

  const html = buildUpdatedHtml();
  if (state.github.connected) {
    await saveGithubFile(state.currentFile, html);
    state.currentHtml = html;
    showToast(`commit ${state.currentFile} ไปที่ GitHub แล้ว`);
    return;
  }

  if (state.fileHandles.has(state.currentFile)) {
    const writable = await state.fileHandles.get(state.currentFile).createWritable();
    await writable.write(html);
    await writable.close();
    state.currentHtml = html;
    state.importedFiles.set(state.currentFile, html);
    showToast(`บันทึก ${state.currentFile} แล้ว`);
    return;
  }

  downloadHtml(state.currentFile, html);
  state.importedFiles.set(state.currentFile, html);
  showToast("ดาวน์โหลดไฟล์ที่แก้แล้ว เพราะยังไม่ได้เลือกโฟลเดอร์หรือเชื่อม GitHub สำหรับบันทึกทับ");
}

async function saveGithubFile(fileName, html) {
  const cached = state.github.files.get(fileName) || {};
  const payload = {
    message: `Update rules: ${fileName}`,
    content: encodeBase64Utf8(html),
    branch: state.github.branch,
    sha: cached.sha
  };

  const data = await githubRequest(`/repos/${state.github.owner}/${state.github.repo}/contents/${encodeURIComponent(fileName)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  state.github.files.set(fileName, {
    content: html,
    sha: data.content?.sha || cached.sha
  });
}

function buildUpdatedHtml() {
  const doc = new DOMParser().parseFromString(state.currentHtml, "text/html");
  const heroTitle = doc.querySelector(".page-hero h1");
  const heroDescription = doc.querySelector(".page-hero p");
  if (heroTitle) heroTitle.textContent = els.heroTitleInput.value.trim();
  if (heroDescription) heroDescription.textContent = els.heroDescriptionInput.value.trim();

  const stack = doc.querySelector(".detail-stack");
  if (!stack) throw new Error("ไม่พบ .detail-stack ในหน้านี้");

  stack.innerHTML = "";
  state.sections.forEach((section) => {
    const article = doc.createElement("article");
    article.className = "rule-detail";

    const label = doc.createElement("span");
    label.textContent = section.label || "RULE";
    article.append(label);

    const heading = doc.createElement("h3");
    heading.textContent = section.heading || "หมวดกฎ";
    article.append(heading);

    const list = doc.createElement(section.listType === "ol" ? "ol" : "ul");
    section.items.forEach((item) => {
      const li = doc.createElement("li");
      if (item.dirty || !item.html) {
        li.textContent = item.text || "";
      } else {
        li.innerHTML = item.html;
      }
      list.append(li);
    });
    article.append(list);
    stack.append(article);
  });

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}\n`;
}

function downloadHtml(fileName, html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markReady() {
  els.emptyState.hidden = true;
  els.editorForm.hidden = false;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "admin-toast";
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${state.github.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || `GitHub API error ${response.status}`);
  }
  return data;
}

function decodeBase64Utf8(value) {
  const clean = value.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
