/**
 * PhishGuard AI — Defense Engine Frontend Logic
 * Interactive Scanner, Multi-Model Consensus, and Benchmarks Leaderboard
 */

const state = {
  samples: [],
  benchmarkData: null,
  activeScanResult: null,
  rawEmailText: "",
  inspectorMode: "highlight",
};

const API_BASE =
  window.location.origin.includes("localhost") ||
  window.location.origin.includes("127.0.0.1")
    ? window.location.origin
    : "";

const DOM = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  initTabs();
  initInputs();
  initInspectorTabs();
  checkHealth();
  fetchSamples();
  fetchBenchmarks();
});

/* ==========================================================================
   DOM Caching
   ========================================================================== */
function cacheDom() {
  DOM.statusDot = document.getElementById("statusDot");
  DOM.statusText = document.getElementById("systemStatusText");
  DOM.navBtns = document.querySelectorAll(".nav-btn");
  DOM.views = document.querySelectorAll(".view-panel");

  DOM.emailForm = document.getElementById("emailScanForm");
  DOM.modelSelect = document.getElementById("modelSelect");
  DOM.inputSender = document.getElementById("inputSender");
  DOM.inputSubject = document.getElementById("inputSubject");
  DOM.inputBody = document.getElementById("inputBody");
  DOM.parsedDomainTag = document.getElementById("parsedDomainTag");
  DOM.subjectCharCount = document.getElementById("subjectCharCount");
  DOM.bodyCharCount = document.getElementById("bodyCharCount");
  DOM.btnAnalyze = document.getElementById("btnAnalyze");
  DOM.btnScanText = document.getElementById("btnScanText");
  DOM.btnClear = document.getElementById("btnClear");
  DOM.btnRandomSample = document.getElementById("btnRandomSample");
  DOM.samplesContainer = document.getElementById("samplesContainer");
  DOM.liveScanTag = document.getElementById("liveScanTag");

  DOM.resultsEmpty = document.getElementById("resultsEmpty");
  DOM.resultsActive = document.getElementById("resultsActive");
  DOM.verdictBanner = document.getElementById("verdictBanner");
  DOM.threatBadge = document.getElementById("threatBadge");
  DOM.confidencePill = document.getElementById("confidencePill");
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

  DOM.bmTotalEmails = document.getElementById("bmTotalEmails");
  DOM.bmFeatureCount = document.getElementById("bmFeatureCount");
  DOM.bmTestSize = document.getElementById("bmTestSize");
  DOM.leaderboardBody = document.getElementById("leaderboardBody");
  DOM.confusionGrid = document.getElementById("confusionGrid");
  DOM.featureBarsList = document.getElementById("featureBarsList");
}

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
function initTabs() {
  DOM.navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      DOM.navBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      DOM.views.forEach((v) => {
        v.classList.remove("active");
        v.hidden = true;
      });

      const panel = document.getElementById(
        `view${view.charAt(0).toUpperCase() + view.slice(1)}`
      );
      if (panel) {
        panel.classList.add("active");
        panel.hidden = false;
      }
    });
  });
}

/* ==========================================================================
   Input Listeners & Counters
   ========================================================================== */
function initInputs() {
  // Sender input: extract domain dynamically
  DOM.inputSender.addEventListener("input", () => {
    updateSenderDomain(DOM.inputSender.value);
  });

  // Subject line char count
  DOM.inputSubject.addEventListener("input", () => {
    DOM.subjectCharCount.textContent = `${DOM.inputSubject.value.length} chars`;
  });

  // Body content stats (words & chars)
  DOM.inputBody.addEventListener("input", () => {
    updateBodyCount(DOM.inputBody.value);
  });

  // Form Submission
  DOM.emailForm.addEventListener("submit", handleScanSubmit);

  // Clear Button
  DOM.btnClear.addEventListener("click", resetScanner);

  // Random Sample
  DOM.btnRandomSample.addEventListener("click", loadRandomSample);
}

function updateSenderDomain(senderVal) {
  const match = senderVal.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (match && match[1]) {
    DOM.parsedDomainTag.textContent = match[1];
    DOM.parsedDomainTag.classList.add("has-domain");
  } else {
    DOM.parsedDomainTag.textContent = "No domain detected";
    DOM.parsedDomainTag.classList.remove("has-domain");
  }
}

function updateBodyCount(text) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  DOM.bodyCharCount.textContent = `${words} words • ${chars} chars`;
}

function resetScanner() {
  DOM.emailForm.reset();
  updateSenderDomain("");
  DOM.subjectCharCount.textContent = "0 chars";
  DOM.bodyCharCount.textContent = "0 words • 0 chars";
  DOM.resultsActive.classList.add("hidden");
  DOM.resultsEmpty.style.display = "flex";
  DOM.liveScanTag.textContent = "Ready";
  state.activeScanResult = null;
}

/* ==========================================================================
   Inspector View Mode
   ========================================================================== */
function initInspectorTabs() {
  DOM.btnInspHighlight.addEventListener("click", () => {
    state.inspectorMode = "highlight";
    DOM.btnInspHighlight.classList.add("active");
    DOM.btnInspRaw.classList.remove("active");
    renderInspectorContent();
  });

  DOM.btnInspRaw.addEventListener("click", () => {
    state.inspectorMode = "raw";
    DOM.btnInspRaw.classList.add("active");
    DOM.btnInspHighlight.classList.remove("active");
    renderInspectorContent();
  });
}

/* ==========================================================================
   Backend Health Check
   ========================================================================== */
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      const data = await res.json();
      DOM.statusDot.style.background = "var(--color-safe)";
      DOM.statusDot.style.boxShadow = "0 0 10px var(--color-safe)";
      const modelCount = data.models_loaded ? data.models_loaded.length : 4;
      DOM.statusText.textContent = `Online • ${modelCount} Models`;
    } else {
      throw new Error("Health check non-200");
    }
  } catch (err) {
    console.warn("Backend offline or error:", err);
    DOM.statusDot.style.background = "var(--color-warning)";
    DOM.statusDot.style.boxShadow = "0 0 10px var(--color-warning)";
    DOM.statusText.textContent = "Degraded (Offline)";
  }
}

/* ==========================================================================
   Samples Loader
   ========================================================================== */
async function fetchSamples() {
  try {
    const res = await fetch(`${API_BASE}/api/samples`);
    if (!res.ok) return;
    const data = await res.json();
    state.samples = data.samples || [];
    renderSampleChips(state.samples);
  } catch (err) {
    console.error("Failed to load sample emails:", err);
  }
}

function renderSampleChips(samples) {
  DOM.samplesContainer.innerHTML = "";
  samples.forEach((sample) => {
    const chip = document.createElement("button");
    chip.type = "button";
    const isPhish = sample.expected_label === "phishing";
    chip.className = `sample-chip ${isPhish ? "chip-phish" : "chip-legit"}`;

    chip.innerHTML = `
      <span class="chip-tag ${isPhish ? "phish" : "legit"}">${isPhish ? "Phish" : "Legit"}</span>
      <span class="chip-title">${escapeHtml(sample.title)}</span>
    `;

    chip.addEventListener("click", () => loadSample(sample));
    DOM.samplesContainer.appendChild(chip);
  });
}

function loadSample(sample) {
  DOM.inputSender.value = sample.sender;
  DOM.inputSubject.value = sample.subject;
  DOM.inputBody.value = sample.body;

  updateSenderDomain(sample.sender);
  DOM.subjectCharCount.textContent = `${sample.subject.length} chars`;
  updateBodyCount(sample.body);

  // Smooth pulse feedback
  DOM.inputBody.focus();
}

function loadRandomSample() {
  if (!state.samples.length) return;
  const rand = state.samples[Math.floor(Math.random() * state.samples.length)];
  loadSample(rand);
}

/* ==========================================================================
   Scan Submission & Execution
   ========================================================================== */
async function handleScanSubmit(e) {
  e.preventDefault();

  const sender = DOM.inputSender.value.trim();
  const subject = DOM.inputSubject.value.trim();
  const body = DOM.inputBody.value.trim();
  const model = DOM.modelSelect.value;

  if (!sender || !subject || !body) {
    alert("Please complete the Sender, Subject, and Body fields before scanning.");
    return;
  }

  // Set loading state
  DOM.btnAnalyze.classList.add("loading");
  DOM.btnScanText.textContent = "Analyzing Threat Vector…";
  DOM.liveScanTag.textContent = "Scanning…";

  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender,
        subject,
        body,
        model_name: model,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    state.activeScanResult = data;
    state.rawEmailText = `${subject}\n\n${body}`;

    renderResults(data);
  } catch (err) {
    console.error("Scan error:", err);
    alert("Failed to analyze email. Ensure the backend server is running.");
  } finally {
    DOM.btnAnalyze.classList.remove("loading");
    DOM.btnScanText.textContent = "Analyze Email Threat";
    DOM.liveScanTag.textContent = "Analysis Complete";
  }
}

/* ==========================================================================
   Render Threat Results
   ========================================================================== */
function renderResults(data) {
  DOM.resultsEmpty.style.display = "none";
  DOM.resultsActive.classList.remove("hidden");

  // 1. Verdict Banner Theme & Content
  DOM.verdictBanner.classList.remove("danger", "warning", "safe");
  if (data.is_phishing) {
    DOM.verdictBanner.classList.add(data.risk_score >= 75 ? "danger" : "warning");
    DOM.threatBadge.textContent = data.risk_level.toUpperCase();
    DOM.threatHeadline.textContent = "Phishing Attack Detected";
  } else {
    DOM.verdictBanner.classList.add("safe");
    DOM.threatBadge.textContent = "LEGITIMATE / SAFE";
    DOM.threatHeadline.textContent = "Clean Email Verified";
  }

  DOM.confidencePill.textContent = `${data.confidence_percent}% Confidence`;
  DOM.threatRecommendation.textContent = data.recommendation;

  // 2. Animate Circular Threat Gauge
  const score = Math.min(100, Math.max(0, data.risk_score));
  animateGauge(score, data.is_phishing);

  // 3. Multi-Model Consensus Breakdown
  renderModelConsensus(data);

  // 4. Heuristic Signals
  renderSignals(data.signals || []);

  // 5. Explainability Text Inspector
  renderInspectorContent();
}

function animateGauge(targetScore, isPhishing) {
  const circumference = 314.15; // 2 * PI * 50
  const offset = circumference - (targetScore / 100) * circumference;

  DOM.gaugeFill.style.strokeDashoffset = offset;
  if (isPhishing) {
    DOM.gaugeFill.style.stroke = targetScore >= 75 ? "var(--color-danger)" : "var(--color-warning)";
  } else {
    DOM.gaugeFill.style.stroke = "var(--color-safe)";
  }

  // Count up numeric value smoothly
  let current = 0;
  const duration = 800;
  const startTime = performance.now();

  function updateCount(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quart
    const ease = 1 - Math.pow(1 - progress, 4);
    const val = Math.round(targetScore * ease);
    DOM.gaugeScoreValue.textContent = val;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      DOM.gaugeScoreValue.textContent = targetScore;
    }
  }

  requestAnimationFrame(updateCount);
}

function renderModelConsensus(data) {
  const allModels = data.all_models || {};
  const consensus = data.consensus || { phish_votes: 0, total_models: 4 };

  DOM.consensusTag.textContent = `${consensus.phish_votes} of ${consensus.total_models} Models Flagged Phishing`;

  DOM.modelBarsGrid.innerHTML = "";
  Object.keys(allModels).forEach((modelName) => {
    const m = allModels[modelName];
    const isPhish = m.is_phishing;
    const prob = Math.round(m.phishing_probability * 100);

    const tile = document.createElement("div");
    tile.className = "model-stat-tile";

    tile.innerHTML = `
      <div class="model-tile-top">
        <span class="model-tile-name">${escapeHtml(modelName)}</span>
        <span class="model-tile-verdict ${isPhish ? "phish" : "legit"}">${isPhish ? "Phishing" : "Clean"}</span>
      </div>
      <div class="model-bar-wrap">
        <div class="model-bar-fill" style="width: ${prob}%; background: ${
          isPhish ? "var(--color-danger)" : "var(--color-safe)"
        };"></div>
      </div>
      <div class="model-tile-bottom">
        <span>Risk: ${prob}%</span>
        <span>Confidence: ${m.confidence_percent}%</span>
      </div>
    `;

    DOM.modelBarsGrid.appendChild(tile);
  });
}

function renderSignals(signals) {
  DOM.signalsGrid.innerHTML = "";
  signals.forEach((sig) => {
    const card = document.createElement("div");
    card.className = "signal-card";

    let statusPillClass = "safe";
    if (sig.status === "danger") statusPillClass = "danger";
    else if (sig.status === "warning") statusPillClass = "warning";

    card.innerHTML = `
      <div class="signal-card-top">
        <span class="signal-card-title">${escapeHtml(sig.name)}</span>
        <span class="signal-status-pill ${statusPillClass}">${escapeHtml(sig.status)}</span>
      </div>
      <div class="signal-card-value">${escapeHtml(sig.value)}</div>
      <div class="signal-card-detail">${escapeHtml(sig.detail)}</div>
    `;

    DOM.signalsGrid.appendChild(card);
  });
}

function renderInspectorContent() {
  if (!state.activeScanResult) return;

  if (state.inspectorMode === "raw") {
    DOM.inspectorContent.textContent = state.rawEmailText;
    return;
  }

  // Highlighted Mode
  const tokens = state.activeScanResult.suspicious_tokens || [];
  let text = escapeHtml(state.rawEmailText);

  // Highlight suspicious words
  tokens.forEach((token) => {
    if (!token || token.length < 2) return;
    const regex = new RegExp(`\\b(${escapeRegex(token)})\\b`, "gi");
    text = text.replace(regex, `<mark class="highlight-threat">$1</mark>`);
  });

  // Highlight URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s]*)/gi;
  text = text.replace(urlRegex, `<mark class="highlight-url">$1</mark>`);

  DOM.inspectorContent.innerHTML = text;
}

/* ==========================================================================
   Benchmarks Tab Loader & Leaderboard
   ========================================================================== */
async function fetchBenchmarks() {
  try {
    const res = await fetch(`${API_BASE}/api/models`);
    if (!res.ok) return;
    const data = await res.json();
    state.benchmarkData = data;
    renderBenchmarks(data);
  } catch (err) {
    console.error("Failed to fetch model benchmarks:", err);
  }
}

function renderBenchmarks(data) {
  // Top Hero Stat Cards
  if (data.total_emails && DOM.bmTotalEmails) {
    DOM.bmTotalEmails.textContent = data.total_emails.toLocaleString();
  }
  if (data.feature_count && DOM.bmFeatureCount) {
    DOM.bmFeatureCount.textContent = data.feature_count.toLocaleString();
  }
  if (data.test_size && DOM.bmTestSize) {
    DOM.bmTestSize.textContent = data.test_size.toLocaleString();
  }

  // 1. Leaderboard Table
  const models = data.models || {};
  const modelList = Object.keys(models).map((name) => ({
    name,
    ...models[name],
  }));

  // Sort descending by F1-Score
  modelList.sort((a, b) => b.f1_score - a.f1_score);

  const ranks = ["🥇", "🥈", "🥉", "4️⃣"];
  DOM.leaderboardBody.innerHTML = "";

  modelList.forEach((m, idx) => {
    const tr = document.createElement("tr");
    const accPct = (m.accuracy * 100).toFixed(2);
    const precPct = (m.precision * 100).toFixed(2);
    const recPct = (m.recall * 100).toFixed(2);
    const f1Pct = (m.f1_score * 100).toFixed(2);
    const isTop = idx === 0;

    tr.innerHTML = `
      <td>
        <div class="table-model-name">
          <span class="rank-badge">${ranks[idx] || "#"}</span>
          <span>${escapeHtml(m.name)}</span>
        </div>
      </td>
      <td><span class="metric-pill ${isTop ? "top" : "normal"}">${accPct}%</span></td>
      <td>${precPct}%</td>
      <td>${recPct}%</td>
      <td><strong>${f1Pct}%</strong></td>
      <td>${(m.tp || 0).toLocaleString()}</td>
      <td>${(m.tn || 0).toLocaleString()}</td>
      <td>${(m.fp || 0).toLocaleString()}</td>
      <td>${(m.fn || 0).toLocaleString()}</td>
    `;

    DOM.leaderboardBody.appendChild(tr);
  });

  // 2. Confusion Matrices Grid
  renderConfusionMatrices(modelList);

  // 3. Top 20 Feature Importance
  renderFeatureImportance(data.feature_importance || []);
}

function renderConfusionMatrices(modelList) {
  DOM.confusionGrid.innerHTML = "";

  modelList.forEach((m) => {
    const card = document.createElement("div");
    card.className = "cm-card";

    const tp = m.tp || 0;
    const tn = m.tn || 0;
    const fp = m.fp || 0;
    const fn = m.fn || 0;

    card.innerHTML = `
      <div class="cm-title">${escapeHtml(m.name)}</div>
      <div class="cm-table-wrap">
        <div class="cm-cell correct">
          <span class="cm-cell-label">True Negative (TN)</span>
          <span class="cm-cell-val">${tn.toLocaleString()}</span>
        </div>
        <div class="cm-cell error">
          <span class="cm-cell-label">False Positive (FP)</span>
          <span class="cm-cell-val">${fp.toLocaleString()}</span>
        </div>
        <div class="cm-cell error">
          <span class="cm-cell-label">False Negative (FN)</span>
          <span class="cm-cell-val">${fn.toLocaleString()}</span>
        </div>
        <div class="cm-cell correct">
          <span class="cm-cell-label">True Positive (TP)</span>
          <span class="cm-cell-val">${tp.toLocaleString()}</span>
        </div>
      </div>
    `;

    DOM.confusionGrid.appendChild(card);
  });
}

function renderFeatureImportance(features) {
  DOM.featureBarsList.innerHTML = "";
  if (!features.length) return;

  const maxVal = Math.max(...features.map((f) => f.importance || 0), 0.01);

  features.slice(0, 20).forEach((item) => {
    const row = document.createElement("div");
    row.className = "feature-row";

    const widthPct = ((item.importance / maxVal) * 100).toFixed(1);
    const weightPct = ((item.importance) * 100).toFixed(2);

    row.innerHTML = `
      <span class="feature-token" title="${escapeHtml(item.feature)}">${escapeHtml(item.feature)}</span>
      <div class="feature-bar-track">
        <div class="feature-bar-progress" style="width: ${widthPct}%;"></div>
      </div>
      <span class="feature-pct">${weightPct}%</span>
    `;

    DOM.featureBarsList.appendChild(row);
  });
}

/* ==========================================================================
   Utilities
   ========================================================================== */
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
