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

// --- Auto-migrate: add columns if missing ---
async function ensureSchema() {
  const sql = getSQL();
  await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;
  await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false`;
  await sql`CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
  )`;
}
// Run migration on cold start + bootstrap admin
async function bootstrap() {
  await ensureSchema();
  // Ensure dodmanc@yahoo.com is always admin
  const sql = getSQL();
  const target = await sql`SELECT id, role FROM "User" WHERE email = 'dodmanc@yahoo.com'`;
  if (target.length > 0 && target[0].role !== 'admin') {
    await sql`UPDATE "User" SET role = 'admin' WHERE id = ${target[0].id}`;
    console.log('Bootstrapped admin: dodmanc@yahoo.com');
  }
}
bootstrap().catch(err => console.error('Bootstrap error:', err));

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

// --- Admin Middleware ---
function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, access denied' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
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

    const rows = await sql`INSERT INTO "User" (id, email, password, role, blocked, "createdAt") VALUES (${id}, ${email.toLowerCase()}, ${hashed}, 'user', false, NOW()) RETURNING id, email, role`;
    const user = rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
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

    if (user.blocked) return res.status(403).json({ message: 'Your account has been blocked. Contact an administrator.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role || 'user' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Auth: Get current user (refresh role) ---
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const sql = getSQL();
    const rows = await sql`SELECT id, email, role, blocked FROM "User" WHERE id = ${req.userId}`;
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];
    // Issue a fresh token with current role
    const token = jwt.sign({ id: user.id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role || 'user' } });
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

// =====================
// ADMIN ROUTES
// =====================

// Admin: Dashboard stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    const usersCount = await sql`SELECT COUNT(*)::int AS count FROM "User"`;
    const coursesCount = await sql`SELECT COUNT(*)::int AS count FROM courses`;
    const blockedCount = await sql`SELECT COUNT(*)::int AS count FROM "User" WHERE blocked = true`;
    const pendingResets = await sql`SELECT COUNT(*)::int AS count FROM password_resets WHERE status = 'pending'`;
    const recentUsers = await sql`SELECT id, email, role, blocked, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 5`;
    res.json({
      totalUsers: usersCount[0].count,
      totalCourses: coursesCount[0].count,
      blockedUsers: blockedCount[0].count,
      pendingResets: pendingResets[0].count,
      recentUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: List all users
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    const users = await sql`
      SELECT u.id, u.email, u.role, u.blocked, u."createdAt",
        (SELECT COUNT(*)::int FROM courses WHERE user_id = u.id) AS course_count
      FROM "User" u
      ORDER BY u."createdAt" DESC
    `;
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: View a specific user's courses
app.get('/api/admin/users/:id/courses', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    const user = await sql`SELECT id, email, role, blocked FROM "User" WHERE id = ${req.params.id}`;
    if (user.length === 0) return res.status(404).json({ message: 'User not found' });

    const courses = await sql`SELECT * FROM courses WHERE user_id = ${req.params.id} ORDER BY year ASC, "createdAt" DESC`;
    const mapped = courses.map(c => ({ ...c, creditHours: c.credit_hours, gradePoints: c.grade_points, courseType: c.course_type }));
    const { gpa, totalCredits } = calcGPA(courses);
    res.json({ user: user[0], courses: mapped, gpa, totalCredits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Block/unblock a user
app.put('/api/admin/users/:id/block', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    if (req.params.id === req.userId) return res.status(400).json({ message: 'Cannot block yourself' });
    const { blocked } = req.body;
    const rows = await sql`UPDATE "User" SET blocked = ${!!blocked} WHERE id = ${req.params.id} RETURNING id, email, role, blocked`;
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Change user role
app.put('/api/admin/users/:id/role', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    if (req.params.id === req.userId) return res.status(400).json({ message: 'Cannot change your own role' });
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const rows = await sql`UPDATE "User" SET role = ${role} WHERE id = ${req.params.id} RETURNING id, email, role, blocked`;
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Delete a user
app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    if (req.params.id === req.userId) return res.status(400).json({ message: 'Cannot delete yourself' });
    const rows = await sql`SELECT id FROM "User" WHERE id = ${req.params.id}`;
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    await sql`DELETE FROM courses WHERE user_id = ${req.params.id}`;
    await sql`DELETE FROM password_resets WHERE user_id = ${req.params.id}`;
    await sql`DELETE FROM "User" WHERE id = ${req.params.id}`;
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User: Request password reset
app.post('/api/auth/request-reset', auth, async (req, res) => {
  try {
    const sql = getSQL();
    const pending = await sql`SELECT id FROM password_resets WHERE user_id = ${req.userId} AND status = 'pending'`;
    if (pending.length > 0) return res.status(400).json({ message: 'You already have a pending reset request' });
    const id = crypto.randomUUID();
    await sql`INSERT INTO password_resets (id, user_id, status, "createdAt") VALUES (${id}, ${req.userId}, 'pending', NOW())`;
    res.status(201).json({ message: 'Password reset requested. An admin will review it.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: List password reset requests
app.get('/api/admin/resets', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    const resets = await sql`
      SELECT pr.id, pr.user_id, pr.status, pr."createdAt", u.email
      FROM password_resets pr
      JOIN "User" u ON u.id = pr.user_id
      ORDER BY pr."createdAt" DESC
    `;
    res.json(resets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Approve/reject password reset (sets password to a temporary one)
app.put('/api/admin/resets/:id', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid action' });

    const rows = await sql`SELECT pr.id, pr.user_id, pr.status, u.email FROM password_resets pr JOIN "User" u ON u.id = pr.user_id WHERE pr.id = ${req.params.id}`;
    if (rows.length === 0) return res.status(404).json({ message: 'Reset request not found' });
    if (rows[0].status !== 'pending') return res.status(400).json({ message: 'Already processed' });

    if (action === 'approve') {
      // Reset password to "Reset123"
      const tempPass = 'Reset123';
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(tempPass, salt);
      await sql`UPDATE "User" SET password = ${hashed} WHERE id = ${rows[0].user_id}`;
      await sql`UPDATE password_resets SET status = 'approved' WHERE id = ${req.params.id}`;
      res.json({ message: `Password reset to temporary password for ${rows[0].email}`, tempPassword: tempPass });
    } else {
      await sql`UPDATE password_resets SET status = 'rejected' WHERE id = ${req.params.id}`;
      res.json({ message: 'Reset request rejected' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Force reset a user's password directly
app.put('/api/admin/users/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const sql = getSQL();
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    const rows = await sql`UPDATE "User" SET password = ${hashed} WHERE id = ${req.params.id} RETURNING id, email`;
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `Password reset for ${rows[0].email}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = app;
