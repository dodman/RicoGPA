import React, { useState, useContext } from 'react';
import { API_BASE } from '../api';
import AuthContext from '../AuthContext';

export default function AddCourse() {
  const { auth } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [courseType, setCourseType] = useState('Full');
  const [creditHours, setCreditHours] = useState('3'); // default Full
  const [grade, setGrade] = useState(''); // blank = planned, no result yet
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function handleCourseTypeChange(e) {
    const value = e.target.value;
    setCourseType(value);
    if (value === 'Full') setCreditHours('3');
    else setCreditHours('1.5');
  }

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!name || !year || !creditHours) {
      setError('Fill in course name, year and credit hours');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/gpa/add-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          name,
          year: Number(year),
          courseType,
          creditHours: Number(creditHours),
          grade: grade || null // null / "" = no grade yet (future course)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Could not add course');

      setMsg('Course added successfully');
      setName('');
      setYear('');
      setCourseType('Full');
      setCreditHours('3');
      setGrade('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h2>Add Course</h2>
      <p style={{ fontSize: '13px' }}>
        Step 1: add all courses from 1st year to final year. For future years, leave grade empty.
        Later, when you complete a year, come back and fill in the grades.
      </p>

      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <form onSubmit={submit} className="card form-card">
        <label>
          Course name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SOB 1040"
          />
        </label>

        <label>
          Year of study
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="1, 2, 3, 4"
          />
        </label>

        <label>
          Course type
          <select value={courseType} onChange={handleCourseTypeChange}>
            <option value="Full">Full</option>
            <option value="Half">Half</option>
          </select>
        </label>

        <label>
          Credit hours (auto)
          <input type="number" step="0.5" value={creditHours} readOnly />
        </label>

        <label>
          Grade (leave blank if you don&apos;t have results yet)
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">(no grade yet)</option>
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B+">B+</option>
            <option value="B">B</option>
            <option value="C+">C+</option>
            <option value="C">C</option>
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Add course'}
        </button>
      </form>
    </div>
  );
}