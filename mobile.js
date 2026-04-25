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
      // raw is the user-typed text (e.g. "300", "300*2", "30/2")
      raw: "",
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
      },
      iplikler: { cozgu: [makeYarn()], atki: [makeYarn()] },
    };
  }

  // ───────── Smart yarn-input parser ─────────
  // DENYE/DTEX support "300*2" syntax; NE/NM support "30/2" syntax.
  // Anything else with the wrong operator is invalid.
  function parseYarnInput(raw, tip) {
    if (raw == null) return { valid: false };
    var s = String(raw).replace(/\s+/g, "").replace(",", ".");
    if (!s) return { valid: false };

    var multiTypes = { DENYE: 1, DTEX: 1 };
    var divTypes   = { NE: 1, NM: 1 };

    var m = /^(\d+(?:\.\d+)?)([*/])(\d+(?:\.\d+)?)$/.exec(s);
    if (m) {
      var op = m[2];
      var num = parseFloat(m[1]);
      var k   = parseFloat(m[3]);
      if (!Number.isFinite(num) || num <= 0 || !Number.isFinite(k) || k <= 0) {
        return { valid: false };
      }
      if (op === "*" && multiTypes[tip]) return { valid: true, num: num, kat: k };
      if (op === "/" && divTypes[tip])   return { valid: true, num: num, kat: k };
      return { valid: false, badOp: true };
    }

    if (/^\d+(?:\.\d+)?$/.test(s)) {
      var n = parseFloat(s);
      if (!Number.isFinite(n) || n <= 0) return { valid: false };
      return { valid: true, num: n, kat: 1 };
    }

    return { valid: false };
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

  // Sync raw-text into denye+kat numeric fields (idempotent).
  function syncYarnFromRaw(y) {
    var r = parseYarnInput(y.raw, y.tip);
    if (r.valid) {
      y.denye = r.num;
      y.kat = r.kat;
    } else {
      y.denye = 0;
      y.kat = 1;
    }
    return r;
  }

  // Build a raw string from existing denye+kat (for records saved in old format).
  function yarnRawFromValues(y) {
    var den = parseFloat(y.denye);
    var k = parseFloat(y.kat) || 1;
    if (!Number.isFinite(den) || den <= 0) return "";
    if (k <= 1) return String(den);
    var op = (y.tip === "NE" || y.tip === "NM") ? "/" : "*";
    return den + op + k;
  }

  function yarnValid(y) {
    var r = parseYarnInput(y.raw, y.tip);
    return r.valid && isPos(y.tel) && isPos(y.fiyat);
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
             isNonNeg(f.genelFire) && isNonNeg(f.kursum) && isNonNeg(f.ekMal);
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
      goStep(state.step, { scroll: false });
      window.scrollTo(0, 0);
    } else {
      $("bottomNav").hidden = true;
      window.scrollTo(0, 0);
    }
  }

  // ───────── Step navigation (scroll-based; all steps visible) ─────────
  function goStep(n, opts) {
    opts = opts || {};
    if (n < 1) n = 1;
    if (n > TOTAL_STEPS) n = TOTAL_STEPS;
    state.step = n;
    $("stepChip").textContent = n + "/" + TOTAL_STEPS;
    $("stepTitle").textContent = STEP_TITLES[n];
    $("progressBar").style.width = (n / TOTAL_STEPS) * 100 + "%";

    $("bottomNav").hidden = state.page !== "maliyet";
    $("prevBtn").disabled = n === 1;
    refreshNext();

    renderResult();

    var sec = document.querySelector('#pageMaliyet section.step[data-step="' + n + '"]');
    if (sec) {
      // Expand the target accordion so its content is visible
      if (sec.classList.contains("collapsed")) {
        sec.classList.remove("collapsed");
        var hd = sec.querySelector(".step-heading");
        if (hd) hd.setAttribute("aria-expanded", "true");
      }
      if (opts.scroll !== false) {
        var topbar = document.querySelector(".topbar");
        var off = topbar ? topbar.offsetHeight : 0;
        var rect = sec.getBoundingClientRect();
        var top = window.pageYOffset + rect.top - off - 8;
        window.scrollTo({ top: top, behavior: "smooth" });
      }
    }
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
  function numLabelFor(tip) {
    if (tip === "DENYE") return "Denye";
    if (tip === "DTEX")  return "dtex";
    if (tip === "NE")    return "Ne";
    if (tip === "NM")    return "Nm";
    return "Numara";
  }

  function placeholderFor(tip) {
    if (tip === "DENYE" || tip === "DTEX") return "örn. 300 veya 300*2";
    return "örn. 30 veya 30/2";
  }

  // Backfill `raw` from older saved records that only have denye+kat.
  function ensureRaw(y) {
    if (y.raw && String(y.raw).length) return;
    if (y.denye) y.raw = yarnRawFromValues(y);
  }

  function renderYarnCard(yarn, index, kind) {
    ensureRaw(yarn);
    syncYarnFromRaw(yarn);

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
      '<div class="field-full">' +
      '  <div class="label-row"><span data-num-label>Denye</span></div>' +
      '  <input data-k="raw" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" />' +
      '  <div class="kat-chips" data-kat-chips></div>' +
      "</div>" +
      '<div class="grid-2">' +
      '  <label class="field"><div class="label-row"><span>Tel</span></div><input data-k="tel" type="number" inputmode="decimal" step="1" min="0" /></label>' +
      '  <label class="field"><div class="label-row"><span>Fiyat $/kg</span></div><input data-k="fiyat" type="number" inputmode="decimal" step="0.01" min="0" /></label>' +
      "</div>" +
      '<div class="preview" data-preview></div>';

    var rawInput = card.querySelector('input[data-k="raw"]');
    var numLabelEl = card.querySelector("[data-num-label]");
    rawInput.value = yarn.raw || "";
    numLabelEl.textContent = numLabelFor(yarn.tip);
    rawInput.placeholder = placeholderFor(yarn.tip);

    // segmented (tip switch)
    var segBtns = $$(".segmented button", card);
    segBtns.forEach(function (b) {
      if (b.dataset.tip === yarn.tip) b.classList.add("active");
      b.addEventListener("click", function () {
        yarn.tip = b.dataset.tip;
        segBtns.forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        numLabelEl.textContent = numLabelFor(yarn.tip);
        rawInput.placeholder = placeholderFor(yarn.tip);
        // Migrate existing raw to new operator if it had one
        var prev = parseYarnInput(yarn.raw, yarn.tip === "NE" || yarn.tip === "NM" ? "DENYE" : "NE");
        if (prev.valid && prev.kat > 1) {
          var op2 = (yarn.tip === "NE" || yarn.tip === "NM") ? "/" : "*";
          yarn.raw = prev.num + op2 + prev.kat;
          rawInput.value = yarn.raw;
        }
        renderKatChips();
        updateYarnState(card, yarn, kind);
      });
    });

    // raw input — smart parser
    rawInput.addEventListener("input", function () {
      yarn.raw = rawInput.value;
      renderKatChips();
      updateYarnState(card, yarn, kind);
    });
    rawInput.addEventListener("blur", function () {
      var r = parseYarnInput(yarn.raw, yarn.tip);
      if (yarn.raw && !r.valid) rawInput.classList.add("has-error");
      else rawInput.classList.remove("has-error");
    });

    // tel + fiyat inputs
    $$("input[data-k]", card).forEach(function (inp) {
      var key = inp.dataset.k;
      if (key === "raw") return;
      inp.value = yarn[key];
      inp.addEventListener("input", function () {
        yarn[key] = inp.value;
        updateYarnState(card, yarn, kind);
      });
      inp.addEventListener("blur", function () {
        if (!isPos(inp.value)) inp.classList.add("has-error");
        else inp.classList.remove("has-error");
      });
    });

    // kat chips — quick-insert ×N or /N suffix without typing operator
    var katChipsEl = card.querySelector("[data-kat-chips]");
    function renderKatChips() {
      var op = (yarn.tip === "NE" || yarn.tip === "NM") ? "/" : "*";
      var sym = op === "/" ? "÷" : "×";
      var parsed = parseYarnInput(yarn.raw, yarn.tip);
      var currentKat = parsed.valid ? parsed.kat : 1;
      var values = [1, 2, 3, 4, 5];
      var chips = values.map(function (v) {
        var label = v === 1 ? "Tek" : (sym + v);
        var active = v === currentKat ? " active" : "";
        return '<button type="button" class="kat-chip' + active + '" data-kat="' + v + '">' + label + "</button>";
      }).join("");
      katChipsEl.innerHTML = '<span class="kat-chips-label">Kat:</span>' + chips;
    }
    katChipsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".kat-chip");
      if (!btn) return;
      var k = parseInt(btn.dataset.kat, 10);
      var op = (yarn.tip === "NE" || yarn.tip === "NM") ? "/" : "*";
      // Take base number from current raw (or empty if invalid base)
      var s = String(yarn.raw || "").replace(/\s+/g, "").replace(",", ".");
      var baseMatch = /^(\d+(?:\.\d+)?)(?:[*/]\d+(?:\.\d+)?)?$/.exec(s);
      var base = baseMatch ? baseMatch[1] : "";
      yarn.raw = base ? (k === 1 ? base : base + op + k) : (k === 1 ? "" : op + k);
      rawInput.value = yarn.raw;
      renderKatChips();
      updateYarnState(card, yarn, kind);
    });
    renderKatChips();

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
    var parsed = syncYarnFromRaw(yarn);
    var ok = yarnValid(yarn);
    card.classList.toggle("valid", ok);
    card.classList.toggle("invalid", !ok);
    var badge = card.querySelector("[data-badge]");
    badge.textContent = ok ? "✓" : "!";

    var pre = card.querySelector("[data-preview]");
    if (ok) {
      pre.classList.remove("hint");
      var fak = kind === "cozgu" ? 1 : (parseFloat(state.fis.atkiSik) || 0) / 100;
      var t = window.Formulas.tukH(yarn.tip, yarn.denye, yarn.kat, yarn.tel, fak, window.FPD);
      if (kind === "atki") {
        var en = parseFloat(state.fis.tarakEn);
        if (en > 0) t = t * (en / 100);
      }
      var tutar = (t * (parseFloat(yarn.fiyat) || 0)) / 1000;
      pre.innerHTML =
        "Gramaj: <strong>" + fmtNum(t) + "</strong> g/mt · " +
        "Tutar: <strong>$" + fmtNum(tutar) + "</strong> /mt · " +
        "Kat: <strong>" + (yarn.kat || 1) + "</strong>";
    } else {
      pre.classList.add("hint");
      var hint;
      if (!yarn.raw) hint = numLabelFor(yarn.tip) + " girin (örn. " + (yarn.tip === "NE" || yarn.tip === "NM" ? "30/2" : "300*2") + ")";
      else if (!parsed.valid) hint = parsed.badOp
        ? (yarn.tip === "NE" || yarn.tip === "NM" ? "Ne/Nm için '/' kullanın" : "Denye/dtex için '*' kullanın")
        : "Geçersiz " + numLabelFor(yarn.tip);
      else if (!isPos(yarn.tel)) hint = "Tel girin";
      else if (!isPos(yarn.fiyat)) hint = "Fiyat girin";
      else hint = "Eksik bilgi";
      pre.textContent = hint;
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
    var ek = (parseFloat(state.fis.kursum) || 0) + (parseFloat(state.fis.ekMal) || 0);
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
    var br = window.Formulas.calcBreakdown(state.fis, state.iplikler, window.FPD);
    var list = loadRecords();
    var now = Date.now();
    var name;
    var isUpdate = false;

    if (state.currentRecordId) {
      // Silent update — keep existing id + name
      var idx0 = list.findIndex(function (r) { return r.id === state.currentRecordId; });
      if (idx0 >= 0) {
        name = state.currentRecordName || list[idx0].name;
        isUpdate = true;
      }
    }

    if (!isUpdate) {
      var defaultName = state.currentRecordName || "Hesap " + new Date().toLocaleDateString("tr-TR");
      name = window.prompt("Kayıt adı:", defaultName);
      if (name === null) return;
      name = name.trim();
      if (!name) return;
    }

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
    toast(isUpdate ? "Güncellendi ✓" : "Kaydedildi ✓");
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
  // ───────── Theme manager ─────────
  var THEME_KEY = "armur.mobile.theme"; // "auto" | "light" | "dark"
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; }
  }
  function writeTheme(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) {}
  }
  function applyTheme(mode) {
    var html = document.documentElement;
    if (mode === "auto") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", mode);
    var ic = document.querySelector("[data-theme-icon]");
    if (ic) ic.textContent = mode === "dark" ? "🌙" : (mode === "light" ? "☀️" : "🔆");
  }
  function cycleTheme() {
    var order = ["auto", "light", "dark"];
    var cur = readTheme();
    var next = order[(order.indexOf(cur) + 1) % order.length];
    writeTheme(next);
    applyTheme(next);
  }

  // ───────── Accordion ─────────
  function bindAccordion() {
    $$("#pageMaliyet .step-heading").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var step = btn.closest(".step");
        if (!step) return;
        var open = !step.classList.toggle("collapsed");
        btn.setAttribute("aria-expanded", String(open));
      });
    });
  }

  function init() {
    // Apply persisted theme as early as possible
    applyTheme(readTheme());

    // Page tabs (delegated for robust touch handling)
    $("pageTabs").addEventListener("click", function (e) {
      var tab = e.target.closest(".page-tab");
      if (!tab) return;
      goPage(tab.dataset.page);
    });

    // Theme toggle
    $("themeToggle").addEventListener("click", cycleTheme);

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

    // Yarn lists
    renderYarnList("cozgu");
    renderYarnList("atki");

    // Accordion (after sections exist)
    bindAccordion();

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

    // Live-recompute result on any maliyet input change
    $("pageMaliyet").addEventListener("input", function () { renderResult(); });
    $("pageMaliyet").addEventListener("click", function (e) {
      if (e.target.closest(".segmented button") || e.target.closest(".yarn-del")) {
        setTimeout(renderResult, 0);
      }
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
    goStep(1, { scroll: false });
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
