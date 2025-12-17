const express = require('express');
const cors = require('cors');
const dbPromise = require('./database');


const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// User creation endpoint
app.post('/api/users', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run('INSERT INTO usuarios (username, password) VALUES (?, ?)', [username, password]);
    
    res.status(201).json({ id: result.lastID, username });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Nome de usuário já existe' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
  }

  try {
    const db = await dbPromise;
    const user = await db.get('SELECT id, username, password FROM usuarios WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (password === user.password) {
      // Fetch the linked employee record
      const employee = await db.get('SELECT * FROM funcionarios WHERE user_id = ?', [user.id]);
      
      const { password: userPassword, ...userWithoutPassword } = user; // Renomeia a propriedade 'password' para userPassword antes de desestruturar
      
      // If an employee is linked, return the employee details as the main user object
      if (employee) {
        res.json({ message: 'Login successful', user: employee });
      } else {
        // If no employee is linked, return a basic user object
        // This is useful for an admin that isn't also an employee
        res.json({ message: 'Login successful', user: { id: user.id.toString(), name: user.username, role: 'admin', department: 'System' } });
      }
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const db = await dbPromise;
    const users = await db.all('SELECT id, username FROM usuarios');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Link user to employee
app.put('/api/employees/:id/link', async (req, res) => {
  const { userId } = req.body;
  const employeeId = req.params.id;

  if (userId === undefined) {
    return res.status(400).json({ error: 'ID de usuário é obrigatório' });
  }

  try {
    const db = await dbPromise;
    // Set the user_id for the employee. Use NULL to unlink.
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

// GET all employees, with their linked username if available
app.get('/api/employees', async (req, res) => {
  try {
    const db = await dbPromise;
    const employees = await db.all(`
      SELECT
        f.id,
        f.name,
        f.email,
        f.role,
        f.department,
        f.ctps,
        f.admissionDate,
        f.workScheduleTemplateId,
        f.user_id,
        u.username
      FROM funcionarios AS f
      LEFT JOIN usuarios AS u ON f.user_id = u.id
    `);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST a new employee
app.post('/api/employees', async (req, res) => {
  const { id, name, email, role, department, ctps, admissionDate, workScheduleTemplateId } = req.body;
  // Basic validation
  if (!id || !name || !role) {
    return res.status(400).json({ error: 'ID, nome e função são obrigatórios para um funcionário' });
  }

  try {
    const db = await dbPromise;

    // Check if an employee with the same ID already exists
    const existingEmployeeById = await db.get('SELECT id FROM funcionarios WHERE id = ?', [id]);
    if (existingEmployeeById) {
        return res.status(409).json({ error: 'Já existe um funcionário com este ID' });
    }

    // Check if an employee with the same email already exists
    const existingEmployeeByEmail = await db.get('SELECT id FROM funcionarios WHERE email = ?', [email]);
    if (existingEmployeeByEmail) {
        return res.status(409).json({ error: 'Já existe um funcionário com este e-mail' });
    }

    const result = await db.run(
      'INSERT INTO funcionarios (id, name, email, role, department, ctps, admissionDate, workScheduleTemplateId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, role, department, ctps, admissionDate, workScheduleTemplateId]
    );
    res.status(201).json({ id, name, email, role, department, ctps, admissionDate, workScheduleTemplateId });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT (update) an existing employee
app.put('/api/employees/:id', async (req, res) => {
  const employeeId = req.params.id;
  const { name, email, role, department, ctps, admissionDate, workScheduleTemplateId } = req.body;

  try {
    const db = await dbPromise;
    const result = await db.run(
      'UPDATE funcionarios SET name = ?, email = ?, role = ?, department = ?, ctps = ?, admissionDate = ?, workScheduleTemplateId = ? WHERE id = ?',
      [name, email, role, department, ctps, admissionDate, workScheduleTemplateId, employeeId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    res.status(200).json({ id: employeeId, name, email, role, department, ctps, admissionDate, workScheduleTemplateId });
  } catch (error) {
    console.error('Error updating employee:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Já existe um funcionário com este e-mail' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE an employee
app.delete('/api/employees/:id', async (req, res) => {
  const employeeId = req.params.id;

  try {
    const db = await dbPromise;
    const result = await db.run('DELETE FROM funcionarios WHERE id = ?', [employeeId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    res.status(204).send(); // No content for successful deletion
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET all work schedule templates
app.get('/api/work-schedule-templates', async (req, res) => {
  try {
    const db = await dbPromise;
    const templates = await db.all('SELECT * FROM modelos_horario_trabalho');
    res.json(templates);
  } catch (error) {
    console.error('Error fetching work schedule templates:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST a new work schedule template
app.post('/api/work-schedule-templates', async (req, res) => {
  const { id, name, workSchedule, saturdayWorkSchedule, weeklyRestDay } = req.body;
  if (!id || !name || !workSchedule || !weeklyRestDay) {
    return res.status(400).json({ error: 'ID, nome, jornada de trabalho e dia de descanso semanal são obrigatórios para um modelo de jornada' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run(
      'INSERT INTO modelos_horario_trabalho (id, name, workSchedule, saturdayWorkSchedule, weeklyRestDay) VALUES (?, ?, ?, ?, ?)',
      [id, name, workSchedule, saturdayWorkSchedule, weeklyRestDay]
    );
    res.status(201).json({ id, name, workSchedule, saturdayWorkSchedule, weeklyRestDay });
  } catch (error) {
    console.error('Error creating work schedule template:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Já existe um modelo de jornada com este ID' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT (update) an existing work schedule template
app.put('/api/work-schedule-templates/:id', async (req, res) => {
  const templateId = req.params.id;
  const { name, workSchedule, saturdayWorkSchedule, weeklyRestDay } = req.body;

  if (!name || !workSchedule || !weeklyRestDay) {
    return res.status(400).json({ error: 'Nome, jornada de trabalho e dia de descanso semanal são obrigatórios para atualização do modelo de jornada' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run(
      'UPDATE modelos_horario_trabalho SET name = ?, workSchedule = ?, saturdayWorkSchedule = ?, weeklyRestDay = ? WHERE id = ?',
      [name, workSchedule, saturdayWorkSchedule, weeklyRestDay, templateId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Modelo de jornada não encontrado' });
    }
    res.status(200).json({ id: templateId, name, workSchedule, saturdayWorkSchedule, weeklyRestDay });
  } catch (error) {
    console.error('Error updating work schedule template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE a work schedule template
app.delete('/api/work-schedule-templates/:id', async (req, res) => {
  const templateId = req.params.id;

  try {
    const db = await dbPromise;
    const result = await db.run('DELETE FROM modelos_horario_trabalho WHERE id = ?', [templateId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Modelo de jornada não encontrado' });
    }
    res.status(204).send(); // No content for successful deletion
  } catch (error) {
    console.error('Error deleting work schedule template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET all time records
app.get('/api/timerecords', async (req, res) => {
  try {
    const db = await dbPromise;
    const records = await db.all('SELECT * FROM registros_ponto');
    res.json(records);
  } catch (error) {
    console.error('Error fetching time records:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Import uuidv4 for generating IDs on the backend
const { v4: uuidv4 } = require('uuid');

// POST a new time record
app.post('/api/timerecords', async (req, res) => {
  const { userId, timestamp, type } = req.body;
  if (!userId || !timestamp || !type) {
    return res.status(400).json({ error: 'ID do usuário, registro de tempo e tipo são obrigatórios' });
  }

  try {
    const db = await dbPromise;
    const id = uuidv4(); // Generate a unique ID for the new record
    const result = await db.run(
      'INSERT INTO registros_ponto (id, userId, timestamp, type) VALUES (?, ?, ?, ?)',
      [id, userId, timestamp, type]
    );
    res.status(201).json({ id, userId, timestamp, type });
  } catch (error) {
    console.error('Error creating time record:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT (update) an existing time record
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

// DELETE a time record
app.delete('/api/timerecords/:id', async (req, res) => {
  const recordId = req.params.id;

  try {
    const db = await dbPromise;
    const result = await db.run('DELETE FROM registros_ponto WHERE id = ?', [recordId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Registro de ponto não encontrado' });
    }
    res.status(204).send(); // No content for successful deletion
  } catch (error) {
    console.error('Error deleting time record:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// --- Notification Endpoints ---

// POST a new notification
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
      [id, userId, mensagem, timestamp, 0] // 0 for unread
    );
    res.status(201).json({ id, userId, mensagem, timestamp, lida: 0 });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET notifications for a specific user
app.get('/api/notificacoes/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const db = await dbPromise;
    const notificacoes = await db.all('SELECT * FROM notificacoes WHERE userId = ? ORDER BY timestamp DESC', [userId]);
    res.json(notificacoes);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT (mark as read) a notification
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

// DELETE a notification
app.delete('/api/notificacoes/:id', async (req, res) => {
  const notificationId = req.params.id;
  try {
    const db = await dbPromise;
    const result = await db.run('DELETE FROM notificacoes WHERE id = ?', [notificationId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    res.status(204).send(); // No content for successful deletion
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});