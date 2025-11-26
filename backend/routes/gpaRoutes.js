const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const gradePointsMapFull = {
  "A+":5.0, "A":4.0, "B+":3.0, "B":2.0, "C+":1.0, "C":0.0
};
const gradePointsMapHalf = {
  "A+":2.5, "A":2.0, "B+":1.5, "B":1.0, "C+":0.5, "C":0.0
};

function getGradePoint(grade, type) {
  if (type === 'Half') return gradePointsMapHalf[grade] ?? 0;
  return gradePointsMapFull[grade] ?? 0;
}

/**
 * Add a course
 * grade is OPTIONAL – you can store future/planned courses without results.
 */
router.post('/add-course', authMiddleware, async (req, res) => {
  try {
    const { name, year, courseType, creditHours, grade } = req.body;
    if (!name || !year || !courseType || !creditHours) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const user = await User.findById(req.user.id);
    const courseData = {
      name,
      year,
      courseType,
      creditHours
    };

    if (grade) {
      courseData.grade = grade;
      courseData.gradePoint = getGradePoint(grade, courseType);
    }

    user.courses.push(courseData);
    await user.save();
    res.json({ msg: 'Course added', course: user.courses[user.courses.length - 1] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * NEW: get all courses for the logged-in user
 */
router.get('/courses', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ courses: user.courses || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * NEW: update a single course (edit fields / add grades)
 */
router.put('/course/:courseId', authMiddleware, async (req, res) => {
  try {
    const { name, year, courseType, creditHours, grade } = req.body;
    const user = await User.findById(req.user.id);
    const course = user.courses.id(req.params.courseId);
    if (!course) return res.status(404).json({ msg: 'Course not found' });

    if (name !== undefined) course.name = name;
    if (year !== undefined) course.year = year;
    if (courseType !== undefined) course.courseType = courseType;
    if (creditHours !== undefined) course.creditHours = creditHours;
    if (grade !== undefined) {
      course.grade = grade || null;
      if (grade) {
        course.gradePoint = getGradePoint(grade, course.courseType);
      } else {
        course.gradePoint = undefined;
      }
    }

    await user.save();
    res.json({ msg: 'Course updated', course });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GPA summary – uses ONLY courses with grades.
 * Planned courses (no grade) are ignored for GPA.
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const years = {};
    let totalQuality = 0;
    let totalCredits = 0;

    user.courses.forEach((c) => {
      if (typeof c.gradePoint !== 'number' || !c.grade) return; // skip planned courses
      const gp = c.gradePoint;
      const ch = c.creditHours || (c.courseType === 'Full' ? 3 : 1.5);
      const quality = gp * ch;
      totalQuality += quality;
      totalCredits += ch;

      if (!years[c.year]) years[c.year] = { quality: 0, credits: 0, courses: [] };
      years[c.year].quality += quality;
      years[c.year].credits += ch;
      years[c.year].courses.push(c);
    });

    const perYear = {};
    Object.keys(years).forEach((y) => {
      perYear[y] = {
        gpa: years[y].credits
          ? +(years[y].quality / years[y].credits).toFixed(2)
          : 0,
        credits: years[y].credits
      };
    });

    const cumulativeGPA = totalCredits
      ? +(totalQuality / totalCredits).toFixed(2)
      : 0;

    res.json({
      user: { name: user.name, email: user.email, isAdmin: user.isAdmin },
      perYear,
      cumulativeGPA,
      totalCredits
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * Forecast – already existed, kept the same behaviour.
 */
router.post('/forecast', authMiddleware, async (req, res) => {
  try {
    const { targetGPA, remainingCredits } = req.body;
    if (typeof targetGPA !== 'number' || typeof remainingCredits !== 'number') {
      return res.status(400).json({ msg: 'Invalid input' });
    }

    const user = await User.findById(req.user.id);
    let totalQuality = 0;
    let totalCredits = 0;

    user.courses.forEach((c) => {
      if (typeof c.gradePoint !== 'number' || !c.grade) return; // only completed courses
      const gp = c.gradePoint || 0;
      const ch = c.creditHours || (c.courseType === 'Full' ? 3 : 1.5);
      totalQuality += gp * ch;
      totalCredits += ch;
    });

    const requiredTotalQuality =
      targetGPA * (totalCredits + remainingCredits);
    const requiredRemainingQuality = requiredTotalQuality - totalQuality;
    const requiredAvgGP =
      remainingCredits > 0 ? requiredRemainingQuality / remainingCredits : 0;

    const gradeOrder = [
      { grade: 'A+', gp: 5.0 },
      { grade: 'A', gp: 4.0 },
      { grade: 'B+', gp: 3.0 },
      { grade: 'B', gp: 2.0 },
      { grade: 'C+', gp: 1.0 },
      { grade: 'C', gp: 0.0 }
    ];

    let recommendedGrade = 'A+';
    if (requiredAvgGP <= 0) recommendedGrade = 'C';
    else {
      recommendedGrade =
        gradeOrder.find((g) => g.gp >= requiredAvgGP)?.grade ?? 'A+';
    }

    res.json({
      requiredAvgGP: +requiredAvgGP.toFixed(2),
      recommendedGrade
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;