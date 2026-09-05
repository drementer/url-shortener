-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Url" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortCode" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "customSlug" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Url" ("createdAt", "customSlug", "expiresAt", "id", "originalUrl", "shortCode", "updatedAt") SELECT "createdAt", "customSlug", "expiresAt", "id", "originalUrl", "shortCode", "updatedAt" FROM "Url";
DROP TABLE "Url";
ALTER TABLE "new_Url" RENAME TO "Url";
CREATE UNIQUE INDEX "Url_shortCode_key" ON "Url"("shortCode");
CREATE UNIQUE INDEX "Url_customSlug_key" ON "Url"("customSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

