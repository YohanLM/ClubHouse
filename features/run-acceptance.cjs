const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const schema = path.join(root, 'backend/prisma/schema.prisma');
// Never inherit a developer's database: the hooks delete scenario fixtures.
const env = { ...process.env, DATABASE_URL: 'file:./test.db' };
fs.closeSync(fs.openSync(path.join(root, 'backend/prisma/test.db'), 'a'));
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: __dirname, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run([require.resolve('prisma'), 'migrate', 'deploy', '--schema', schema]);
const cucumber = path.resolve(path.dirname(require.resolve('@cucumber/cucumber')), '../bin/cucumber.js');
// tsx must be registered by Node before Cucumber imports any TypeScript.
run(['--import', 'tsx', cucumber,
  '--import', 'support/**/*.ts', '--import', 'step_definitions/**/*.ts',
  '--format', 'summary', '--format', 'json:../reports/cucumber.json',
  '--format', 'html:../reports/cucumber.html', ...process.argv.slice(2), '*.feature']);

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/cucumber.json'), 'utf8'));
if (!report.some((feature) => feature.elements?.some((scenario) => scenario.steps?.length > 0))) {
  throw new Error('No acceptance scenarios executed. Check the feature paths.');
}
