(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    var api = factory();
    root.FPD = api.FPD;
  }
})(typeof self !== "undefined" ? self : this, function () {
  var FPD = {
    denye_base: 9000,
    dtex_base: 10000,
    ne_factor: 1.69,
    g_div: 1000,
    g_mul: 1000,
    bin_thr: 12,
    bin_thr2: 12,
    bin_mul: 1000,
    bin_base: 8000,
    bin_base2: 8000,
    dak: 60,
    saat: 24,
    ay_gun: 26,
    rand_div: 100,
    rand_div2: 100,
    terb_div: 1000,
    fire_div: 100,
    iscilikKdv: 1.1,
  };
  return { FPD: FPD };
});
