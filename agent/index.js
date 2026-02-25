require('dotenv').config();
const cron = require('node-cron');
const { runFridayCron } = require('./cron_friday');
const { runMondayCron } = require('./cron_monday');

const args = process.argv.slice(2);

// Manual test mode: run immediately then exit
if (args.includes('--test-friday')) {
  console.log('Running Friday cron manually...\n');
  runFridayCron().then(() => {
    console.log('\nDone. Exiting.');
    setTimeout(() => process.exit(0), 1000);
  });
} else if (args.includes('--test-monday')) {
  console.log('Running Monday cron manually...\n');
  runMondayCron().then(() => {
    console.log('\nDone. Exiting.');
    setTimeout(() => process.exit(0), 1000);
  });
} else {
  // Normal scheduled mode
  console.log('Ignis Report Agent started.');
  console.log('Scheduled jobs:');
  console.log('  - Friday  3:00 PM EAT (12:00 UTC) → Send form links');
  console.log('  - Monday  6:00 AM EAT (03:00 UTC) → Generate & email report');
  console.log('\nManual test commands:');
  console.log('  node index.js --test-friday   → Send form emails now');
  console.log('  node index.js --test-monday   → Generate Word doc & email now');

  // Friday 3:00 PM EAT = 12:00 PM UTC
  cron.schedule('0 12 * * 5', () => {
    console.log(`\n[${new Date().toISOString()}] Friday cron triggered`);
    runFridayCron();
  }, { timezone: 'UTC' });

  // Monday 6:00 AM EAT = 3:00 AM UTC
  cron.schedule('0 3 * * 1', () => {
    console.log(`\n[${new Date().toISOString()}] Monday cron triggered`);
    runMondayCron();
  }, { timezone: 'UTC' });

  console.log('\nAgent is running. Press Ctrl+C to stop.\n');
}
