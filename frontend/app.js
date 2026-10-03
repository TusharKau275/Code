/**
 * PhishGuard AI - Frontend Application Logic
 * Integrates with FastAPI backend for real-time NLP phishing detection,
 * model benchmarking, batch scanning, and developer documentation.
 */

// Global State
const state = {
  samples: [],
  benchmarkData: null,
  activeScanResult: null,
  rawEmailText: "",
  inspectorMode: "highlight",
  batchResults: [],
  selectedCodeLang: "curl"
};

// API Base URL - empty string for same origin, fallback to localhost:8000
const API_BASE = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
  ? window.location.origin
  : "";

// DOM Elements Cache
const DOM = {};

document.addEventListener("DOMContentLoaded", () => {
  initDOMElements();
  initTabs();
  initFormListeners();
  initInspectorTabs();
  initBatchScanner();
  initCodeGenerator();
  checkSystemHealth();
  fetchSampleEmails();
  fetchModelBenchmarks();
});

function initDOMElements() {
  DOM.statusPill = document.getElementById("systemStatusPill");
  DOM.statusDot = DOM.statusPill?.querySelector(".status-dot");
  DOM.statusText = document.getElementById("systemStatusText");
  DOM.navTabs = document.querySelectorAll(".nav-tab");
  DOM.viewPanels = document.querySelectorAll(".view-panel");

  // Form
  DOM.emailForm = document.getElementById("emailScanForm");
  DOM.modelSelect = document.getElementById("modelSelect");
  DOM.inputSender = document.getElementById("inputSender");
  DOM.inputSubject = document.getElementById("inputSubject");
  DOM.inputBody = document.getElementById("inputBody");
  DOM.parsedDomainTag = document.getElementById("parsedDomainTag");
  DOM.subjectCharCount = document.getElementById("subjectCharCount");
  DOM.bodyCharCount = document.getElementById("bodyCharCount");
  DOM.btnAnalyze = document.getElementById("btnAnalyze");
  DOM.btnClear = document.getElementById("btnClear");
  DOM.btnRandomSample = document.getElementById("btnRandomSample");
  DOM.samplesContainer = document.getElementById("samplesContainer");

  // Results
  DOM.resultsCard = document.getElementById("resultsCard");
  DOM.resultsEmpty = document.getElementById("resultsEmpty");
  DOM.resultsActive = document.getElementById("resultsActive");
  DOM.verdictBanner = document.getElementById("verdictBanner");
  DOM.threatBadge = document.getElementById("threatBadge");
  DOM.threatHeadline = document.getElementById("threatHeadline");
  DOM.threatRecommendation = document.getElementById("threatRecommendation");
  DOM.gaugeFill = document.getElementById("gaugeFill");
  DOM.gaugeScoreValue = document.getElementById("gaugeScoreValue");
  DOM.consensusTag = document.getElementById("consensusTag");
  DOM.modelBarsGrid = document.getElementById("modelBarsGrid");
  DOM.signalsGrid = document.getElementById("signalsGrid");
  DOM.inspectorContent = document.getElementById("inspectorContent");
  DOM.btnInspHighlight = document.getElementById("btnInspHighlight");
  DOM.btnInspRaw = document.getElementById("btnInspRaw");

  // Benchmarks
  DOM.bmTotalEmails = document.getElementById("bmTotalEmails");
  DOM.bmFeatureCount = document.getElementById("bmFeatureCount");
  DOM.bmTestSize = document.getElementById("bmTestSize");
  DOM.leaderboardBody = document.getElementById("leaderboardBody");
  DOM.confusionGrid = document.getElementById("confusionGrid");
  DOM.featureBarsList = document.getElementById("featureBarsList");

  // Batch
  DOM.csvDropzone = document.getElementById("csvDropzone");
  DOM.csvFileInput = document.getElementById("csvFileInput");
  DOM.btnLoadSampleCsv = document.getElementById("btnLoadSampleCsv");
  DOM.batchModelSelect = document.getElementById("batchModelSelect");
  DOM.batchTotalCount = document.getElementById("batchTotalCount");
  DOM.batchPhishCount = document.getElementById("batchPhishCount");
  DOM.batchLegitCount = document.getElementById("batchLegitCount");
  DOM.batchAvgScore = document.getElementById("batchAvgScore");
  DOM.batchTableBody = document.getElementById("batchTableBody");
  DOM.batchRowCountTag = document.getElementById("batchRowCountTag");
  DOM.batchSearchInput = document.getElementById("batchSearchInput");
  DOM.btnExportCsv = document.getElementById("btnExportCsv");

  // Code Gen
  DOM.codeSnippetDisplay = document.getElementById("codeSnippetDisplay");
  DOM.btnCopyCode = document.getElementById("btnCopyCode");
  DOM.snipTabs = document.querySelectorAll(".snip-tab");
}

/* ==========================================================================
   Navigation Tabs
   ========================================================================== */
function initTabs() {
  DOM.navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetView = tab.getAttribute("data-view");

      DOM.navTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      DOM.viewPanels.forEach(panel => {
        panel.classList.remove("active");
        panel.hidden = true;
      });

      const activePanel = document.getElementById(`view${capitalize(targetView)}`);
      if (activePanel) {
        activePanel.classList.add("active");
        activePanel.hidden = false;
      }
    });
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ==========================================================================
   Health & Initialization
   ========================================================================== */
async function checkSystemHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error("API offline");
    const data = await res.json();
    if (DOM.statusDot) {
      DOM.statusDot.className = "status-dot online";
    }
    if (DOM.statusText) {
      DOM.statusText.textContent = `Online • ${data.models_loaded.length} Models Active`;
    }
  } catch (err) {
    if (DOM.statusDot) {
      DOM.statusDot.className = "status-dot pulsing";
    }
    if (DOM.statusText) {
      DOM.statusText.textContent = "Connecting to Backend...";
    }
  }
}

async function fetchSampleEmails() {
  try {
    const res = await fetch(`${API_BASE}/api/samples`);
    if (!res.ok) return;
    const data = await res.json();
    state.samples = data.samples || [];
    renderSampleChips(state.samples);
  } catch (e) {
    console.warn("Could not load sample emails:", e);
  }
}

function renderSampleChips(samples) {
  if (!DOM.samplesContainer || !samples.length) return;
  DOM.samplesContainer.innerHTML = "";

  samples.forEach(sample => {
    const btn = document.createElement("button");
    const isPhish = sample.expected_label === "phishing";
    btn.className = `sample-chip ${isPhish ? "phish" : "legit"}`;
    btn.setAttribute("type", "button");
    btn.innerHTML = `${isPhish ? "🚨" : "🛡️"} ${sample.title}`;
    btn.addEventListener("click", () => populateFormWithSample(sample));
    DOM.samplesContainer.appendChild(btn);
  });
}

function populateFormWithSample(sample) {
  if (!sample) return;
  DOM.inputSender.value = sample.sender;
  DOM.inputSubject.value = sample.subject;
  DOM.inputBody.value = sample.body;
  updateFormCounters();
}

/* ==========================================================================
   Form Handling & Domain Parser
   ========================================================================== */
function initFormListeners() {
  DOM.inputSender?.addEventListener("input", updateFormCounters);
  DOM.inputSubject?.addEventListener("input", updateFormCounters);
  DOM.inputBody?.addEventListener("input", updateFormCounters);

  DOM.btnClear?.addEventListener("click", () => {
    DOM.emailForm?.reset();
    updateFormCounters();
    showEmptyResults();
  });

  DOM.btnRandomSample?.addEventListener("click", () => {
    if (!state.samples.length) return;
    const randomSample = state.samples[Math.floor(Math.random() * state.samples.length)];
    populateFormWithSample(randomSample);
  });

  DOM.emailForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleAnalyzeSubmit();
  });
}

function updateFormCounters() {
  const sender = DOM.inputSender?.value.trim() || "";
  const subject = DOM.inputSubject?.value || "";
  const body = DOM.inputBody?.value || "";

  // Parse domain
  let domain = "";
  if (sender.includes("@")) {
    domain = sender.split("@").pop().trim();
  } else if (sender) {
    domain = sender;
  }
  if (DOM.parsedDomainTag) {
    if (domain) {
      DOM.parsedDomainTag.textContent = `@${domain}`;
      DOM.parsedDomainTag.classList.add("active");
    } else {
      DOM.parsedDomainTag.textContent = "No domain parsed";
      DOM.parsedDomainTag.classList.remove("active");
    }
  }

  // Chars
  if (DOM.subjectCharCount) DOM.subjectCharCount.textContent = `${subject.length} chars`;
  if (DOM.bodyCharCount) DOM.bodyCharCount.textContent = `${body.length} chars`;
}

async function handleAnalyzeSubmit() {
  const sender = DOM.inputSender?.value.trim();
  const subject = DOM.inputSubject?.value.trim();
  const body = DOM.inputBody?.value.trim();
  const modelName = DOM.modelSelect?.value || "Random Forest";

  if (!subject && !body) {
    alert("Please provide at least a subject or body for analysis.");
    return;
  }

  // Set loading state
  DOM.btnAnalyze?.classList.add("loading");
  if (DOM.btnAnalyze) DOM.btnAnalyze.disabled = true;

  try {
    const payload = {
      sender: sender || "unknown@unverified.org",
      subject: subject || "",
      body: body || "",
      model_name: modelName
    };

    const res = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Analysis failed");
    }

    const result = await res.json();
    state.activeScanResult = result;
    state.rawEmailText = `${subject}\n\n${body}`;
    renderScanResults(result);
  } catch (err) {
    console.error("Scan error:", err);
    alert(`Detection error: ${err.message}`);
  } finally {
    DOM.btnAnalyze?.classList.remove("loading");
    if (DOM.btnAnalyze) DOM.btnAnalyze.disabled = false;
  }
}

/* ==========================================================================
   Results Rendering & Gauge Animation
   ========================================================================== */
function showEmptyResults() {
  if (DOM.resultsEmpty) DOM.resultsEmpty.classList.remove("hidden");
  if (DOM.resultsActive) DOM.resultsActive.classList.add("hidden");
}

function renderScanResults(result) {
  if (!DOM.resultsActive || !DOM.resultsEmpty) return;

  DOM.resultsEmpty.classList.add("hidden");
  DOM.resultsActive.classList.remove("hidden");

  const isPhish = result.is_phishing;
  const score = result.risk_score;
  const badgeClass = result.risk_badge || (isPhish ? "danger" : "safe");

  // Verdict Banner
  if (DOM.verdictBanner) {
    DOM.verdictBanner.className = `verdict-banner ${badgeClass}`;
  }
  if (DOM.threatBadge) {
    DOM.threatBadge.textContent = result.risk_level.toUpperCase();
  }
  if (DOM.threatHeadline) {
    DOM.threatHeadline.textContent = isPhish ? "Phishing Email Detected" : "Legitimate Email Verified";
  }
  if (DOM.threatRecommendation) {
    DOM.threatRecommendation.textContent = result.recommendation;
  }

  // Animate Gauge
  animateGauge(score);

  // Model Consensus Bars
  renderModelBars(result.all_models);
  if (DOM.consensusTag) {
    const consensus = result.consensus;
    DOM.consensusTag.textContent = `${consensus.phish_votes} of ${consensus.total_models} Models Flagged Threat`;
  }

  // Signals Grid
  renderSignals(result.signals);

  // Inspector View
  renderInspector();
}

function animateGauge(score) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // 314.15
  const offset = circumference - (score / 100) * circumference;

  if (DOM.gaugeFill) {
    DOM.gaugeFill.style.strokeDashoffset = offset;
  }

  // Number counter animation
  let current = 0;
  const duration = 600;
  const stepTime = 15;
  const steps = duration / stepTime;
  const increment = score / steps;

  const timer = setInterval(() => {
    current += increment;
    if (current >= score) {
      current = score;
      clearInterval(timer);
    }
    if (DOM.gaugeScoreValue) {
      DOM.gaugeScoreValue.textContent = Math.round(current);
    }
  }, stepTime);
}

function renderModelBars(allModels) {
  if (!DOM.modelBarsGrid || !allModels) return;
  DOM.modelBarsGrid.innerHTML = "";

  for (const [name, data] of Object.entries(allModels)) {
    const item = document.createElement("div");
    item.className = "model-bar-item";
    const isPhish = data.is_phishing;
    const prob = Math.round(data.phishing_probability * 100);

    item.innerHTML = `
      <div class="mb-header">
        <span class="mb-name">${name}</span>
        <span class="mb-verdict ${isPhish ? "phish" : "legit"}">
          ${isPhish ? "PHISHING" : "LEGITIMATE"} (${prob}%)
        </span>
      </div>
      <div class="mb-track">
        <div class="mb-fill ${isPhish ? "phish" : "legit"}" style="width: ${prob}%"></div>
      </div>
    `;
    DOM.modelBarsGrid.appendChild(item);
  }
}

function renderSignals(signals) {
  if (!DOM.signalsGrid || !signals) return;
  DOM.signalsGrid.innerHTML = "";

  signals.forEach(sig => {
    const card = document.createElement("div");
    card.className = `signal-card ${sig.status}`;
    card.innerHTML = `
      <span class="sig-name">${sig.name}</span>
      <span class="sig-value">${sig.value}</span>
      <span class="sig-detail">${sig.detail}</span>
    `;
    DOM.signalsGrid.appendChild(card);
  });
}

function initInspectorTabs() {
  DOM.btnInspHighlight?.addEventListener("click", () => {
    state.inspectorMode = "highlight";
    DOM.btnInspHighlight.classList.add("active");
    DOM.btnInspRaw?.classList.remove("active");
    renderInspector();
  });

  DOM.btnInspRaw?.addEventListener("click", () => {
    state.inspectorMode = "raw";
    DOM.btnInspRaw.classList.add("active");
    DOM.btnInspHighlight?.classList.remove("active");
    renderInspector();
  });
}

function renderInspector() {
  if (!DOM.inspectorContent) return;
  const text = state.rawEmailText;
  if (!text) {
    DOM.inspectorContent.innerHTML = "<span class='text-muted'>No text to inspect.</span>";
    return;
  }

  if (state.inspectorMode === "raw") {
    DOM.inspectorContent.textContent = text;
    return;
  }

  // Highlight Mode
  const suspiciousTokens = state.activeScanResult?.suspicious_tokens || [];
  let html = escapeHtml(text);

  // Highlight URLs
  const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
  html = html.replace(urlRegex, '<span class="token-highlight-yellow">$1</span>');

  // Highlight suspicious words
  suspiciousTokens.forEach(token => {
    if (!token || token.length < 2) return;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reg = new RegExp(`\\b(${escaped})\\b`, "gi");
    html = html.replace(reg, '<span class="token-highlight-red">$1</span>');
  });

  DOM.inspectorContent.innerHTML = html.replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ==========================================================================
   Model Benchmarks View
   ========================================================================== */
async function fetchModelBenchmarks() {
  try {
    const res = await fetch(`${API_BASE}/api/models`);
    if (!res.ok) return;
    const data = await res.json();
    state.benchmarkData = data;
    renderBenchmarks(data);
  } catch (err) {
    console.error("Could not fetch model benchmarks:", err);
  }
}

function renderBenchmarks(data) {
  if (!data) return;

  // Overview stats
  if (DOM.bmTotalEmails) DOM.bmTotalEmails.textContent = data.total_emails.toLocaleString();
  if (DOM.bmFeatureCount) DOM.bmFeatureCount.textContent = data.feature_count.toLocaleString();
  if (DOM.bmTestSize) DOM.bmTestSize.textContent = data.test_size.toLocaleString();

  // Leaderboard table
  if (DOM.leaderboardBody && data.models) {
    DOM.leaderboardBody.innerHTML = "";
    const sorted = Object.entries(data.models).sort((a, b) => b[1].f1_score - a[1].f1_score);

    sorted.forEach(([name, m]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${name}</strong></td>
        <td>${(m.accuracy * 100).toFixed(1)}%</td>
        <td>${(m.precision * 100).toFixed(1)}%</td>
        <td>${(m.recall * 100).toFixed(1)}%</td>
        <td><strong>${m.f1_score.toFixed(4)}</strong></td>
        <td><span class="text-safe">${m.tp}</span></td>
        <td><span class="text-safe">${m.tn}</span></td>
        <td>${m.fp > 0 ? `<span class="text-danger">${m.fp}</span>` : "0"}</td>
        <td>${m.fn > 0 ? `<span class="text-danger">${m.fn}</span>` : "0"}</td>
      `;
      DOM.leaderboardBody.appendChild(tr);
    });
  }

  // Confusion Matrices
  if (DOM.confusionGrid && data.models) {
    DOM.confusionGrid.innerHTML = "";
    for (const [name, m] of Object.entries(data.models)) {
      const cmCard = document.createElement("div");
      cmCard.className = "cm-card";
      cmCard.innerHTML = `
        <div class="cm-title">
          <span>${name}</span>
          <span class="card-badge">${(m.accuracy * 100).toFixed(1)}% Acc</span>
        </div>
        <div class="cm-matrix">
          <div class="cm-cell tp">
            <div class="cm-cell-num">${m.tp}</div>
            <div class="cm-cell-lbl">True Positive (Phish)</div>
          </div>
          <div class="cm-cell fn">
            <div class="cm-cell-num">${m.fn}</div>
            <div class="cm-cell-lbl">False Negative (Missed)</div>
          </div>
          <div class="cm-cell fp">
            <div class="cm-cell-num">${m.fp}</div>
            <div class="cm-cell-lbl">False Positive (False Alarm)</div>
          </div>
          <div class="cm-cell tn">
            <div class="cm-cell-num">${m.tn}</div>
            <div class="cm-cell-lbl">True Negative (Legit)</div>
          </div>
        </div>
      `;
      DOM.confusionGrid.appendChild(cmCard);
    }
  }

  // Top 20 Feature Importances
  if (DOM.featureBarsList && data.feature_importance) {
    DOM.featureBarsList.innerHTML = "";
    const maxVal = Math.max(...data.feature_importance.map(f => f.importance), 0.001);

    data.feature_importance.forEach(feat => {
      const pct = Math.round((feat.importance / maxVal) * 100);
      const row = document.createElement("div");
      row.className = "feat-bar-row";
      row.innerHTML = `
        <span class="feat-name" title="${feat.feature}">${feat.feature}</span>
        <div class="feat-track">
          <div class="feat-fill" style="width: ${pct}%"></div>
        </div>
        <span class="feat-score">${feat.importance.toFixed(4)}</span>
      `;
      DOM.featureBarsList.appendChild(row);
    });
  }
}

/* ==========================================================================
   Batch CSV Scanner
   ========================================================================== */
function initBatchScanner() {
  const dropzone = DOM.csvDropzone;
  const fileInput = DOM.csvFileInput;

  if (dropzone && fileInput) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        handleCsvFile(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) {
        handleCsvFile(e.target.files[0]);
      }
    });
  }

  DOM.btnLoadSampleCsv?.addEventListener("click", () => {
    loadPreloadedBatch();
  });

  DOM.batchSearchInput?.addEventListener("input", (e) => {
    filterBatchTable(e.target.value);
  });

  DOM.btnExportCsv?.addEventListener("click", () => {
    exportBatchResultsToCsv();
  });
}

async function handleCsvFile(file) {
  if (!file.name.endsWith(".csv")) {
    alert("Please upload a valid CSV file.");
    return;
  }

  const modelName = DOM.batchModelSelect?.value || "Random Forest";
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/api/upload-csv?model_name=${encodeURIComponent(modelName)}`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Batch scan failed");
    }

    const batchData = await res.json();
    renderBatchScanResults(batchData);
  } catch (err) {
    console.error("Batch scan error:", err);
    alert(`CSV scan failed: ${err.message}`);
  }
}

async function loadPreloadedBatch() {
  if (!state.samples.length) {
    await fetchSampleEmails();
  }
  const modelName = DOM.batchModelSelect?.value || "Random Forest";
  const emailItems = state.samples.map(s => ({
    id: s.id,
    sender: s.sender,
    subject: s.subject,
    body: s.body,
    model_name: modelName
  }));

  try {
    const res = await fetch(`${API_BASE}/api/batch-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: emailItems })
    });

    if (!res.ok) throw new Error("Batch request failed");
    const data = await res.json();
    renderBatchScanResults(data);
  } catch (err) {
    console.error("Load batch sample error:", err);
    alert(`Batch error: ${err.message}`);
  }
}

function renderBatchScanResults(batchData) {
  state.batchResults = batchData.results || [];
  const summary = batchData.summary || {};

  if (DOM.batchTotalCount) DOM.batchTotalCount.textContent = summary.total_analyzed || 0;
  if (DOM.batchPhishCount) DOM.batchPhishCount.textContent = `${summary.phishing_detected || 0} (${summary.phishing_rate_percent || 0}%)`;
  if (DOM.batchLegitCount) DOM.batchLegitCount.textContent = summary.legitimate_detected || 0;
  if (DOM.batchAvgScore) DOM.batchAvgScore.textContent = `${summary.average_threat_score || 0}%`;

  if (DOM.btnExportCsv) {
    DOM.btnExportCsv.disabled = state.batchResults.length === 0;
  }

  filterBatchTable("");
}

function filterBatchTable(query) {
  if (!DOM.batchTableBody) return;
  const q = query.toLowerCase().trim();
  const rows = state.batchResults.filter(item => {
    if (!q) return true;
    return (
      (item.subject && item.subject.toLowerCase().includes(q)) ||
      (item.sender && item.sender.toLowerCase().includes(q)) ||
      (item.prediction && item.prediction.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q))
    );
  });

  if (DOM.batchRowCountTag) {
    DOM.batchRowCountTag.textContent = `${rows.length} of ${state.batchResults.length} Records`;
  }

  if (rows.length === 0) {
    DOM.batchTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No emails matching query.</td></tr>`;
    return;
  }

  DOM.batchTableBody.innerHTML = "";
  rows.forEach(r => {
    const isPhish = r.is_phishing;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${r.id || "-"}</code></td>
      <td title="${r.sender || ""}">${truncate(r.sender || "", 24)}</td>
      <td title="${r.subject || ""}">${truncate(r.subject || "", 30)}</td>
      <td>
        <span class="threat-level-badge ${isPhish ? "danger" : "safe"}">
          ${isPhish ? "PHISHING" : "LEGITIMATE"}
        </span>
      </td>
      <td><strong>${r.risk_score}%</strong></td>
      <td>${r.confidence_percent}%</td>
      <td>
        <button class="btn btn-ghost btn-sm" type="button" onclick="loadBatchItemToScanner('${r.id}')">Inspect</button>
      </td>
    `;
    DOM.batchTableBody.appendChild(tr);
  });
}

function truncate(str, n) {
  return str.length > n ? str.substr(0, n - 1) + "…" : str;
}

window.loadBatchItemToScanner = function(id) {
  const item = state.samples.find(s => s.id === id);
  if (item) {
    populateFormWithSample(item);
    // Switch to scanner view
    const tab = document.getElementById("tabBtnScanner");
    if (tab) tab.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

function exportBatchResultsToCsv() {
  if (!state.batchResults.length) return;
  const headers = ["ID", "Sender", "Subject", "Prediction", "Threat Score", "Confidence", "Threat Level"];
  const rows = state.batchResults.map(r => [
    `"${r.id || ""}"`,
    `"${(r.sender || "").replace(/"/g, '""')}"`,
    `"${(r.subject || "").replace(/"/g, '""')}"`,
    `"${r.prediction || ""}"`,
    r.risk_score || 0,
    r.confidence_percent || 0,
    `"${r.risk_level || ""}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `phishguard_scan_results_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ==========================================================================
   Code Snippet Generator & Clipboard
   ========================================================================== */
function initCodeGenerator() {
  DOM.snipTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      DOM.snipTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.selectedCodeLang = tab.getAttribute("data-lang");
      updateCodeSnippet();
    });
  });

  DOM.btnCopyCode?.addEventListener("click", () => {
    const code = DOM.codeSnippetDisplay?.textContent || "";
    navigator.clipboard.writeText(code).then(() => {
      const copyLabel = document.getElementById("copyLabel");
      const copyIcon = document.getElementById("copyIcon");
      if (copyLabel) copyLabel.textContent = "Copied!";
      if (copyIcon) copyIcon.textContent = "✅";
      setTimeout(() => {
        if (copyLabel) copyLabel.textContent = "Copy";
        if (copyIcon) copyIcon.textContent = "📋";
      }, 2000);
    });
  });

  updateCodeSnippet();
}

function updateCodeSnippet() {
  if (!DOM.codeSnippetDisplay) return;
  const origin = window.location.origin;

  const curlCode = `curl -X POST "${origin}/api/predict" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sender": "security-alert@irs-refund-claim.xyz",
    "subject": "Urgent: Tax Refund Pending Action Required",
    "body": "Confirm your banking credentials immediately at http://irs-refund-claim.xyz",
    "model_name": "Random Forest"
  }'`;

  const pythonCode = `import requests

payload = {
    "sender": "security-alert@irs-refund-claim.xyz",
    "subject": "Urgent: Tax Refund Pending Action Required",
    "body": "Confirm your banking credentials immediately at http://irs-refund-claim.xyz",
    "model_name": "Random Forest"
}

response = requests.post("${origin}/api/predict", json=payload)
data = response.json()

print(f"Verdict: {data['prediction'].upper()}")
print(f"Threat Score: {data['risk_score']}% ({data['risk_level']})")
print(f"Recommendation: {data['recommendation']}")`;

  const jsCode = `const payload = {
  sender: "security-alert@irs-refund-claim.xyz",
  subject: "Urgent: Tax Refund Pending Action Required",
  body: "Confirm your banking credentials immediately at http://irs-refund-claim.xyz",
  model_name: "Random Forest"
};

fetch("${origin}/api/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => {
    console.log("Prediction:", data.prediction);
    console.log("Risk Score:", data.risk_score + "%");
  });`;

  let snippet = curlCode;
  if (state.selectedCodeLang === "python") snippet = pythonCode;
  if (state.selectedCodeLang === "js") snippet = jsCode;

  DOM.codeSnippetDisplay.textContent = snippet;
}
