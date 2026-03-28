const express = require('express');
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const { GRADE_MAP, CLASSIFICATIONS } = require('../utils/gradeMap');

const router = express.Router();

// All routes below require authentication
router.use(auth);

// Helper: calculate GPA from a list of courses
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

// GET /api/gpa/me — dashboard summary
router.get('/me', async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.userId }).sort({ createdAt: -1 });
    const { gpa, totalCredits } = calcGPA(courses);

    // Group by year
    const byYear = {};
    for (const c of courses) {
      if (!byYear[c.year]) byYear[c.year] = [];
      byYear[c.year].push(c);
    }

    res.json({
      gpa,
      totalCredits,
      totalCourses: courses.length,
      byYear,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/gpa/courses — all courses for user
router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.userId }).sort({ year: 1, createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/gpa/add-course
router.post('/add-course', async (req, res) => {
  try {
    const { name, year, courseType, creditHours, grade } = req.body;

    if (!name || !year || !courseType || !creditHours || !grade) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const gradePoints = GRADE_MAP[grade];
    if (gradePoints === undefined) {
      return res.status(400).json({ message: 'Invalid grade' });
    }

    const course = await Course.create({
      userId: req.userId,
      name,
      year,
      courseType,
      creditHours: Number(creditHours),
      grade,
      gradePoints,
    });

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/gpa/course/:id
router.delete('/course/:id', async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, userId: req.userId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    await course.deleteOne();
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/gpa/forecast?target=distinction&remainingCredits=60
router.get('/forecast', async (req, res) => {
  try {
    const { target, remainingCredits } = req.query;
    const remaining = Number(remainingCredits) || 60;

    const classification = CLASSIFICATIONS[target];
    if (!classification) {
      return res.status(400).json({ message: 'Invalid target. Use: pass, credit, merit, distinction' });
    }

    const courses = await Course.find({ userId: req.userId });
    const { gpa, totalCredits, totalPoints } = calcGPA(courses);

    const targetGPA = classification.minGPA;
    const neededTotal = targetGPA * (totalCredits + remaining);
    const neededPoints = neededTotal - totalPoints;
    const neededGPA = remaining > 0 ? +(neededPoints / remaining).toFixed(4) : 0;

    // Find the closest grade label for advice
    let advice = '';
    if (neededGPA <= 0) {
      advice = `You have already reached ${classification.label}! Keep it up.`;
    } else if (neededGPA > 5.0) {
      advice = `Unfortunately, reaching ${classification.label} is not possible with ${remaining} remaining credits. Consider adding more credits or adjusting your target.`;
    } else {
      // Find the minimum grade needed
      const sorted = Object.entries(GRADE_MAP).sort((a, b) => a[1] - b[1]);
      let gradeLabel = 'A+';
      for (const [label, pts] of sorted) {
        if (pts >= neededGPA) {
          gradeLabel = label;
          break;
        }
      }
      advice = `You need around a ${gradeLabel} average (${neededGPA} GPA) in your remaining ${remaining} credits to reach ${classification.label}.`;
    }

    res.json({
      currentGPA: gpa,
      totalCredits,
      targetLabel: classification.label,
      targetGPA,
      remainingCredits: remaining,
      neededGPA,
      advice,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
