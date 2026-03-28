const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  year: {
    type: String,
    required: true,
    enum: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
  },
  courseType: {
    type: String,
    required: true,
    enum: ['Full', 'Half'],
  },
  creditHours: {
    type: Number,
    required: true,
  },
  grade: {
    type: String,
    required: true,
  },
  gradePoints: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Course', courseSchema);
