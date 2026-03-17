import 'dotenv/config';
import sequelize from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0] || 'migrate';

function toFileURL(filepath) {
  return 'file:///' + filepath.replace(/\\/g, '/');
}

async function getMigrations() {
  const migrationsPath = path.join(__dirname, '../database/migrations');
  const files = fs.readdirSync(migrationsPath)
    .filter(f => f.endsWith('.js') && f !== 'index.js')
    .sort();
  
  const migrations = [];
  for (const file of files) {
    const fullPath = path.join(migrationsPath, file);
    const migration = await import(toFileURL(fullPath));
    migrations.push({
      name: file.replace('.js', ''),
      up: migration.up,
      down: migration.down
    });
  }
  return migrations;
}

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('📦 Database connected\n');

    const migrations = await getMigrations();
    console.log(`Found ${migrations.length} migrations\n`);

    const tableExists = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'",
      { type: sequelize.QueryTypes.SELECT }
    );

    if (tableExists.length === 0) {
      await sequelize.query(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('📋 Migrations table created\n');
    }

    const executed = await sequelize.query(
      'SELECT name FROM migrations ORDER BY executed_at',
      { type: sequelize.QueryTypes.SELECT }
    );
    const executedNames = executed.map(m => m.name);

    const pending = migrations.filter(m => !executedNames.includes(m.name));

    if (command === 'migrate') {
      console.log('🚀 Running migrations...\n');
      
      for (const migration of pending) {
        console.log(`   ${migration.name}`);
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize.DataTypes);
        await sequelize.query(
          `INSERT INTO migrations (name) VALUES (?)`,
          { replacements: [migration.name] }
        );
      }
      
      console.log(`\n✅ ${pending.length} migration(s) completed\n`);
    }

    if (command === 'rollback') {
      console.log('🔄 Rolling back last migration...\n');
      
      if (pending.length === 0 && executedNames.length > 0) {
        const lastMigration = executedNames[executedNames.length - 1];
        const migration = migrations.find(m => m.name === lastMigration);
        
        if (migration) {
          console.log(`   ${migration.name}`);
          await migration.down(sequelize.getQueryInterface(), sequelize.Sequelize.DataTypes);
          await sequelize.query(`DELETE FROM migrations WHERE name = ?`, { replacements: [lastMigration] });
          console.log('\n✅ Migration rolled back\n');
        }
      } else {
        console.log('No migrations to rollback\n');
      }
    }

    if (command === 'fresh') {
      console.log('🔄 Dropping all tables...\n');
      
      await sequelize.query('DROP TABLE IF EXISTS migrations');
      const allTables = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      for (const table of allTables) {
        if (table.name !== 'sqlite_sequence') {
          await sequelize.query(`DROP TABLE IF EXISTS ${table.name}`);
        }
      }

      await sequelize.query(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('🚀 Running fresh migrations...\n');
      
      for (const migration of migrations) {
        console.log(`   ${migration.name}`);
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize.DataTypes);
        await sequelize.query(`INSERT INTO migrations (name) VALUES (?)`, { replacements: [migration.name] });
      }
      
      console.log(`\n✅ ${migrations.length} migration(s) completed\n`);
      
      if (args.includes('--seed')) {
        console.log('🌱 Running seeds...\n');
        const { default: runSeed } = await import('./seed.js');
        await runSeed();
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
