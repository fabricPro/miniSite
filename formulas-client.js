(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    var c = require("./constants");
    module.exports = factory(c.FPD || c);
  } else {
    root.Formulas = factory(root.FPD);
  }
})(typeof self !== "undefined" ? self : this, function (FPD_DEFAULT) {
  function num(v) {
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function tukH(tip, den, kat, tel, fak, fp) {
    fp = fp || FPD_DEFAULT;
    den = num(den);
    tel = num(tel);
    fak = num(fak);
    var k = num(kat) || 1;
    if (den <= 0 || tel <= 0) return 0;
    if (tip === "DENYE") return (tel / (fp.denye_base / den)) * k / fp.g_div * fak * fp.g_mul;
    if (tip === "DTEX")  return (tel / (fp.dtex_base  / den)) * k / fp.g_div * fak * fp.g_mul;
    if (tip === "NM")    return (tel / (den / k))            / fp.g_div * fak * fp.g_mul;
    if (tip === "NE")    return  tel / (fp.ne_factor * den / k) / fp.g_div * fak * fp.g_mul;
    return 0;
  }

  function calcBreakdown(fis, iplikler, fp) {
    fp = fp || FPD_DEFAULT;
    fis = fis || {};
    iplikler = iplikler || {};

    var topI = 0;
    var grmt = 0;

    var cozguArr = iplikler.cozgu || [];
    for (var i = 0; i < cozguArr.length; i++) {
      var c = cozguArr[i];
      var tC = tukH(c.tip, c.denye, c.kat, c.tel, 1, fp);
      var costC = tC * num(c.fiyat) / 1000;
      topI += costC;
      grmt += tC;
    }

    var aSik = num(fis.atkiSik);
    var tarakEn = num(fis.tarakEn);
    var atkiArr = iplikler.atki || [];

    for (var j = 0; j < atkiArr.length; j++) {
      var a = atkiArr[j];
      var den = num(a.denye);
      var kat = num(a.kat) || 1;
      var tel = num(a.tel);

      // tel = total atkı thread count per metre of fabric
      // (e.g. atkıSık 40 tel/cm × 100 cm = 4000 tel/mt for full single-yarn coverage).
      // Each atkı thread length = tarakEn cm = tarakEn/100 m.
      // Total length per mt of fabric (m) = tel × tarakEn / 100.
      var tA = 0;
      if (tel > 0 && tarakEn > 0 && den > 0) {
        var lenM = tel * tarakEn / 100;
        if (a.tip === "DENYE")      tA = lenM * den * kat / fp.denye_base;
        else if (a.tip === "DTEX")  tA = lenM * den * kat / fp.dtex_base;
        else if (a.tip === "NM")    tA = lenM * kat / den;
        else if (a.tip === "NE")    tA = lenM * kat / (fp.ne_factor * den);
      }

      var costA = tA * num(a.fiyat) / 1000;
      topI += costA;
      grmt += tA;
    }

    var binD = aSik < fp.bin_thr ? (fp.bin_thr - aSik) * fp.bin_mul + fp.bin_base : fp.bin_base;
    var devir = num(fis.devir);
    var randiman = num(fis.randiman);
    var uAy = aSik > 0
      ? (devir * fp.dak * fp.saat * fp.ay_gun / fp.rand_div) / aSik * (randiman / fp.rand_div2)
      : 0;

    var fasI = uAy > 0 ? (binD / uAy) * fp.iscilikKdv : 0;

    var terbiyeFiyat = num(fis.terbiyeFiyat);
    var terbM = (grmt / fp.terb_div) * terbiyeFiyat;

    var genelFire = num(fis.genelFire);
    var fireM = (topI + fasI + terbM) * genelFire / fp.fire_div;

    var kursum = num(fis.kursum);
    var ekMal = num(fis.ekMal);

    var total = topI + fasI + terbM + kursum + ekMal + fireM;

    return {
      topI: topI,
      grmt: grmt,
      fasI: fasI,
      terbM: terbM,
      fireM: fireM,
      uAy: uAy,
      total: total,
    };
  }

  return { tukH: tukH, calcBreakdown: calcBreakdown };
});
