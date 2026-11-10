require('dotenv').config();
const { initDatabase } = require('./db');

async function runSeed() {
  console.log('===============================================');
  console.log('  UniCampus Database Seeder');
  console.log('===============================================');
  try {
    const result = await initDatabase(true);
    console.log(`[SUCCESS] Seeded database (${result.engine}) with demo Student & Teacher accounts!`);
    console.log('');
    console.log('Demo Accounts (Password for all: password123):');
    console.log('  - Student: student@astanait.edu.kz (Arystan Seitkaliyev, Group CS-2401)');
    console.log('  - Student: alisher@astanait.edu.kz (Alisher Nurlanov, Group CS-2401)');
    console.log('  - Student: madina@astanait.edu.kz  (Madina Karimova, Group SE-2402)');
    console.log('  - Teacher: teacher@astanait.edu.kz (Dr. Yersultan M., Physics & CS)');
    console.log('  - Teacher: danial@astanait.edu.kz  (Prof. Danial R., Math & History)');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Seeding failed:', err);
    process.exit(1);
  }
}

runSeed();
