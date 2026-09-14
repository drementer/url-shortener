# Audit trail

## Context

Sunucuda bugün "kim neyi ne zaman değiştirdi" sorusunun cevabı yok. `Click` tablosu
sadece yönlendirmeleri sayıyor, `Session` tablosu ise sadece açık oturumları tutuyor —
başarısız bir giriş denemesi, bir rolün silinmesi ya da bir kullanıcıya ADMIN rolü
verilmesi hiçbir yerde iz bırakmıyor. Rol yönetimi (`/api/v1/roles`, `/api/v1/users/:id/role`)
kota ve yetki dağıtan bir yüzey olduğu için bu izin tutulması gerekiyor.

Hedef: güvenlik ve admin olaylarını append-only (yalnızca ekleme yapılan) bir tabloya
yazmak ve admin'e salt okunur bir liste endpoint'i vermek.

**Taban:** worktree `origin/main` (c92e278) üzerinde. `feat/password-management`
dalındaki şifre değiştirme/sıfırlama olayları bu pass'in dışında — o dal merge olunca
ayrıca eklenecek.

## Kaydedilecek olaylar

| action | nerede |
|---|---|
| `auth.register` | `use-cases/auth/register.ts` |
| `auth.login.succeeded` | `use-cases/auth/login.ts` |
| `auth.login.failed` | `use-cases/auth/login.ts` (throw'dan önce, `actorId: null`, denenen e-posta `actorEmail`'de) |
| `auth.logout` | `use-cases/auth/logout.ts` |
| `auth.refresh.reused` | `use-cases/auth/refresh.ts` — iptal edilmiş token replay edilince (token sızıntısı sinyali) |
| `role.created` / `role.updated` / `role.deleted` | `use-cases/role/{create,update,delete}.ts` |
| `user.role.assigned` | `use-cases/role/assign-user-role.ts` |

Başarılı `refresh` bilerek kaydedilmiyor: kullanıcı başına ~15 dakikada bir tekrarlanır
ve tabloyu ilgi çekici olmayan satırlarla doldurur. Güvenlik açısından anlamlı olan
replay durumu.

Link create/delete de dışarıda: `Url` tablosu zaten sahibi ve zamanı ile duruyor.

## Tasarım kararları

1. **Yazma noktası use-case katmanı.** Controller'lar bu kod tabanında ince mapper;
   middleware ise olayı route + status'tan tahmin etmek zorunda kalır ve "hangi rol
   silindi" gibi bilgiyi kaybeder. Olayın anlamı use-case'te.

2. **Actor use-case'e parametre olarak geçer.** `use-cases/url/create.ts` zaten
   `createUrl(command, userId)` imzasıyla bunu yapıyor; rol use-case'leri de
   `createRole(command, actor)` şekline getirilecek. IP/user-agent da gerektiği için
   tek bir `AuditActor` nesnesi taşınır:

   ```ts
   type AuditActor = { id: string; email: string; ip?: string; userAgent?: string };
   ```

   Auth use-case'leri zaten `SessionContext { userAgent, ip }` alıyor — actor kimliği
   içeride bilindiği için orada ek parametre gerekmiyor.

3. **Audit yazımı isteği düşürmez.** `recordAuditEvent` await edilir ama hatası
   yakalanıp `console.error` ile bildirilir. Log tablosundaki bir arıza login'i
   çökertmemeli. Bunun bedeli: nadir bir yazma hatası sessiz bir boşluk bırakır.

4. **`actorId` foreign key değil.** Kullanıcı silinince audit satırı cascade ile
   gitmemeli; kimliğin okunabilir kalması için `actorEmail` denormalize tutulur.

5. **Tablo append-only.** Repository sadece `create` ve `findAll` sunar; update/delete
   ne repository'de ne API'de var.

## Değişecek dosyalar

**Şema**
- `server/prisma/schema.prisma` — `AuditLog` modeli:
  `id, action, actorId?, actorEmail?, targetType?, targetId?, metadata?, ip?, userAgent?, createdAt`
  + `@@index([createdAt])`, `@@index([actorId, createdAt])`, `@@index([action, createdAt])`.
  `metadata` sqlite'ta `Json` desteklenmediği için JSON-encoded `String`.
- `server/prisma/migrations/<ts>_add_audit_log/` — `prisma migrate dev` ile üretilir.

**Çekirdek**
- `server/domain/audit.ts` (yeni) — `AUDIT_ACTIONS` sabit haritası; action isimleri
  tek yerden gelsin diye. `domain/role.ts` ile aynı desen.
- `server/types.ts` — `AuditLog`, `NewAuditLog`, `AuditActor`, `AuditLogFilter`,
  `AuditLogRepository` tipleri; mevcut el yazımı tip bloğunun devamı olarak.
- `server/repositories/audit-log.ts` (yeni) — `create` + `findAll(filter, page)`,
  `createdAt desc`; `repositories/click.ts` ve `role.ts` desenini izler.
- `server/use-cases/audit/record.ts` (yeni) — tek giriş noktası; hatayı yutup loglar.
- `server/use-cases/audit/find-all.ts`, `server/use-cases/audit/index.ts` (yeni).

**Çağrı yerleri**
- `server/use-cases/auth/{register,login,logout,refresh}.ts` — `recordAuditEvent` çağrısı.
- `server/use-cases/role/{create,update,delete,assign-user-role}.ts` — ikinci parametre
  olarak `actor` eklenir + kayıt çağrısı.
- `server/middlewares/auth.ts` — `currentUser`'ın yanına `actorContext(req)` yardımcısı
  (`{ id, email, ip, userAgent }`). `controllers/auth.ts` içindeki `sessionContext` ile
  aynı fikir, tek yerde.
- `server/controllers/role.ts`, `server/controllers/user.ts` — `actorContext(req)` geçirir.

**Okuma yüzeyi**
- `server/validators/audit-log.ts` (yeni) — `listAuditLogsQuerySchema`:
  `page`, `limit` (`listUrlsQuerySchema`'daki `z.coerce` + `MAX_PAGE_SIZE` deseni),
  `action?`, `actorId?`, `from?`, `to?`.
- `server/mappers/audit-log.ts` (yeni) — `toAuditLogResponse`, `toPagedAuditLogsResponse`;
  `mappers/url.ts`'deki `{ data, meta }` zarfını birebir kullanır.
- `server/controllers/audit-log.ts`, `server/routes/audit-log.ts` (yeni) —
  `requireAuth` + `requireRole('ADMIN')` + `rateLimits.general`, sadece `GET /`.
- `server/routes/index.ts` — `v1.use('/audit-logs', auditLogRoutes)`.

**Test ve doküman**
- `server/tests/helpers.ts` — `resetDatabase`'e `prisma.auditLog.deleteMany()` eklenir
  (ilk sırada, kimseye referans vermiyor).
- `server/tests/audit-log.repository.test.ts`, `server/tests/audit-log.api.test.ts` (yeni)
  — filtreler, sayfalama, ADMIN olmayan için 403.
- Mevcut `auth.use-cases.test.ts` ve `role.api.test.ts`'e olay yazıldığını doğrulayan
  assertion'lar.
- `api-docs/openapi.yaml` — `/api/v1/audit-logs` path'i + `AuditLog` şeması.
- `server/CHANGELOG.md`.

## Doğrulama

```bash
cd server
bun run test                 # migration deploy + tüm suite
bunx prisma migrate dev      # migration'ı üretmek için (bir kez)
bun run dev
```

Uçtan uca elle kontrol:
1. Yanlış şifreyle `POST /api/v1/auth/login` → 401, `auth.login.failed` satırı düşmeli.
2. Doğru şifreyle login → `auth.login.succeeded`.
3. ADMIN ile `POST /api/v1/roles` → `role.created`, `targetId` yeni rolün id'si.
4. `GET /api/v1/audit-logs?action=auth.login.failed&limit=5` → sadece o olaylar,
   `createdAt` azalan sırada.
5. USER rolüyle aynı endpoint → 403.
