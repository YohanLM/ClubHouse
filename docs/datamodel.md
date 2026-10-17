# Data model

This document describes the Account datamodel used by the ClubHouse backend and the Prisma schema located at `backend/prisma/schema.prisma`.

Account fields
- id: integer, primary key
- email: string, unique — the user's McGill email
- name: string — full name of the user
- passwordHash: string — the hashed password (never store plaintext passwords)
- role: string — one of `User`, `Club Owner`, or `Administrator`; defaults to `User`
- faculty: optional string — faculty (e.g. Engineering)
- studyYear: optional string — study year label (e.g. U2)
- failedLoginAttempts: integer — counter for failed logins used for lockout policies
- lockedUntil: optional DateTime — if account is temporarily locked, time until unlock
- createdAt / updatedAt: timestamps

Prisma schema
Refer to `backend/prisma/schema.prisma` for the exact Prisma datamodel and SQLite datasource configuration. The repository uses Prisma with SQLite for local development and acceptance tests.
