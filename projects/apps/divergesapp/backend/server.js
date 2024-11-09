import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PGlite } from "@electric-sql/pglite";
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const postgres = new PGlite("./db");

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// File storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './storage')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Helper functions
const generateToken = (user) => {
  return jwt.sign({ uid: user.uid, email: user.email, user_type: user.user_type }, JWT_SECRET, { expiresIn: '1d' });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Authentication routes
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name, user_type } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO users (uid, email, password_hash, full_name, user_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [uid, email, hashedPassword, full_name, user_type, now, now]
    );

    const user = result[0];
    const token = generateToken(user);

    res.status(201).json({ token, user: { uid: user.uid, email: user.email, user_type: user.user_type } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await postgres.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token, user: { uid: user.uid, email: user.email, user_type: user.user_type } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User routes
app.get('/users/:user_uid/profile', authenticateJWT, async (req, res) => {
  try {
    const { user_uid } = req.params;
    const result = await postgres.query("SELECT * FROM user_profiles WHERE user_uid = $1", [user_uid]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/users/:user_uid/profile', authenticateJWT, async (req, res) => {
  try {
    const { user_uid } = req.params;
    const { profile_picture_url, bio, grade_level, subjects_taught, contact_information } = req.body;

    const result = await postgres.query(
      "UPDATE user_profiles SET profile_picture_url = $1, bio = $2, grade_level = $3, subjects_taught = $4, contact_information = $5 WHERE user_uid = $6 RETURNING *",
      [profile_picture_url, bio, grade_level, JSON.stringify(subjects_taught), JSON.stringify(contact_information), user_uid]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Course routes
app.post('/courses', authenticateJWT, async (req, res) => {
  try {
    const { name, description, grade_level, subject } = req.body;
    const teacher_uid = req.user.uid;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO courses (uid, teacher_uid, name, description, grade_level, subject, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [uid, teacher_uid, name, description, grade_level, subject, now, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/courses', authenticateJWT, async (req, res) => {
  try {
    const result = await postgres.query("SELECT * FROM courses");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/courses/:course_uid', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const result = await postgres.query("SELECT * FROM courses WHERE uid = $1", [course_uid]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/courses/:course_uid', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const { name, description, grade_level, subject } = req.body;
    const now = Date.now();

    const result = await postgres.query(
      "UPDATE courses SET name = $1, description = $2, grade_level = $3, subject = $4, updated_at = $5 WHERE uid = $6 RETURNING *",
      [name, description, grade_level, subject, now, course_uid]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/courses/:course_uid', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    await postgres.query("DELETE FROM courses WHERE uid = $1", [course_uid]);
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Module routes
app.post('/courses/:course_uid/modules', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const { name, description, order_index, prerequisites } = req.body;
    const uid = uuidv4();

    const result = await postgres.query(
      "INSERT INTO modules (uid, course_uid, name, description, order_index, prerequisites) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [uid, course_uid, name, description, order_index, JSON.stringify(prerequisites)]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/courses/:course_uid/modules', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const result = await postgres.query("SELECT * FROM modules WHERE course_uid = $1 ORDER BY order_index", [course_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Content routes
app.post('/modules/:module_uid/content', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    const { module_uid } = req.params;
    const { title, description, content_type, is_mandatory } = req.body;
    const file_url = req.file ? `/storage/${req.file.filename}` : null;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO content_items (uid, module_uid, title, description, content_type, file_url, order_index, is_mandatory, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
      [uid, module_uid, title, description, content_type, file_url, 0, is_mandatory, now, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/modules/:module_uid/content', authenticateJWT, async (req, res) => {
  try {
    const { module_uid } = req.params;
    const result = await postgres.query("SELECT * FROM content_items WHERE module_uid = $1 ORDER BY order_index", [module_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assignment routes
app.post('/courses/:course_uid/assignments', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const { title, description, due_date, max_score, submission_type } = req.body;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO assignments (uid, course_uid, title, description, due_date, max_score, submission_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [uid, course_uid, title, description, due_date, max_score, submission_type, now, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/courses/:course_uid/assignments', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const result = await postgres.query("SELECT * FROM assignments WHERE course_uid = $1", [course_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/assignments/:assignment_uid/submit', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    const { assignment_uid } = req.params;
    const { submission_text } = req.body;
    const student_uid = req.user.uid;
    const file_url = req.file ? `/storage/${req.file.filename}` : null;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO submissions (uid, assignment_uid, student_uid, submission_text, file_url, submitted_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [uid, assignment_uid, student_uid, submission_text, file_url, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/assignments/:assignment_uid/grade', authenticateJWT, async (req, res) => {
  try {
    const { assignment_uid } = req.params;
    const { submission_uid, score, feedback } = req.body;
    const graded_by_uid = req.user.uid;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO grades (uid, submission_uid, graded_by_uid, score, feedback, graded_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [uid, submission_uid, graded_by_uid, score, feedback, now]
    );

    res.status(200).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Progress tracking
app.get('/students/:student_uid/progress', authenticateJWT, async (req, res) => {
  try {
    const { student_uid } = req.params;
    const result = await postgres.query(`
      SELECT c.uid AS course_uid, c.name AS course_name, m.uid AS module_uid, m.name AS module_name,
             ci.uid AS content_item_uid, ci.title AS content_item_title, sp.status, sp.completion_date
      FROM course_enrollments ce
      JOIN courses c ON ce.course_uid = c.uid
      JOIN modules m ON m.course_uid = c.uid
      JOIN content_items ci ON ci.module_uid = m.uid
      LEFT JOIN student_progress sp ON sp.student_uid = ce.student_uid AND sp.content_item_uid = ci.uid
      WHERE ce.student_uid = $1
      ORDER BY c.uid, m.order_index, ci.order_index
    `, [student_uid]);

    const progress = result.reduce((acc, row) => {
      if (!acc[row.course_uid]) {
        acc[row.course_uid] = { uid: row.course_uid, name: row.course_name, modules: {} };
      }
      if (!acc[row.course_uid].modules[row.module_uid]) {
        acc[row.course_uid].modules[row.module_uid] = { uid: row.module_uid, name: row.module_name, content_items: [] };
      }
      acc[row.course_uid].modules[row.module_uid].content_items.push({
        uid: row.content_item_uid,
        title: row.content_item_title,
        status: row.status || 'not_started',
        completion_date: row.completion_date
      });
      return acc;
    }, {});

    res.json({ courses: Object.values(progress) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Message routes
app.post('/messages', authenticateJWT, async (req, res) => {
  try {
    const { recipient_uid, subject, body } = req.body;
    const sender_uid = req.user.uid;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO messages (uid, sender_uid, recipient_uid, subject, body, sent_at, read_at) VALUES ($1, $2, $3, $4, $5, $6, NULL) RETURNING *",
      [uid, sender_uid, recipient_uid, subject, body, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/messages', authenticateJWT, async (req, res) => {
  try {
    const user_uid = req.user.uid;
    const result = await postgres.query("SELECT * FROM messages WHERE recipient_uid = $1 OR sender_uid = $1 ORDER BY sent_at DESC", [user_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Announcement routes
app.post('/courses/:course_uid/announcements', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const { title, content } = req.body;
    const teacher_uid = req.user.uid;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO announcements (uid, course_uid, teacher_uid, title, content, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [uid, course_uid, teacher_uid, title, content, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/courses/:course_uid/announcements', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const result = await postgres.query("SELECT * FROM announcements WHERE course_uid = $1 ORDER BY created_at DESC", [course_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notification routes
app.get('/notifications', authenticateJWT, async (req, res) => {
  try {
    const user_uid = req.user.uid;
    const result = await postgres.query("SELECT * FROM notifications WHERE user_uid = $1 ORDER BY created_at DESC", [user_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/notifications/:notification_uid/read', authenticateJWT, async (req, res) => {
  try {
    const { notification_uid } = req.params;
    const result = await postgres.query("UPDATE notifications SET is_read = true WHERE uid = $1 RETURNING *", [notification_uid]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calendar event routes
app.post('/calendar-events', authenticateJWT, async (req, res) => {
  try {
    const { title, description, start_time, end_time, event_type } = req.body;
    const user_uid = req.user.uid;
    const uid = uuidv4();

    const result = await postgres.query(
      "INSERT INTO calendar_events (uid, user_uid, title, description, start_time, end_time, event_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [uid, user_uid, title, description, start_time, end_time, event_type]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/calendar-events', authenticateJWT, async (req, res) => {
  try {
    const user_uid = req.user.uid;
    const result = await postgres.query("SELECT * FROM calendar_events WHERE user_uid = $1 ORDER BY start_time", [user_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forum routes
app.post('/courses/:course_uid/forum', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const { content } = req.body;
    const user_uid = req.user.uid;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO forum_posts (uid, forum_uid, user_uid, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [uid, course_uid, user_uid, content, now, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/courses/:course_uid/forum', authenticateJWT, async (req, res) => {
  try {
    const { course_uid } = req.params;
    const result = await postgres.query("SELECT * FROM forum_posts WHERE forum_uid = $1 ORDER BY created_at DESC", [course_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/forum-posts/:post_uid/replies', authenticateJWT, async (req, res) => {
  try {
    const { post_uid } = req.params;
    const { content } = req.body;
    const user_uid = req.user.uid;
    const uid = uuidv4();
    const now = Date.now();

    const result = await postgres.query(
      "INSERT INTO forum_replies (uid, post_uid, user_uid, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [uid, post_uid, user_uid, content, now, now]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/forum-posts/:post_uid/replies', authenticateJWT, async (req, res) => {
  try {
    const { post_uid } = req.params;
    const result = await postgres.query("SELECT * FROM forum_replies WHERE post_uid = $1 ORDER BY created_at", [post_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parent-teacher meeting routes
app.post('/parent-teacher-meetings', authenticateJWT, async (req, res) => {
  try {
    const { teacher_uid, guardian_uid, student_uid, scheduled_time, duration, status, notes } = req.body;
    const uid = uuidv4();

    const result = await postgres.query(
      "INSERT INTO parent_teacher_meetings (uid, teacher_uid, guardian_uid, student_uid, scheduled_time, duration, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [uid, teacher_uid, guardian_uid, student_uid, scheduled_time, duration, status, notes]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/parent-teacher-meetings', authenticateJWT, async (req, res) => {
  try {
    const user_uid = req.user.uid;
    const user_type = req.user.user_type;

    let query;
    if (user_type === 'teacher') {
      query = "SELECT * FROM parent_teacher_meetings WHERE teacher_uid = $1 ORDER BY scheduled_time";
    } else if (user_type === 'guardian') {
      query = "SELECT * FROM parent_teacher_meetings WHERE guardian_uid = $1 ORDER BY scheduled_time";
    } else {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const result = await postgres.query(query, [user_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Learning analytics routes
app.get('/learning-analytics/:user_uid', authenticateJWT, async (req, res) => {
  try {
    const { user_uid } = req.params;
    const result = await postgres.query("SELECT * FROM learning_analytics WHERE user_uid = $1 ORDER BY timestamp DESC", [user_uid]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection
io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    jwt.verify(socket.handshake.query.token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.decoded = decoded;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }
}).on('connection', (socket) => {
  console.log('WebSocket connected');

  socket.on('new_message', async (data) => {
    try {
      const { recipient_uid, subject, body } = data;
      const sender_uid = socket.decoded.uid;
      const uid = uuidv4();
      const now = Date.now();

      const result = await postgres.query(
        "INSERT INTO messages (uid, sender_uid, recipient_uid, subject, body, sent_at, read_at) VALUES ($1, $2, $3, $4, $5, $6, NULL) RETURNING *",
        [uid, sender_uid, recipient_uid, subject, body, now]
      );

      const newMessage = result[0];
      socket.emit('new_message', newMessage);
      socket.to(recipient_uid).emit('new_message', newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('progress_update', async (data) => {
    try {
      const { student_uid, content_item_uid, status, completion_date } = data;
      const uid = uuidv4();

      const result = await postgres.query(
        "INSERT INTO student_progress (uid, student_uid, content_item_uid, status, completion_date) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_uid, content_item_uid) DO UPDATE SET status = $4, completion_date = $5 RETURNING *",
        [uid, student_uid, content_item_uid, status, completion_date]
      );

      const updatedProgress = result[0];
      socket.emit('progress_update', updatedProgress);
      socket.to(student_uid).emit('progress_update', updatedProgress);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });
});

// Serve static files from the 'storage' directory
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Start the server
const PORT = process.env.PORT || 1337;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});