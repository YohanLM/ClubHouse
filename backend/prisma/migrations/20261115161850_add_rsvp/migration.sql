-- CreateTable
CREATE TABLE "RSVP" (
    "accountId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "response" TEXT NOT NULL,

    PRIMARY KEY ("accountId", "eventId"),
    CONSTRAINT "RSVP_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RSVP_eventId_idx" ON "RSVP"("eventId");
