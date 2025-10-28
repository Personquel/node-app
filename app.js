require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3000;

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
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'text',
    options TEXT
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
        {
          text: "How satisfied are you with our service?",
          type: "multiple_choice",
          options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]
        },
        {
          text: "Would you recommend us to others?",
          type: "multiple_choice",
          options: ["Definitely Yes", "Probably Yes", "Maybe", "Probably No", "Definitely No"]
        },
        {
          text: "How often do you use our product?",
          type: "multiple_choice",
          options: ["Daily", "Weekly", "Monthly", "Rarely", "Never"]
        },
        { text: "What is your age group?", type: "text" },
        { text: "How did you hear about us?", type: "text" },
        { text: "What features do you use most?", type: "text" },
        { text: "How would you rate our customer support?", type: "text" },
        { text: "What improvements would you suggest?", type: "text" },
        { text: "How likely are you to continue using our service?", type: "text" },
        { text: "What is your overall experience rating?", type: "text" }
      ];
      
      questions.forEach(question => {
        const options = question.options ? JSON.stringify(question.options) : null;
        db.run("INSERT INTO questions (question_text, question_type, options) VALUES (?, ?, ?)", 
               [question.text, question.type, options]);
      });
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

app.get('/welcome', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

app.get('/survey', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/summary', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'summary.html'));
});

app.get('/api/questions', (req, res) => {
  const type = req.query.type || 'quick';
  let limit = 3;
  
  if (type === 'details') limit = 10;
  else if (type === 'custom') limit = 5;
  
  db.all(`SELECT * FROM questions LIMIT ${limit}`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/responses', (req, res) => {
  const { responses, isCustomSurvey } = req.body;
  
  if (!responses || !Array.isArray(responses)) {
    return res.status(400).json({ error: 'Invalid responses format' });
  }

  const stmt = db.prepare("INSERT INTO responses (question_id, answer) VALUES (?, ?)");
  
  responses.forEach(response => {
    if (isCustomSurvey) {
      stmt.run([0, `Custom: ${response.question_text} - ${response.answer}`]);
    } else {
      stmt.run([response.question_id, response.answer]);
    }
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