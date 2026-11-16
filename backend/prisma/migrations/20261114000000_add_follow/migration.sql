CREATE TABLE "Follow" (
    "accountId" INTEGER NOT NULL,
    "clubId" INTEGER NOT NULL,
    PRIMARY KEY ("accountId", "clubId"),
    CONSTRAINT "Follow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Follow_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Follow_clubId_idx" ON "Follow"("clubId");
