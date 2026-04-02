// UNZA Current Course Grading System
// Grade points per full course (half course = half these values)
const GRADE_MAP = {
  'A+': 5,   // 90–100%
  'A':  4,   // 80–89%
  'B+': 3,   // 70–79%
  'B':  2,   // 60–69%
  'C+': 1,   // 50–59%
  'C':  0,   // 45–49%
};

// Proposed Degree Classification (GPA-based)
const CLASSIFICATIONS = {
  distinction: { label: 'Distinction',  minGPA: 3.75 },
  merit:       { label: 'Meritorious',  minGPA: 3.25 },
  credit:      { label: 'Credit',       minGPA: 2.68 },
  pass:        { label: 'Pass',         minGPA: 0 },
};

module.exports = { GRADE_MAP, CLASSIFICATIONS };
