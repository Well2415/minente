const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Function to open the database connection
async function openDb() {
  return open({
    filename: './ponto.db',
    driver: sqlite3.Database
  });
}

// Initialize the database and create tables if they don't exist
async function initializeDatabase() {
  const db = await openDb();
  await db.exec('PRAGMA foreign_keys = OFF;');

  const userTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users';");
  if (userTableExists) {
    await db.exec('ALTER TABLE users RENAME TO usuarios;');
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

  const employeesTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='employees';");
  if (employeesTableExists) {
    await db.exec('ALTER TABLE employees RENAME TO funcionarios;');
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS funcionarios (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT CHECK(role IN ('employee', 'manager', 'admin')) NOT NULL,
      department TEXT,
      ctps TEXT,
      admissionDate TEXT,
      workScheduleTemplateId TEXT,
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
  `);

  const workScheduleTemplatesTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='work_schedule_templates';");
  if (workScheduleTemplatesTableExists) {
    await db.exec('ALTER TABLE work_schedule_templates RENAME TO modelos_horario_trabalho;');
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS modelos_horario_trabalho (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      workSchedule TEXT NOT NULL,
      saturdayWorkSchedule TEXT,
      weeklyRestDay TEXT
    );
  `);

  const timeRecordsTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='time_records';");
  if (timeRecordsTableExists) {
    await db.exec('ALTER TABLE time_records RENAME TO registros_ponto;');
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS registros_ponto (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES funcionarios(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      mensagem TEXT NOT NULL,
      lida INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES usuarios(id) ON DELETE CASCADE
    );
  `);

  const usersCount = await db.get('SELECT COUNT(*) as count FROM usuarios');
  if (usersCount.count === 0) {
    console.log('Seeding initial admin user...');
    await db.run('INSERT INTO usuarios (username, password) VALUES (?, ?)', ['admin', 'admin123']);
    console.log('Admin user created: username "admin", password "admin123".');
  }

  // --- Data Migration/Seeding ---
  const MOCK_EMPLOYEES = [
    { id: '1', name: 'Carlos Silva', email: 'gerente@empresa.com', role: 'manager', department: 'Recursos Humanos' },
    { id: '2', name: 'Ana Santos', email: 'ana@empresa.com', role: 'employee', department: 'Desenvolvimento' },
    { id: '3', name: 'João Oliveira', email: 'joao@empresa.com', role: 'employee', department: 'Design' },
    { id: '4', name: 'Maria Costa', email: 'maria@empresa.com', role: 'employee', department: 'Marketing' },
  ];

  const employeesCount = await db.get('SELECT COUNT(*) as count FROM funcionarios');
  if (employeesCount.count === 0) {
    console.log('Seeding employees table...');
    const stmt = await db.prepare('INSERT INTO funcionarios (id, name, email, role, department) VALUES (?, ?, ?, ?, ?)');
    for (const emp of MOCK_EMPLOYEES) {
      await stmt.run(emp.id, emp.name, emp.email, emp.role, emp.department);
    }
    await stmt.finalize();
    console.log('Employees table seeded.');
  }

  const MOCK_WORK_SCHEDULE_TEMPLATES = [
    { id: 'ws1', name: 'Comercial (8h)', workSchedule: '08:00-12:00,13:00-17:00', saturdayWorkSchedule: null, weeklyRestDay: 'Sábado e Domingo' },
    { id: 'ws2', name: 'Noturno (6h)', workSchedule: '18:00-00:00', saturdayWorkSchedule: null, weeklyRestDay: 'Sábado e Domingo' },
    { id: 'ws3', name: 'Escala 12x36', workSchedule: '07:00-19:00', saturdayWorkSchedule: '07:00-19:00', weeklyRestDay: 'Variável' },
  ];

  const templatesCount = await db.get('SELECT COUNT(*) as count FROM modelos_horario_trabalho');
  if (templatesCount.count === 0) {
    console.log('Seeding work_schedule_templates table...');
    const stmt = await db.prepare('INSERT INTO modelos_horario_trabalho (id, name, workSchedule, saturdayWorkSchedule, weeklyRestDay) VALUES (?, ?, ?, ?, ?)');
    for (const tpl of MOCK_WORK_SCHEDULE_TEMPLATES) {
      await stmt.run(tpl.id, tpl.name, tpl.workSchedule, tpl.saturdayWorkSchedule, tpl.weeklyRestDay);
    }
    await stmt.finalize();
    console.log('Work schedule templates table seeded.');
  }
  
  await db.exec('PRAGMA foreign_keys = ON;');
  console.log('Database initialized successfully.');
  return db;
}

// We export the promise so we can await it in other files
module.exports = initializeDatabase();