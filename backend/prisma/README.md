# Prisma local setup

From the repository root, install dependencies and apply migrations to create your local SQLite database:

```powershell
npm.cmd install
npm.cmd exec --workspace=@clubhouse/backend -- prisma migrate deploy --schema=prisma\schema.prisma
npm.cmd exec --workspace=@clubhouse/backend -- prisma studio --schema=prisma\schema.prisma
```

Prisma Studio opens in your browser. Each developer has a separate local `dev.db`; database records are not shared through Git.
