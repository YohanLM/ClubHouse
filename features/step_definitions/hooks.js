const { Before } = require('@cucumber/cucumber');
const { execSync } = require('child_process');

Before(function () {
  // Run backend script to reset the SQLite test DB before each scenario.
  // Path assumes features/ and backend/ are siblings in the repo root.
  execSync('node ../backend/scripts/resetTestData.js', { stdio: 'inherit' });
});
