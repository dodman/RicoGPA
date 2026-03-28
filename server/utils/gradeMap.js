// Grade to grade-point mapping
// Edit this file to change the grading scale
const GRADE_MAP = {
  'A+': 5.0,
  'A':  5.0,
  'B+': 4.0,
  'B':  3.0,
  'C+': 2.0,
  'C':  1.0,
  'D':  0.5,
  'F':  0.0,
};

// Classification thresholds
const CLASSIFICATIONS = {
  distinction: { label: 'Distinction', minGPA: 4.0 },
  merit:       { label: 'Merit',       minGPA: 3.0 },
  credit:      { label: 'Credit',      minGPA: 2.0 },
  pass:        { label: 'Pass',        minGPA: 1.0 },
};

module.exports = { GRADE_MAP, CLASSIFICATIONS };
