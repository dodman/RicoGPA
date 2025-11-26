import React, { useEffect, useState, useContext } from 'react';
import { API_BASE } from '../api';
import AuthContext from '../AuthContext';

export default function Courses() {
  const { auth } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/gpa/courses`, {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Failed to load courses');
        setCourses(data.courses || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    if (auth?.token) load();
  }, [auth]);

  function handleFieldChange(id, field, value) {
    setCourses((prev) =>
      prev.map((c) => (c._id === id ? { ...c, [field]: value } : c))
    );
  }

  async function saveCourse(course) {
    setSavingId(course._id);
    try {
      const res = await fetch(`${API_BASE}/gpa/course/${course._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          name: course.name,
          year: Number(course.year),
          courseType: course.courseType,
          creditHours: Number(course.creditHours),
          grade: course.grade || null // null / "" means planned, no grade yet
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Update failed');
      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? data.course : c))
      );
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not save changes');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="container">Loading courses…</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="container">
        <div className="card">No courses yet. Add some first.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>All Courses (planned + completed)</h2>
      <p style={{ fontSize: '13px' }}>
        Tip: first enter all courses from 1st year to final year (even without grades).
        When you finish a year, come back here and add the grades for the previous year.
      </p>

      {courses.map((c) => {
        const isPlanned = !c.grade;
        return (
          <div key={c._id} className="card">
            <p>
              <strong>Status:</strong> {isPlanned ? 'Planned (no grade yet)' : 'Completed'}
            </p>

            <label>
              Course name
              <input
                type="text"
                value={c.name || ''}
                onChange={(e) => handleFieldChange(c._id, 'name', e.target.value)}
              />
            </label>

            <label>
              Year of study
              <input
                type="number"
                value={c.year || ''}
                onChange={(e) => handleFieldChange(c._id, 'year', e.target.value)}
              />
            </label>

            <label>
              Course type
              <select
                value={c.courseType || 'Full'}
                onChange={(e) =>
                  handleFieldChange(c._id, 'courseType', e.target.value)
                }
              >
                <option value="Full">Full</option>
                <option value="Half">Half</option>
              </select>
            </label>

            <label>
              Credit hours
              <input
                type="number"
                step="0.5"
                value={c.creditHours || ''}
                onChange={(e) =>
                  handleFieldChange(c._id, 'creditHours', e.target.value)
                }
              />
            </label>

            <label>
              Grade (leave blank if not taken yet)
              <select
                value={c.grade || ''}
                onChange={(e) => handleFieldChange(c._id, 'grade', e.target.value)}
              >
                <option value="">(no grade yet)</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C+">C+</option>
                <option value="C">C</option>
              </select>
            </label>

            <button onClick={() => saveCourse(c)} disabled={savingId === c._id}>
              {savingId === c._id ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        );
      })}
    </div>
  );
}