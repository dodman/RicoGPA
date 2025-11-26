const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  name: String,
  year: Number,
  courseType: { type: String, enum: ['Full','Half'], default: 'Full' },
  creditHours: Number,
  grade: String,
  gradePoint: Number
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false },
  courses: [CourseSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
