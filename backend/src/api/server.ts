// Starts the HTTP API on http://localhost:3000 (npm run api from the repo
// root). Set PORT to use another port.
import { prisma } from '../prisma';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3000);

createApp(prisma).listen(port, () => {
  console.log(`ClubHouse API listening on http://localhost:${port}`);
});
