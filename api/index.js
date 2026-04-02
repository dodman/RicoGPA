const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { neon } = require('@neondatabase/serverless');
const { GRADE_MAP, CLASSIFICATIONS } = require('../server/utils/gradeMap');

// --- Database ---
let prisma;
function getDB() {
  if (!prisma) {
    const sql = neon(process.env.DATABASE_URL);
    const adapter = new PrismaNeon(sql);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

// --- Auth Middleware ---
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, access denied' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// --- GPA Helper ---
function calcGPA(courses) {
  if (courses.length === 0) return { gpa: 0, totalCredits: 0, totalPoints: 0 };
  let totalCredits = 0;
  let totalPoints = 0;
  for (const c of courses) {
    totalCredits += c.creditHours;
    totalPoints += c.gradePoints * c.creditHours;
  }
  return {
    gpa: totalCredits > 0 ? +(totalPoints / totalCredits).toFixed(4) : 0,
    totalCredits,
    totalPoints,
  };
}

// --- Express App ---
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api', (req, res) => res.json({
  status: 'RICOGPA API running',
  hasDB: !!process.env.DATABASE_URL,
  hasJWT: !!process.env.JWT_SECRET,
  envKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('JWT') || k.includes('VERCEL'))
}));

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = await db.user.create({ data: { email: email.toLowerCase(), password: hashed } });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', debug: err.message, code: err.code });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- GPA Routes (all protected) ---
app.get('/api/gpa/me', auth, async (req, res) => {
  try {
    const db = getDB();
    const courses = await db.course.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } });
    const { gpa, totalCredits } = calcGPA(courses);
    const byYear = {};
    for (const c of courses) {
      if (!byYear[c.year]) byYear[c.year] = [];
      byYear[c.year].push(c);
    }
    res.json({ gpa, totalCredits, totalCourses: courses.length, byYear });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gpa/courses', auth, async (req, res) => {
  try {
    const db = getDB();
    const courses = await db.course.findMany({ where: { userId: req.userId }, orderBy: [{ year: 'asc' }, { createdAt: 'desc' }] });
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/gpa/add-course', auth, async (req, res) => {
  try {
    const db = getDB();
    const { name, year, courseType, creditHours, grade } = req.body;
    if (!name || !year || !courseType || !creditHours || !grade) return res.status(400).json({ message: 'All fields are required' });

    const gradePoints = GRADE_MAP[grade];
    if (gradePoints === undefined) return res.status(400).json({ message: 'Invalid grade' });

    const course = await db.course.create({
      data: { userId: req.userId, name, year, courseType, creditHours: Number(creditHours), grade, gradePoints },
    });
    res.status(201).json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/gpa/course/:id', auth, async (req, res) => {
  try {
    const db = getDB();
    const course = await db.course.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await db.course.delete({ where: { id: req.params.id } });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gpa/forecast', auth, async (req, res) => {
  try {
    const db = getDB();
    const { target, remainingCredits } = req.query;
    const remaining = Number(remainingCredits) || 60;
    const classification = CLASSIFICATIONS[target];
    if (!classification) return res.status(400).json({ message: 'Invalid target. Use: pass, credit, merit, distinction' });

    const courses = await db.course.findMany({ where: { userId: req.userId } });
    const { gpa, totalCredits, totalPoints } = calcGPA(courses);
    const targetGPA = classification.minGPA;
    const neededTotal = targetGPA * (totalCredits + remaining);
    const neededPoints = neededTotal - totalPoints;
    const neededGPA = remaining > 0 ? +(neededPoints / remaining).toFixed(4) : 0;

    let advice = '';
    if (neededGPA <= 0) {
      advice = `You have already reached ${classification.label}! Keep it up.`;
    } else if (neededGPA > 5.0) {
      advice = `Unfortunately, reaching ${classification.label} is not possible with ${remaining} remaining credits. Consider adding more credits or adjusting your target.`;
    } else {
      const sorted = Object.entries(GRADE_MAP).sort((a, b) => a[1] - b[1]);
      let gradeLabel = 'A+';
      for (const [label, pts] of sorted) {
        if (pts >= neededGPA) { gradeLabel = label; break; }
      }
      advice = `You need around a ${gradeLabel} average (${neededGPA} GPA) in your remaining ${remaining} credits to reach ${classification.label}.`;
    }

    res.json({ currentGPA: gpa, totalCredits, targetLabel: classification.label, targetGPA, remainingCredits: remaining, neededGPA, advice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = app;
