# Numune Master — R&D Süreç Yönetim Web Uygulaması

Tekstil R&D departmanı için Ar-Ge talepleri, numune dokuma, iplik sipariş, boyahane takip, çözgü ve renk çalışmalarını tek bir modüler web uygulamasında yönetir. Kaynak Excel: `NUMUNE MASTER 1.0.2.xlsm`.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack, Standalone output)
- **PostgreSQL 16** (Docker Compose ile self-hosted, cloud-bağımsız)
- **Drizzle ORM** (migration + ham SQL desteği)
- **Auth.js v5** (credentials + bcrypt)
- **shadcn/ui** + TailwindCSS v4
- **TanStack Query + Table + Virtual**
- **react-hook-form + zod**

## Klasör Yapısı

```
src/
├── app/
│   ├── (auth)/login/          # Giriş sayfası
│   ├── (app)/                 # Korumalı alan (sidebar + modüller)
│   │   ├── arge/              # Ar-Ge talepleri (MVP çekirdeği)
│   │   ├── numune-dokuma/     # Sprint 6
│   │   ├── iplik/             # Sprint 7
│   │   ├── boyahane/          # Sprint 8
│   │   ├── cozgu/             # Sprint 9
│   │   └── ayarlar/
│   └── api/auth/[...nextauth]/
├── modules/                   # Bounded contexts
│   ├── arge/
│   ├── numune-dokuma/
│   ├── erp-bridge/            # İşletme ERP DB köprüsü
│   └── shared/
├── lib/
│   ├── db/                    # Drizzle client + schema
│   ├── auth/                  # Auth.js config + bcrypt
│   └── utils/
└── proxy.ts                   # Next.js 16 proxy (auth guard)

docker-compose.yml             # Dev: postgres only
docker-compose.prod.yml        # Prod: + app + nginx
scripts/                       # seed.ts, backup.ts, import-excel.ts (gelecek)
```

## İlk Kurulum

### 1. Docker Desktop kur
- https://docker.com/products/docker-desktop/
- Windows'ta WSL2 backend seçili olmalı
- `docker --version` doğrula

### 2. Bağımlılıklar
```bash
npm install
```

### 3. Environment
`.env.local` şablondan oluşturuldu. Production'a taşırken `NEXTAUTH_SECRET`'ı değiştir:
```bash
# PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Veritabanı
```bash
npm run docker:up        # Postgres container ayağa kalkar
npm run db:push          # Şemayı DB'ye uygular (ilk kurulum için)
npm run db:seed          # 13 müşteri + 16 işlem tipi + admin kullanıcı
```

Admin hesabı: `admin@numune.local` / `admin123` — **ilk girişten sonra şifreni değiştir.**

### 5. Geliştirme
```bash
npm run dev              # http://localhost:3000
```

## Gündelik Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Şema değişti → migration dosyası oluştur |
| `npm run db:migrate` | Bekleyen migration'ları uygula |
| `npm run db:push` | Dev'de hızlı senkron |
| `npm run db:studio` | Drizzle Studio GUI |
| `npm run db:seed` | Seed verisi yükle |
| `npm run db:backup` | pg_dump ile yedek (`./backups/`) |
| `npm run docker:up/down/logs` | Postgres container yönetimi |

## Modüler Geliştirme Reçetesi

Yeni bir modül eklemek (örn. numune dokuma) için:

1. `src/lib/db/schema.ts`'e yeni tabloyu ekle (`recordNo` FK)
2. `npm run db:generate && npm run db:migrate`
3. `src/modules/<modul>/` altına `schemas.ts`, `queries.ts`, `mutations.ts`, `server/actions.ts`, `components/`
4. `src/app/(app)/<modul>/page.tsx` route'u doldur
5. Sidebar'daki `NAV` dizisinde `disabled: true` kaldır

## ERP Entegrasyonu (ileride)

İşletmeye taşıyınca `.env`'de `ERP_DATABASE_URL` ve `ERP_DB_TYPE` (`mssql` | `mysql` | `postgres`) ayarla. `src/lib/db/erp-client.ts` bu değişkeni algılar, aktif olur. Sorgular `src/modules/erp-bridge/queries/` altında ham SQL olarak yazılır.

## VPS'e Taşıma

```bash
# VPS'te
git clone <repo>
cd numune-master-web
cp .env.example .env.prod   # işletme değerleriyle doldur
docker compose -f docker-compose.prod.yml up -d --build

# Local DB'yi taşımak için:
npm run db:backup
scp backups/numune_YYYYMMDD.sql vps:~/
ssh vps "cat numune_YYYYMMDD.sql | docker exec -i numune_postgres psql -U postgres numune_master"
```

## Yol Haritası

- [x] Sprint 0: Proje iskeleti, Docker, Auth, Şema
- [ ] Sprint 1: Ar-Ge CRUD + liste tablosu
- [ ] Sprint 2: DETAY_FORMU two-pane clone
- [ ] Sprint 3: Hareket log + işlem tipleri yönetimi
- [ ] Sprint 4: Excel import + dashboard
- [ ] Sprint 5: Polish + dogfood
- [ ] Sprint 6: Numune dokuma modülü
- [ ] Sprint 7+: İplik, boyahane, çözgü, renk

Detaylı mimari: [plan dosyası](../../../.claude/plans/c-users-pc-onedrive-2026-furkan-excel-a-cryptic-hennessy.md)
