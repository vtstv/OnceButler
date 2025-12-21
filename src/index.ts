import { createClient, loginClient } from './bot/client.js';
import { registerEvents } from './bot/events.js';
import { runMigrations } from './database/migrations.js';
import { loadRoles } from './roles/roleStore.js';
import { closeDb } from './database/db.js';
import { stopTickScheduler } from './scheduler/tickScheduler.js';

async function main(): Promise<void> {
  console.log('Starting OnceButler...');

  runMigrations();
  console.log('Database migrations complete.');

  loadRoles();
  console.log('Role definitions loaded.');

  const client = createClient();
  registerEvents(client);

  await loginClient(client);

  process.on('SIGINT', () => shutdown(client));
  process.on('SIGTERM', () => shutdown(client));
}

function shutdown(client: { destroy: () => void }): void {
  console.log('Shutting down...');
  stopTickScheduler();
  client.destroy();
  closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
