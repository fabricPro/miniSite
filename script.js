(() => {
  const NE_CONSTANT = 590.54;

  const el = {
    weight: document.getElementById("weight"),
    length: document.getElementById("length"),
    ne: document.getElementById("ne"),
    nm: document.getElementById("nm"),
    den: document.getElementById("den"),
    dtex: document.getElementById("dtex"),
    clear: document.getElementById("clearBtn"),
  };

  const countInputs = [el.ne, el.nm, el.den, el.dtex];
  const sampleInputs = [el.weight, el.length];
  const allInputs = [...sampleInputs, ...countInputs];

  const parse = (input) => {
    const v = parseFloat(input.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const format = (n) => {
    if (!Number.isFinite(n) || n <= 0) return "";
    const rounded = Math.round(n * 1000) / 1000;
    return String(rounded);
  };

  const texToCounts = (tex) => ({
    ne: NE_CONSTANT / tex,
    nm: 1000 / tex,
    den: tex * 9,
    dtex: tex * 10,
  });

  const texFromCount = (id, v) => {
    switch (id) {
      case "ne":   return NE_CONSTANT / v;
      case "nm":   return 1000 / v;
      case "den":  return v / 9;
      case "dtex": return v / 10;
    }
    return null;
  };

  const writeCounts = (counts, skipId) => {
    const map = { ne: el.ne, nm: el.nm, den: el.den, dtex: el.dtex };
    for (const key of Object.keys(map)) {
      if (key === skipId) continue;
      map[key].value = format(counts[key]);
    }
  };

  const clearCounts = (skipId) => {
    for (const input of countInputs) {
      if (input.id === skipId) continue;
      input.value = "";
    }
  };

  const recomputeFromSample = () => {
    const w = parse(el.weight);
    const l = parse(el.length);
    if (w === null || l === null) {
      clearCounts(null);
      return;
    }
    const tex = (w * 100000) / l;
    writeCounts(texToCounts(tex), null);
  };

  const recomputeFromCount = (sourceId) => {
    const source = document.getElementById(sourceId);
    const v = parse(source);
    if (v === null) {
      clearCounts(sourceId);
      return;
    }
    const tex = texFromCount(sourceId, v);
    if (!Number.isFinite(tex) || tex <= 0) {
      clearCounts(sourceId);
      return;
    }
    writeCounts(texToCounts(tex), sourceId);
  };

  sampleInputs.forEach((input) => {
    input.addEventListener("input", recomputeFromSample);
  });

  countInputs.forEach((input) => {
    input.addEventListener("input", () => recomputeFromCount(input.id));
  });

  el.clear.addEventListener("click", () => {
    allInputs.forEach((i) => (i.value = ""));
    el.weight.focus();
  });
})();
