(function () {
  "use strict";

  var STORAGE_KEY = "armur.mobile.records";
  var TOTAL_STEPS = 5;
  var STEP_TITLES = {
    1: "Kumaş ölçüleri",
    2: "Çözgü iplikleri",
    3: "Atkı iplikleri",
    4: "Üretim & finisaj",
    5: "Sonuç",
  };

  var moneyFmt = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function fmtMoney(n) {
    if (!Number.isFinite(n)) n = 0;
    return "$" + moneyFmt.format(n);
  }
  function fmtNum(n) {
    if (!Number.isFinite(n)) n = 0;
    return moneyFmt.format(n);
  }

  // ───────── State ─────────
  var state = {
    page: "converter",
    step: 1,
    currentRecordId: null,
    currentRecordName: "",
    fis: {
      tarakEn: "",
      cozguSik: "",
      atkiSik: "",
      devir: "360",
      randiman: "85",
      terbiyeFiyat: "0",
      genelFire: "2",
      kursum: "0",
      ekMal: "0",
      kar: "0",
    },
    iplikler: {
      cozgu: [makeYarn()],
      atki: [makeYarn()],
    },
  };

  function makeYarn() {
    return {
      id: "y_" + Math.random().toString(36).slice(2, 9),
      tip: "DENYE",
      denye: "",
      kat: "1",
      tel: "",
      fiyat: "",
    };
  }

  function emptyState() {
    return {
      step: 1,
      currentRecordId: null,
      currentRecordName: "",
      fis: {
        tarakEn: "",
        cozguSik: "",
        atkiSik: "",
        devir: "360",
        randiman: "85",
        terbiyeFiyat: "0",
        genelFire: "2",
        kursum: "0",
        ekMal: "0",
        kar: "0",
      },
      iplikler: { cozgu: [makeYarn()], atki: [makeYarn()] },
    };
  }

  // ───────── DOM helpers ─────────
  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // ───────── Validation ─────────
  function isPos(v) {
    var n = parseFloat(v);
    return Number.isFinite(n) && n > 0;
  }
  function isNonNeg(v) {
    var n = parseFloat(v);
    return Number.isFinite(n) && n >= 0;
  }

  function yarnValid(y) {
    return isPos(y.denye) && isNonNeg(y.kat) && parseFloat(y.kat) >= 1 && isPos(y.tel) && isPos(y.fiyat);
  }

  function stepValid(step) {
    if (step === 1) {
      return isPos(state.fis.tarakEn) && isPos(state.fis.cozguSik) && isPos(state.fis.atkiSik);
    }
    if (step === 2) {
      return state.iplikler.cozgu.length > 0 && state.iplikler.cozgu.every(yarnValid);
    }
    if (step === 3) {
      return state.iplikler.atki.length > 0 && state.iplikler.atki.every(yarnValid);
    }
    if (step === 4) {
      var f = state.fis;
      return isPos(f.devir) && isNonNeg(f.randiman) && isNonNeg(f.terbiyeFiyat) &&
             isNonNeg(f.genelFire) && isNonNeg(f.kursum) && isNonNeg(f.ekMal) && isNonNeg(f.kar);
    }
    if (step === 5) return true;
    return false;
  }

  // ───────── Page navigation ─────────
  function goPage(name) {
    state.page = name;
    $("pageConverter").hidden = name !== "converter";
    $("pageMaliyet").hidden  = name !== "maliyet";
    $("wizardSub").hidden    = name !== "maliyet";
    $("openRecords").hidden  = name !== "maliyet";
    $$(".page-tab").forEach(function (b) {
      var on = b.dataset.page === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    if (name === "maliyet") {
      goStep(state.step);
    } else {
      $("bottomNav").hidden = true;
    }
    window.scrollTo(0, 0);
  }

  // ───────── Step navigation ─────────
  function goStep(n) {
    if (n < 1) n = 1;
    if (n > TOTAL_STEPS) n = TOTAL_STEPS;
    state.step = n;
    $$("#pageMaliyet section.step").forEach(function (sec) {
      sec.hidden = parseInt(sec.dataset.step, 10) !== n;
    });
    $("stepChip").textContent = n + "/" + TOTAL_STEPS;
    $("stepTitle").textContent = STEP_TITLES[n];
    $("progressBar").style.width = (n / TOTAL_STEPS) * 100 + "%";

    $("bottomNav").hidden = state.page !== "maliyet" || n === TOTAL_STEPS;

    $("prevBtn").disabled = n === 1;
    refreshNext();

    if (n === 5) renderResult();
    window.scrollTo(0, 0);
  }

  function refreshNext() {
    $("nextBtn").disabled = !stepValid(state.step);
  }

  // ───────── Step 1 (fis basic) ─────────
  function bindFisInput(id, key, validatorMsg) {
    var input = $(id);
    var errEl = document.querySelector('[data-err="' + id + '"]');
    input.value = state.fis[key];

    input.addEventListener("input", function () {
      state.fis[key] = input.value;
      if (input.classList.contains("has-error")) {
        input.classList.remove("has-error");
        if (errEl) errEl.textContent = "";
      }
      refreshNext();
    });
    input.addEventListener("blur", function () {
      if (validatorMsg) {
        var ok = validatorMsg.fn(input.value);
        if (!ok) {
          input.classList.add("has-error");
          if (errEl) errEl.textContent = validatorMsg.msg;
        } else {
          input.classList.remove("has-error");
          if (errEl) errEl.textContent = "";
        }
      }
    });
  }

  // ───────── Yarn cards rendering ─────────
  function renderYarnCard(yarn, index, kind) {
    var card = document.createElement("div");
    card.className = "yarn-card";
    card.dataset.id = yarn.id;
    var label = (kind === "cozgu" ? "Çözgü" : "Atkı") + " #" + (index + 1);

    card.innerHTML =
      '<div class="yarn-head">' +
      '  <span class="badge" data-badge>!</span>' +
      '  <span class="yarn-title">' + label + "</span>" +
      '  <button type="button" class="yarn-del" aria-label="Sil">🗑</button>' +
      "</div>" +
      '<div class="segmented" role="tablist">' +
      '  <button type="button" data-tip="DENYE">DENYE</button>' +
      '  <button type="button" data-tip="DTEX">DTEX</button>' +
      '  <button type="button" data-tip="NM">NM</button>' +
      '  <button type="button" data-tip="NE">NE</button>' +
      "</div>" +
      '<div class="grid-2">' +
      '  <label class="field"><div class="label-row"><span>Denye</span></div><input data-k="denye" type="number" inputmode="decimal" step="0.1" min="0" /></label>' +
      '  <label class="field"><div class="label-row"><span>Kat</span></div><input data-k="kat" type="number" inputmode="decimal" step="1" min="1" /></label>' +
      '  <label class="field"><div class="label-row"><span>Tel</span></div><input data-k="tel" type="number" inputmode="decimal" step="1" min="0" /></label>' +
      '  <label class="field"><div class="label-row"><span>Fiyat $/kg</span></div><input data-k="fiyat" type="number" inputmode="decimal" step="0.01" min="0" /></label>' +
      "</div>" +
      '<div class="preview" data-preview>Gramaj: <strong>—</strong> g/mt · Tutar: <strong>—</strong> /mt</div>';

    // segmented
    var segBtns = $$(".segmented button", card);
    segBtns.forEach(function (b) {
      if (b.dataset.tip === yarn.tip) b.classList.add("active");
      b.addEventListener("click", function () {
        yarn.tip = b.dataset.tip;
        segBtns.forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        updateYarnState(card, yarn, kind);
      });
    });

    // inputs
    $$("input[data-k]", card).forEach(function (inp) {
      var key = inp.dataset.k;
      inp.value = yarn[key];
      inp.addEventListener("input", function () {
        yarn[key] = inp.value;
        updateYarnState(card, yarn, kind);
      });
      inp.addEventListener("blur", function () {
        if (key === "kat") {
          if (!isNonNeg(inp.value) || parseFloat(inp.value) < 1) inp.classList.add("has-error");
          else inp.classList.remove("has-error");
        } else {
          if (!isPos(inp.value)) inp.classList.add("has-error");
          else inp.classList.remove("has-error");
        }
      });
    });

    // delete
    var del = card.querySelector(".yarn-del");
    del.addEventListener("click", function () {
      var arr = state.iplikler[kind];
      if (arr.length <= 1) {
        toast("En az 1 iplik kalmalı");
        return;
      }
      state.iplikler[kind] = arr.filter(function (y) { return y.id !== yarn.id; });
      renderYarnList(kind);
      refreshNext();
    });

    updateYarnState(card, yarn, kind);
    return card;
  }

  function updateYarnState(card, yarn, kind) {
    var ok = yarnValid(yarn);
    card.classList.toggle("valid", ok);
    card.classList.toggle("invalid", !ok);
    var badge = card.querySelector("[data-badge]");
    badge.textContent = ok ? "✓" : "!";

    var pre = card.querySelector("[data-preview]");
    if (ok) {
      var fak = kind === "cozgu" ? 1 : (parseFloat(state.fis.atkiSik) || 0) / 100;
      var t = window.Formulas.tukH(yarn.tip, yarn.denye, yarn.kat, yarn.tel, fak, window.FPD);
      if (kind === "atki") {
        var en = parseFloat(state.fis.tarakEn);
        if (en > 0) t = t * (en / 100);
      }
      var tutar = (t * (parseFloat(yarn.fiyat) || 0)) / 1000;
      pre.innerHTML = "Gramaj: <strong>" + fmtNum(t) + "</strong> g/mt · Tutar: <strong>$" + fmtNum(tutar) + "</strong> /mt";
    } else {
      pre.innerHTML = "Gramaj: <strong>—</strong> g/mt · Tutar: <strong>—</strong> /mt";
    }
    refreshNext();
  }

  function renderYarnList(kind) {
    var wrap = $(kind === "cozgu" ? "cozguList" : "atkiList");
    wrap.innerHTML = "";
    state.iplikler[kind].forEach(function (y, i) {
      wrap.appendChild(renderYarnCard(y, i, kind));
    });
  }

  // ───────── Result ─────────
  function renderResult() {
    var br = window.Formulas.calcBreakdown(state.fis, state.iplikler, window.FPD);
    $("heroTotal").textContent = fmtMoney(br.total) + " /mt";
    $("heroName").textContent = state.currentRecordName ? "» " + state.currentRecordName : "";

    $("brIplik").textContent = fmtMoney(br.topI);
    $("brIscilik").textContent = fmtMoney(br.fasI);
    $("brTerbiye").textContent = fmtMoney(br.terbM);
    $("brFire").textContent = fmtMoney(br.fireM);
    var ek = (parseFloat(state.fis.kursum) || 0) + (parseFloat(state.fis.ekMal) || 0) + (parseFloat(state.fis.kar) || 0);
    $("brEk").textContent = fmtMoney(ek);
    $("brGrmt").textContent = fmtNum(br.grmt) + " g/mt";
    $("brUAy").textContent = fmtNum(br.uAy) + " mt/ay";
    $("brTotal").textContent = fmtMoney(br.total) + " /mt";
  }

  // ───────── Records (localStorage) ─────────
  function loadRecords() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveRecords(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function saveCurrent() {
    var defaultName = state.currentRecordName || "Hesap " + new Date().toLocaleDateString("tr-TR");
    var name = window.prompt("Kayıt adı:", defaultName);
    if (name === null) return;
    name = name.trim();
    if (!name) return;

    var br = window.Formulas.calcBreakdown(state.fis, state.iplikler, window.FPD);
    var list = loadRecords();
    var now = Date.now();
    var rec = {
      id: state.currentRecordId || ("r_" + now.toString(36) + Math.random().toString(36).slice(2, 5)),
      name: name,
      fis: JSON.parse(JSON.stringify(state.fis)),
      iplikler: JSON.parse(JSON.stringify(state.iplikler)),
      total: br.total,
      createdAt: now,
      updatedAt: now,
    };
    var idx = list.findIndex(function (r) { return r.id === rec.id; });
    if (idx >= 0) {
      rec.createdAt = list[idx].createdAt || now;
      list[idx] = rec;
    } else {
      list.unshift(rec);
    }
    saveRecords(list);
    state.currentRecordId = rec.id;
    state.currentRecordName = rec.name;
    $("heroName").textContent = "» " + rec.name;
    toast("Kaydedildi ✓");
  }

  function loadIntoState(rec) {
    state.fis = Object.assign({}, emptyState().fis, rec.fis || {});
    state.iplikler = {
      cozgu: (rec.iplikler && rec.iplikler.cozgu && rec.iplikler.cozgu.length) ? JSON.parse(JSON.stringify(rec.iplikler.cozgu)) : [makeYarn()],
      atki:  (rec.iplikler && rec.iplikler.atki  && rec.iplikler.atki.length)  ? JSON.parse(JSON.stringify(rec.iplikler.atki))  : [makeYarn()],
    };
    state.iplikler.cozgu.forEach(function (y) { if (!y.id) y.id = makeYarn().id; });
    state.iplikler.atki.forEach(function (y) { if (!y.id) y.id = makeYarn().id; });
    state.currentRecordId = rec.id;
    state.currentRecordName = rec.name;

    syncInputsFromState();
    renderYarnList("cozgu");
    renderYarnList("atki");
    goPage("maliyet");
    goStep(5);
  }

  function syncInputsFromState() {
    Object.keys(state.fis).forEach(function (k) {
      var el = $(k);
      if (el) el.value = state.fis[k];
    });
  }

  function deleteRecord(id) {
    var list = loadRecords().filter(function (r) { return r.id !== id; });
    saveRecords(list);
    renderRecords();
    if (state.currentRecordId === id) {
      state.currentRecordId = null;
      state.currentRecordName = "";
      if (state.step === 5) $("heroName").textContent = "";
    }
  }

  function renderRecords() {
    var list = loadRecords().slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    var wrap = $("recordsList");
    wrap.innerHTML = "";
    if (list.length === 0) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "Henüz kayıt yok";
      wrap.appendChild(e);
      return;
    }
    list.forEach(function (rec) {
      var item = document.createElement("div");
      item.className = "record-item";
      var dt = new Date(rec.updatedAt || rec.createdAt || Date.now()).toLocaleString("tr-TR");
      item.innerHTML =
        '<div class="record-info">' +
        '  <div class="record-name"></div>' +
        '  <div class="record-meta"><span class="date"></span><span class="price"></span></div>' +
        "</div>" +
        '<button type="button" class="record-del" aria-label="Sil">🗑</button>';
      item.querySelector(".record-name").textContent = rec.name;
      item.querySelector(".date").textContent = dt;
      item.querySelector(".price").textContent = fmtMoney(rec.total || 0) + " /mt";

      item.addEventListener("click", function (ev) {
        if (ev.target.closest(".record-del")) return;
        closeSheet();
        loadIntoState(rec);
      });
      item.querySelector(".record-del").addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (window.confirm('"' + rec.name + '" silinsin mi?')) deleteRecord(rec.id);
      });
      wrap.appendChild(item);
    });
  }

  function openSheet() {
    renderRecords();
    $("recordsSheet").hidden = false;
    $("sheetMask").hidden = false;
  }
  function closeSheet() {
    $("recordsSheet").hidden = true;
    $("sheetMask").hidden = true;
  }

  // ───────── Toast ─────────
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
  }

  // ───────── Tooltip ─────────
  var tipPop = null;
  function bindTooltips() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".info");
      if (btn) {
        e.preventDefault();
        showTip(btn);
        return;
      }
      hideTip();
    }, true);
  }
  function showTip(btn) {
    hideTip();
    var pop = $("tipPop");
    pop.textContent = btn.dataset.tip || "";
    pop.hidden = false;
    var rect = btn.getBoundingClientRect();
    var top = rect.bottom + 6;
    var left = Math.min(window.innerWidth - 270, Math.max(8, rect.left - 100));
    pop.style.top = top + "px";
    pop.style.left = left + "px";
    tipPop = pop;
  }
  function hideTip() {
    if (tipPop) { tipPop.hidden = true; tipPop = null; }
  }

  // ───────── Converter (yarn count) ─────────
  var NE_K = 590.54;

  function convFmt(n) {
    if (!Number.isFinite(n) || n <= 0) return "";
    var rounded = Math.round(n * 1000) / 1000;
    return String(rounded);
  }

  function texToCounts(tex) {
    return {
      ne: NE_K / tex,
      nm: 1000 / tex,
      den: tex * 9,
      dtex: tex * 10,
    };
  }

  function texFromCount(id, v) {
    if (id === "convNe")   return NE_K / v;
    if (id === "convNm")   return 1000 / v;
    if (id === "convDen")  return v / 9;
    if (id === "convDtex") return v / 10;
    return null;
  }

  function convReadPos(elInput) {
    var v = parseFloat(elInput.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function convWriteCounts(counts, skipId) {
    var map = { convNe: "ne", convNm: "nm", convDen: "den", convDtex: "dtex" };
    Object.keys(map).forEach(function (k) {
      if (k === skipId) return;
      $(k).value = convFmt(counts[map[k]]);
    });
  }

  function convClearCounts(skipId) {
    ["convNe", "convNm", "convDen", "convDtex"].forEach(function (k) {
      if (k === skipId) return;
      $(k).value = "";
    });
  }

  function convRecomputeFromSample() {
    var w = convReadPos($("convWeight"));
    var l = convReadPos($("convLength"));
    if (w === null || l === null) {
      convClearCounts(null);
      return;
    }
    var tex = (w * 100000) / l;
    convWriteCounts(texToCounts(tex), null);
  }

  function convRecomputeFromCount(sourceId) {
    var v = convReadPos($(sourceId));
    if (v === null) { convClearCounts(sourceId); return; }
    var tex = texFromCount(sourceId, v);
    if (!Number.isFinite(tex) || tex <= 0) { convClearCounts(sourceId); return; }
    convWriteCounts(texToCounts(tex), sourceId);
  }

  function bindConverter() {
    ["convWeight", "convLength"].forEach(function (id) {
      $(id).addEventListener("input", convRecomputeFromSample);
    });
    ["convNe", "convNm", "convDen", "convDtex"].forEach(function (id) {
      $(id).addEventListener("input", function () { convRecomputeFromCount(id); });
    });
    $("convClear").addEventListener("click", function () {
      ["convWeight", "convLength", "convNe", "convNm", "convDen", "convDtex"].forEach(function (id) {
        $(id).value = "";
      });
      $("convWeight").focus();
    });
  }

  // ───────── Boot ─────────
  function init() {
    // Page tabs
    $$(".page-tab").forEach(function (b) {
      b.addEventListener("click", function () { goPage(b.dataset.page); });
    });

    bindConverter();

    // Step 1 fields
    bindFisInput("tarakEn", "tarakEn", { fn: isPos, msg: "Pozitif sayı girin" });
    bindFisInput("cozguSik", "cozguSik", { fn: isPos, msg: "Pozitif sayı girin" });
    bindFisInput("atkiSik", "atkiSik", { fn: isPos, msg: "Pozitif sayı girin" });

    // Step 4 fields
    bindFisInput("devir", "devir", { fn: isPos, msg: "Pozitif sayı girin" });
    bindFisInput("randiman", "randiman", { fn: isNonNeg, msg: "0 veya üzeri" });
    bindFisInput("terbiyeFiyat", "terbiyeFiyat", { fn: isNonNeg, msg: "0 veya üzeri" });
    bindFisInput("genelFire", "genelFire", { fn: isNonNeg, msg: "0 veya üzeri" });
    bindFisInput("kursum", "kursum", { fn: isNonNeg, msg: "0 veya üzeri" });
    bindFisInput("ekMal", "ekMal", { fn: isNonNeg, msg: "0 veya üzeri" });
    bindFisInput("kar", "kar", { fn: isNonNeg, msg: "0 veya üzeri" });

    // Yarn lists
    renderYarnList("cozgu");
    renderYarnList("atki");

    $("addCozgu").addEventListener("click", function () {
      state.iplikler.cozgu.push(makeYarn());
      renderYarnList("cozgu");
      refreshNext();
    });
    $("addAtki").addEventListener("click", function () {
      state.iplikler.atki.push(makeYarn());
      renderYarnList("atki");
      refreshNext();
    });

    // Nav
    $("prevBtn").addEventListener("click", function () { goStep(state.step - 1); });
    $("nextBtn").addEventListener("click", function () {
      if (!stepValid(state.step)) return;
      goStep(state.step + 1);
    });

    // Result actions
    $("newCalc").addEventListener("click", function () {
      if (!window.confirm("Yeni hesaba başlamak için mevcut girişler temizlensin mi?")) return;
      Object.assign(state, emptyState());
      syncInputsFromState();
      renderYarnList("cozgu");
      renderYarnList("atki");
      goStep(1);
    });
    $("saveCalc").addEventListener("click", saveCurrent);
    $("openRecords").addEventListener("click", openSheet);
    $("openRecords2").addEventListener("click", openSheet);
    $("closeSheet").addEventListener("click", closeSheet);
    $("sheetMask").addEventListener("click", closeSheet);

    bindTooltips();
    goStep(1);
    goPage("converter");
  }

  // SW register
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./mobile-sw.js").catch(function () {});
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
