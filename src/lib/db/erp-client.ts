/**
 * ERP DB köprüsü — işletmede ERP'ye read-only bağlanır.
 * Ev bilgisayarında ERP_DATABASE_URL boş → erpEnabled=false, tüm sorgular null döner.
 *
 * ERP_DB_TYPE: 'mssql' | 'mysql' | 'postgres' (işletme ERP'sine göre)
 * Şimdilik sadece interface — gerçek bağlantı, işletmeye taşınınca eklenecek.
 */

type ErpClient = {
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;
  close: () => Promise<void>;
};

let cachedClient: ErpClient | null = null;

export function erpEnabled(): boolean {
  return Boolean(process.env.ERP_DATABASE_URL);
}

export async function getErpClient(): Promise<ErpClient | null> {
  if (!erpEnabled()) return null;
  if (cachedClient) return cachedClient;

  // TODO: işletmeye taşınınca ERP tipine göre driver seç:
  // - mssql: `import sql from 'mssql'` → new ConnectionPool(...)
  // - mysql: `import mysql from 'mysql2/promise'` → createPool(...)
  // - postgres: drizzle/postgres-js ile ayrı connection
  //
  // MVP'de iskelet bırakıyoruz — kullanıcı ERP markasını söyleyince final driver seçilecek.
  throw new Error(
    "ERP client henüz implement edilmedi. ERP_DB_TYPE ve connection string ayarlandıktan sonra src/lib/db/erp-client.ts güncellenmeli."
  );
}

export async function closeErpClient() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
  }
}
