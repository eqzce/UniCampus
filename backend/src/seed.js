require('dotenv').config();
const { initDatabase } = require('./db');

async function runSeed() {
  console.log('===============================================');
  console.log('  UniCampus Database Seeder');
  console.log('===============================================');
  try {
    const result = await initDatabase(true);
    console.log(`[SUCCESS] Seeded database (${result.engine}) with Student, Teacher & Admin accounts!`);
    console.log('');
    console.log('Primary Test Accounts:');
    console.log('  1. Student: student@unicampus.kz  | Password: student123  (Arystan Seitkaliyev, Group CS-2401)');
    console.log('  2. Teacher: teacher@unicampus.kz  | Password: teacher123  (Dr. Yersultan M., Physics & CS)');
    console.log('  3. Admin:   admin@unicampus.kz    | Password: admin123    (Aidar K., System Admin)');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Seeding failed:', err);
    process.exit(1);
  }
}

runSeed();
