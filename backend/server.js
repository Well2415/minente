const express = require('express');
const cors = require('cors');
const dbPromise = require('./database');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3001'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Removidas as funções parseSchedule e isTimeWithinIntervals

async function createNotification(db, userId, message, isAdminNotification = 0) {
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  await db.run(
    'INSERT INTO notificacoes (id, userId, mensagem, timestamp, lida, isAdminNotification) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, message, timestamp, 0, isAdminNotification]
  );
}

app.post('/api/users', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)', [username, password, 'employee']);
    res.status(201).json({ id: result.lastID, username });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Nome de usuário já existe' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
  }

  try {
    const db = await dbPromise;
    const user = await db.get('SELECT id, username, password, role FROM usuarios WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

                if (password === user.password) {

                  const employee = await db.get('SELECT * FROM funcionarios WHERE user_id = ?', [user.id]);

                  const { password: userPassword, ...userWithoutPassword } = user;

          
          if (employee) {
        res.json({
          message: 'Login successful',
          user: {
            id: user.id.toString(),
            employeeId: employee.id,
            name: employee.name,
            email: employee.email || '',
            role: user.role,
            department: employee.department || '',
            ctps: employee.ctps,
            admissionDate: employee.admissionDate,
            // workScheduleTemplateId: employee.workScheduleTemplateId, // REMOVIDO
          },
        });
      } else {
        res.json({
          message: 'Login successful',
          user: {
            id: user.id.toString(),
            name: user.username,
            email: '',
            role: user.role,
            department: '',
            ctps: '',
            admissionDate: '',
            // workScheduleTemplateId: null, // REMOVIDO
          },
        });
      }
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const db = await dbPromise;
    const users = await db.all('SELECT id, username, role FROM usuarios');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: 'A role é obrigatória para atualização.' });
  }
  const validRoles = ['employee', 'manager', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Role inválida. As roles permitidas são: employee, manager, admin.' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run(
      'UPDATE usuarios SET role = ? WHERE id = ?',
      [role, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado ou role não alterada.' });
    }
    res.status(200).json({ id: userId, role: role, message: 'Role do usuário atualizada com sucesso.' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/employees/:id/link', async (req, res) => {
  const { userId } = req.body;
  const employeeId = req.params.id;

  if (userId === undefined) {
    return res.status(400).json({ error: 'ID de usuário é obrigatório' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run('UPDATE funcionarios SET user_id = ? WHERE id = ?', [userId, employeeId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    res.status(200).json({ message: 'Vínculo de funcionário atualizado com sucesso.' });
  } catch (error) {
    console.error('Error linking user to employee:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const db = await dbPromise;
    const employees = await db.all(`
      SELECT
        f.id,
        f.name,
        f.email,
        f.department,
        f.ctps,
        f.admissionDate,
        f.user_id,
        u.username,
        u.role
      FROM funcionarios AS f
      LEFT JOIN usuarios AS u ON f.user_id = u.id
    `);
    console.log('API /api/employees retornou:', employees); // Adicionar este log
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/employees/:id', async (req, res) => {
  const employeeId = req.params.id;
  try {
    const db = await dbPromise;
    const employee = await db.get(`
      SELECT
        f.id,
        f.name,
        f.email,
        f.department,
        f.ctps,
        f.admissionDate,
        f.user_id,
        u.username,
        u.role
      FROM funcionarios AS f
      LEFT JOIN usuarios AS u ON f.user_id = u.id
      WHERE f.id = ?
    `, [employeeId]);

    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    res.json(employee);
  } catch (error) {
    console.error(`Error fetching employee with ID ${employeeId}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/employees', async (req, res) => {
  const { name, email, department, ctps, admissionDate } = req.body; // workScheduleTemplateId REMOVIDO
  if (!name) {
    return res.status(400).json({ error: 'Nome do funcionário é obrigatório' });
  }

  try {
    const db = await dbPromise;
    const existingEmployeeByEmail = await db.get('SELECT id FROM funcionarios WHERE email = ?', [email]);
    if (existingEmployeeByEmail) {
        return res.status(409).json({ error: 'Já existe um funcionário com este e-mail' });
    }

    const result = await db.run(
      'INSERT INTO funcionarios (name, email, department, ctps, admissionDate) VALUES (?, ?, ?, ?, ?)', // workScheduleTemplateId REMOVIDO
      [name, email, department, ctps, admissionDate]
    );
    res.status(201).json({ id: result.lastID, name, email, department, ctps, admissionDate }); // workScheduleTemplateId REMOVIDO
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  const employeeId = req.params.id;
  const { name, email, department, ctps, admissionDate } = req.body; // workScheduleTemplateId REMOVIDO

  try {
    const db = await dbPromise;
    const result = await db.run(
      'UPDATE funcionarios SET name = ?, email = ?, department = ?, ctps = ?, admissionDate = ? WHERE id = ?', // workScheduleTemplateId REMOVIDO
      [name, email, department, ctps, admissionDate, employeeId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    res.status(200).json({ id: employeeId, name, email, department, ctps, admissionDate }); // workScheduleTemplateId REMOVIDO
  } catch (error) {
    console.error('Error updating employee:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Já existe um funcionário com este e-mail' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// REMOVIDAS TODAS AS ROTAS DE work-schedule-templates e shift-schedules

// --- Dashboard Endpoints ---

// Helper to get records for a date range and user
async function getRecordsForRange(db, userId, startDate, endDate) {
  return db.all(
    'SELECT * FROM registros_ponto WHERE userId = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp ASC',
    [userId, startDate, endDate]
  );
}

// GET hours per day for the last 7 days (or based on endDate)
app.get('/api/dashboard/hours-per-day-weekly', async (req, res) => {
  const { userId, endDate: queryEndDate } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'UserID é obrigatório.' });
  }

  try {
    const db = await dbPromise;
    const end = queryEndDate ? new Date(queryEndDate) : new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    const dailyHours = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dayStart = currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
      const dayEnd = currentDate.toISOString().split('T')[0] + 'T23:59:59.999Z';

      const records = await getRecordsForRange(db, userId, dayStart, dayEnd);
      const totalHours = processDailyRecords(records);
      dailyHours.push({
        date: currentDate.toISOString().split('T')[0],
        hours: parseFloat(totalHours.toFixed(2))
      });
    }
    res.json(dailyHours);
  } catch (error) {
    console.error('Error fetching hours per day weekly:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET total hours worked weekly
app.get('/api/dashboard/total-hours-weekly', async (req, res) => {
  const { userId, endDate: queryEndDate } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'UserID é obrigatório.' });
  }

  try {
    const db = await dbPromise;
    const end = queryEndDate ? new Date(queryEndDate) : new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (end.getDay() + 6) % 7);

    const records = await getRecordsForRange(
      db,
      userId,
      start.toISOString().split('T')[0] + 'T00:00:00.000Z',
      end.toISOString()
    );

    const recordsByDay = records.reduce((acc, record) => {
      const date = record.timestamp.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {});

    let totalHours = 0;
    for (const date in recordsByDay) {
      totalHours += processDailyRecords(recordsByDay[date]);
    }

    res.json({ totalHours: parseFloat(totalHours.toFixed(2)) });
  } catch (error) {
    console.error('Error fetching total hours weekly:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET total hours worked monthly
app.get('/api/dashboard/total-hours-monthly', async (req, res) => {
  const { userId, endDate: queryEndDate } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'UserID é obrigatório.' });
  }

  try {
    const db = await dbPromise;
    const end = queryEndDate ? new Date(queryEndDate) : new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    const endOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);

    const records = await getRecordsForRange(
      db,
      userId,
      start.toISOString().split('T')[0] + 'T00:00:00.000Z',
      endOfMonth.toISOString().split('T')[0] + 'T23:59:59.999Z'
    );

    const recordsByDay = records.reduce((acc, record) => {
      const date = record.timestamp.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {});

    let totalHours = 0;
    for (const date in recordsByDay) {
      totalHours += processDailyRecords(recordsByDay[date]);
    }

    res.json({ totalHours: parseFloat(totalHours.toFixed(2)) });
  } catch (error) {
    console.error('Error fetching total hours monthly:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET total days worked monthly
app.get('/api/dashboard/total-days-worked-monthly', async (req, res) => {
  const { userId, endDate: queryEndDate } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'UserID é obrigatório.' });
  }

  try {
    const db = await dbPromise;
    const end = queryEndDate ? new Date(queryEndDate) : new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    const endOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);

    const records = await getRecordsForRange(
      db,
      userId,
      start.toISOString().split('T')[0] + 'T00:00:00.000Z',
      endOfMonth.toISOString().split('T')[0] + 'T23:59:59.999Z'
    );

    const distinctDays = new Set(records.map(record => record.timestamp.split('T')[0]));
    res.json({ totalDays: distinctDays.size });
  } catch (error) {
    console.error('Error fetching total days worked monthly:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET all time records, with optional user ID and date range
app.get('/api/timerecords', async (req, res) => {
  const { userId, startDate, endDate } = req.query;
  
  try {
    const db = await dbPromise;
    let query = 'SELECT * FROM registros_ponto WHERE 1=1';

    const params = [];

    if (userId) {
      query += ' AND userId = ?';
      params.push(parseInt(userId, 10));
    }

    if (startDate && endDate) {
      query += ' AND timestamp BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY timestamp ASC';

    const records = await db.all(query, params);
    res.json(records);
  } catch (error) {
    console.error('Error fetching time records:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST a new time record
app.post('/api/timerecords', async (req, res) => {
  const { employeeId, timestamp, type } = req.body;
  if (!employeeId || !timestamp || !type) {
    return res.status(400).json({ error: 'ID do funcionário, registro de tempo e tipo são obrigatórios' });
  }

  try {
    const db = await dbPromise;

    const employee = await db.get('SELECT * FROM funcionarios WHERE id = ?', [parseInt(employeeId, 10)]);
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    // workScheduleTemplate e lógica de notificação baseada em jornada REMOVIDOS

    const id = uuidv4();
    const result = await db.run(
      'INSERT INTO registros_ponto (id, userId, timestamp, type) VALUES (?, ?, ?, ?)',
      [id, employee.id, timestamp, type]
    );

    res.status(201).json({ id, userId: employee.id, timestamp, type });
  } catch (error) {
    console.error('Error creating time record:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/timerecords/:id', async (req, res) => {
  const recordId = req.params.id;
  const { userId, timestamp, type } = req.body;

  if (!userId || !timestamp || !type) {
    return res.status(400).json({ error: 'ID do usuário, registro de tempo e tipo são obrigatórios para atualização' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run(
      'UPDATE registros_ponto SET userId = ?, timestamp = ?, type = ? WHERE id = ?',
      [userId, timestamp, type, recordId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Registro de ponto não encontrado' });
    }
    res.status(200).json({ id: recordId, userId, timestamp, type });
  } catch (error) {
    console.error('Error updating time record:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/timerecords/:id', async (req, res) => {
  const recordId = req.params.id;

  try {
    const db = await dbPromise;
    const result = await db.run('DELETE FROM registros_ponto WHERE id = ?', [recordId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Registro de ponto não encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting time record:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/notificacoes', async (req, res) => {
  const { userId, mensagem } = req.body;
  if (!userId || !mensagem) {
    return res.status(400).json({ error: 'ID do usuário e mensagem são obrigatórios para criar uma notificação' });
  }

  try {
    const db = await dbPromise;
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO notificacoes (id, userId, mensagem, timestamp, lida) VALUES (?, ?, ?, ?, ?)',
      [id, userId, mensagem, timestamp, 0]
    );
    res.status(201).json({ id, userId, mensagem, timestamp, lida: 0 });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/notificacoes/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const db = await dbPromise;

    const employee = await db.get('SELECT role FROM funcionarios WHERE user_id = ?', [userId]);
    const isAdministrator = employee && (employee.role === 'admin' || employee.role === 'manager');

    let query = '';
    let params = [];

    if (isAdministrator) {
      query = `SELECT * FROM notificacoes WHERE isAdminNotification = 1 OR (userId = ? AND isAdminNotification = 0) ORDER BY timestamp DESC`;
      params = [userId];
    } else {
      query = `SELECT * FROM notificacoes WHERE userId = ? AND isAdminNotification = 0 ORDER BY timestamp DESC`;
      params = [userId];
    }
    
    const notificacoes = await db.all(query, params);
    res.json(notificacoes);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/notificacoes/:id/lida', async (req, res) => {
  const notificationId = req.params.id;
  try {
    const db = await dbPromise;
    const result = await db.run('UPDATE notificacoes SET lida = 1 WHERE id = ?', [notificationId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    res.status(200).json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/notificacoes/:id', async (req, res) => {
  const notificationId = req.params.id;
  try {
    const db = await dbPromise;
    const result = await db.run('DELETE FROM notificacoes WHERE id = ?', [notificationId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/timerecords/user/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { startDate, endDate } = req.query;

  try {
    const db = await dbPromise;
    let query = 'SELECT * FROM registros_ponto WHERE userId = ?';
    const params = [userId];

    if (startDate && endDate) {
      query += ' AND timestamp BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY timestamp ASC';

    const records = await db.all(query, params);
    res.json(records);
  } catch (error) {
    console.error(`Error fetching time records for user ${userId}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});