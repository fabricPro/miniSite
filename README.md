# Armür Maliyet (Mobil PWA)

Tek sayfalık, tamamen tarayıcı tarafında çalışan kumaş maliyet hesaplayıcı.
Bir kumaşın metre başına `$/mt` maliyetini (iplik + işçilik + terbiye + fire +
ek + kâr) 5 adımlı sihirbazla hesaplar. Kayıtlar yalnızca telefonun kendi
tarayıcısında (`localStorage`) tutulur — backend, login, sync yok.

## Dosya yapısı

```
index.html                    5 adımlı wizard kabuğu
mobile.css                    mobil-öncelikli stiller, dark mode
mobile.js                     state, validation, hesap, localStorage
formulas-client.js            hesap motoru (UMD, browser + node)
constants.js                  FPD formül sabitleri (UMD)
mobile-sw.js                  service worker (network-first + cache fallback)
mobile-manifest.webmanifest   PWA manifesti
mobile-icon.svg               SVG ikon
README.md                     bu dosya
```

Tüm yollar göreli (`./...`) — alt dizinde yayınlandığında da çalışır.

## Yerel çalıştırma

Service worker'ın çalışabilmesi için dosyaları bir HTTP sunucusu üzerinden
açmak gerekir (file:// olmaz):

```bash
python3 -m http.server 8000
# sonra: http://localhost:8000
```

Aynı ağdaki telefondan denemek için bilgisayarın yerel IP'sine bağlan
(`http://192.168.x.x:8000`).

## Deploy

### 1) GitHub Pages

1. Yeni public repo oluştur, dosyaları push et.
2. Settings → Pages → **Source**: "Deploy from a branch",
   **Branch**: `main`, **Folder**: `/ (root)` → Save.
3. Birkaç dakika içinde `https://<kullanici>.github.io/<repo>/` adresinde
   yayında olur. "Ana ekrana ekle" mobil Chrome'dan PWA olarak kurulur.

### 2) Netlify

"Add new site" → "Import from Git" → repoyu seç, build komutu yok,
publish dir `/`. Netlify ücretsiz katmanı private repolarla da çalışır.

## Cache bump kuralı (önemli)

Service worker kurulu cihazlar dosyaları yerel cache'ten servisler.
**Herhangi bir dosyayı (HTML/CSS/JS/SVG/manifest) güncelledikten sonra**
`mobile-sw.js` içindeki `CACHE` sabitini bir artır:

```js
// önce
const CACHE = "armur-v1";
// sonra
const CACHE = "armur-v2";
```

Bu olmadan yeni sürüm cihazlara yansımaz; eski SW cache'i devrede kalır.

## Veri saklama

- Anahtar: `armur.mobile.records`
- Yapı: `Array<{ id, name, fis, iplikler, total, createdAt, updatedAt }>`
- Yalnızca aynı tarayıcı + aynı cihazda kalır. Tarayıcı verisi temizlenirse
  veya başka cihazdan açılırsa kayıtlar görünmez.

## v1 kapsam dışı

- Çoklu kullanıcı / login
- Backend / API / SQL
- Tarak-tahar diyagramı, içerik raporu, Excel export
- Master iplik kataloğu
- Çoklu cihaz senkronizasyonu
