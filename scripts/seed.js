import 'dotenv/config';
import sequelize from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0] || 'seed';

function toFileURL(filepath) {
  return 'file:///' + filepath.replace(/\\/g, '/');
}

async function getSeeders() {
  const seedersPath = path.join(__dirname, '../database/seeders');
  const files = fs.readdirSync(seedersPath)
    .filter(f => f.endsWith('.js') && !f.startsWith('index'))
    .sort();
  
  const seeders = [];
  for (const file of files) {
    const fullPath = path.join(seedersPath, file);
    const seeder = await import(toFileURL(fullPath));
    seeders.push({
      name: file.replace('.js', ''),
      up: seeder.up,
      down: seeder.down
    });
  }
  return seeders;
}

async function runSeed() {
  try {
    await sequelize.authenticate();
    console.log('📦 Database connected\n');

    const seeders = await getSeeders();
    console.log(`Found ${seeders.length} seeders\n`);

    const tableExists = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='seeders'",
      { type: sequelize.QueryTypes.SELECT }
    );

    if (tableExists.length === 0) {
      await sequelize.query(`
        CREATE TABLE seeders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    const executed = await sequelize.query(
      'SELECT name FROM seeders ORDER BY executed_at',
      { type: sequelize.QueryTypes.SELECT }
    );
    const executedNames = executed.map(s => s.name);

    if (command === 'seed') {
      console.log('🌱 Running seeders...\n');
      
      for (const seeder of seeders) {
        if (!executedNames.includes(seeder.name)) {
          console.log(`   ${seeder.name}`);
          await seeder.up(sequelize.getQueryInterface(), sequelize);
          await sequelize.query(
            `INSERT INTO seeders (name) VALUES (?)`,
            { replacements: [seeder.name] }
          );
        }
      }
      
      console.log('\n✅ Seed completed\n');
    }

    if (command === 'seed:undo') {
      console.log('🔄 Rolling back seeders...\n');
      
      if (executedNames.length > 0) {
        const lastSeeder = executedNames[executedNames.length - 1];
        const seeder = seeders.find(s => s.name === lastSeeder);
        
        if (seeder) {
          console.log(`   ${seeder.name}`);
          await seeder.down(sequelize.getQueryInterface(), sequelize);
          await sequelize.query(`DELETE FROM seeders WHERE name = ?`, { replacements: [lastSeeder] });
          console.log('\n✅ Seeder rolled back\n');
        }
      } else {
        console.log('No seeders to rollback\n');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed();
}

export default runSeed;
