const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { neon } = require('@neondatabase/serverless');

// UNZA Current Course Grading System
const GRADE_MAP = {
  'A+':  5,   // 90-100%
  'A':   4,   // 80-89%
  'B+':  3,   // 70-79%
  'B':   2,   // 60-69%
  'C+':  1,   // 50-59%
  'C':   0,   // 45-49%
  'D+':  0,
  'D':   0,
  'NE':  0,
  'P':   0,
  'F':   0,
  'LT':  0,
  'INC': 0,
};
const CLASSIFICATIONS = {
  distinction: { label: 'Distinction',  minGPA: 3.75 },
  merit:       { label: 'Meritorious',  minGPA: 3.25 },
  credit:      { label: 'Credit',       minGPA: 2.68 },
  pass:        { label: 'Pass',         minGPA: 0 },
};

// --- Database ---
function getSQL() {
  return neon(process.env.DATABASE_URL);
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
// grade_points already = base_grade × units, so GPA = sum(grade_points) / sum(units)
function calcGPA(courses) {
  if (courses.length === 0) return { gpa: 0, totalCredits: 0, totalPoints: 0 };
  let totalCredits = 0;
  let totalPoints = 0;
  for (const c of courses) {
    totalCredits += c.credit_hours;
    totalPoints += c.grade_points;
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
app.get('/api', (req, res) => res.json({ status: 'RICOGPA API running' }));

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const sql = getSQL();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await sql`SELECT id FROM "User" WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) return res.status(400).json({ message: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();

    const rows = await sql`INSERT INTO "User" (id, email, password, "createdAt") VALUES (${id}, ${email.toLowerCase()}, ${hashed}, NOW()) RETURNING id, email`;
    const user = rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const sql = getSQL();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const rows = await sql`SELECT * FROM "User" WHERE email = ${email.toLowerCase()}`;
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });
    const user = rows[0];

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
    const sql = getSQL();
    const courses = await sql`SELECT * FROM courses WHERE user_id = ${req.userId} ORDER BY "createdAt" DESC`;
    const { gpa, totalCredits } = calcGPA(courses);
    const byYear = {};
    for (const c of courses) {
      if (!byYear[c.year]) byYear[c.year] = { courses: [], gpa: 0, totalCredits: 0 };
      byYear[c.year].courses.push({ ...c, creditHours: c.credit_hours, gradePoints: c.grade_points, courseType: c.course_type });
    }
    // Calculate GPA per year
    for (const year of Object.keys(byYear)) {
      const yearData = byYear[year];
      const yearCalc = calcGPA(yearData.courses.map(c => ({ credit_hours: c.creditHours, grade_points: c.gradePoints })));
      yearData.gpa = yearCalc.gpa;
      yearData.totalCredits = yearCalc.totalCredits;
    }
    res.json({ gpa, totalCredits, totalCourses: courses.length, byYear });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gpa/courses', auth, async (req, res) => {
  try {
    const sql = getSQL();
    const courses = await sql`SELECT * FROM courses WHERE user_id = ${req.userId} ORDER BY year ASC, "createdAt" DESC`;
    const mapped = courses.map(c => ({ ...c, creditHours: c.credit_hours, gradePoints: c.grade_points, courseType: c.course_type }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/gpa/add-course', auth, async (req, res) => {
  try {
    const sql = getSQL();
    const { name, year, courseType, creditHours, grade } = req.body;
    if (!name || !year || !courseType || !creditHours || !grade) return res.status(400).json({ message: 'All fields are required' });

    const basePoints = GRADE_MAP[grade];
    if (basePoints === undefined) return res.status(400).json({ message: 'Invalid grade' });

    // Grade points = base grade points × course units (Full=1, Half=0.5)
    const units = Number(creditHours);
    const gradePoints = basePoints * units;

    const id = crypto.randomUUID();
    const rows = await sql`INSERT INTO courses (id, user_id, name, year, course_type, credit_hours, grade, grade_points, "createdAt")
      VALUES (${id}, ${req.userId}, ${name}, ${year}, ${courseType}, ${units}, ${grade}, ${gradePoints}, NOW())
      RETURNING *`;
    const course = rows[0];
    res.status(201).json({ ...course, creditHours: course.credit_hours, gradePoints: course.grade_points, courseType: course.course_type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/gpa/course/:id — edit a course
app.put('/api/gpa/course/:id', auth, async (req, res) => {
  try {
    const sql = getSQL();
    const { name, year, courseType, creditHours, grade } = req.body;
    if (!name || !year || !courseType || !creditHours || !grade) return res.status(400).json({ message: 'All fields are required' });

    const basePoints = GRADE_MAP[grade];
    if (basePoints === undefined) return res.status(400).json({ message: 'Invalid grade' });

    const units = Number(creditHours);
    const gradePoints = basePoints * units;

    const existing = await sql`SELECT id FROM courses WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    if (existing.length === 0) return res.status(404).json({ message: 'Course not found' });

    const rows = await sql`UPDATE courses SET name = ${name}, year = ${year}, course_type = ${courseType}, credit_hours = ${units}, grade = ${grade}, grade_points = ${gradePoints} WHERE id = ${req.params.id} RETURNING *`;
    const course = rows[0];
    res.json({ ...course, creditHours: course.credit_hours, gradePoints: course.grade_points, courseType: course.course_type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/gpa/course/:id', auth, async (req, res) => {
  try {
    const sql = getSQL();
    const rows = await sql`SELECT id FROM courses WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    if (rows.length === 0) return res.status(404).json({ message: 'Course not found' });
    await sql`DELETE FROM courses WHERE id = ${req.params.id}`;
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gpa/forecast', auth, async (req, res) => {
  try {
    const sql = getSQL();
    const { target, remainingCredits } = req.query;
    const remaining = Number(remainingCredits) || 8;
    const classification = CLASSIFICATIONS[target];
    if (!classification) return res.status(400).json({ message: 'Invalid target. Use: pass, credit, merit, distinction' });

    const courses = await sql`SELECT * FROM courses WHERE user_id = ${req.userId}`;
    const { gpa, totalCredits, totalPoints } = calcGPA(courses);
    const targetGPA = classification.minGPA;
    const neededTotal = targetGPA * (totalCredits + remaining);
    const neededPoints = neededTotal - totalPoints;
    const neededGPA = remaining > 0 ? +(neededPoints / remaining).toFixed(4) : 0;

    // Find the minimum grade needed
    const GRADE_SCALE = [
      ['C', 0], ['C+', 1], ['B', 2], ['B+', 3], ['A', 4], ['A+', 5]
    ];

    let advice = '';
    if (neededGPA <= 0) {
      advice = `You have already reached ${classification.label}! Keep it up.`;
    } else if (neededGPA > 5.0) {
      advice = `Unfortunately, reaching ${classification.label} is not possible with ${remaining} remaining course units. Consider adding more courses or adjusting your target.`;
    } else {
      let gradeLabel = 'A+';
      for (const [label, pts] of GRADE_SCALE) {
        if (pts >= neededGPA) { gradeLabel = label; break; }
      }
      advice = `You need an average of ${gradeLabel} or better (${neededGPA.toFixed(2)} GPA) across your remaining ${remaining} course units to reach ${classification.label}.`;
    }

    res.json({
      currentGPA: gpa,
      totalCredits,
      totalPoints,
      targetLabel: classification.label,
      targetGPA,
      remainingCredits: remaining,
      neededGPA,
      advice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = app;
