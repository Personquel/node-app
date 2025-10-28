const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize database
const db = new sqlite3.Database('survey.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Questions table
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL
  )`);

  // Responses table
  db.run(`CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions (id)
  )`);

  // Insert sample user
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row.count === 0) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', 'password']);
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['user', '123']);
    }
  });

  // Insert sample questions
  db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
    if (row.count === 0) {
      const questions = [
        "How satisfied are you with our service?",
        "Would you recommend us to others?",
        "How often do you use our product?",
        "What is your age group?",
        "How did you hear about us?"
      ];
      
      questions.forEach(question => {
        db.run("INSERT INTO questions (question_text) VALUES (?)", [question]);
      });
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/welcome', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

app.get('/survey', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});

app.get('/summary', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'summary.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/api/questions', (req, res) => {
  db.all("SELECT * FROM questions LIMIT 5", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (row) {
      res.json({ message: 'Login successful', user: { id: row.id, username: row.username } });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  });
});

app.post('/api/responses', (req, res) => {
  const { responses } = req.body;
  
  if (!responses || !Array.isArray(responses)) {
    return res.status(400).json({ error: 'Invalid responses format' });
  }

  const stmt = db.prepare("INSERT INTO responses (question_id, answer) VALUES (?, ?)");
  
  responses.forEach(response => {
    stmt.run([response.question_id, response.answer]);
  });
  
  stmt.finalize((err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Responses saved successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});