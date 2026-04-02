import { useEffect, useState } from 'react';
import API from '../api';

const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [editing, setEditing] = useState(null); // course id being edited
  const [editForm, setEditForm] = useState({});

  const fetchCourses = () => {
    API.get('/api/gpa/courses').then((res) => setCourses(res.data));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      await API.delete(`/api/gpa/course/${id}`);
      fetchCourses();
    } catch (err) {
      alert('Failed to delete course');
    }
  };

  const startEdit = (course) => {
    setEditing(course.id);
    setEditForm({
      name: course.name,
      year: course.year,
      courseType: course.courseType,
      creditHours: course.creditHours,
      grade: course.grade,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = async (id) => {
    try {
      await API.put(`/api/gpa/course/${id}`, {
        ...editForm,
        creditHours: Number(editForm.creditHours),
      });
      setEditing(null);
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update course');
    }
  };

  // Group by year
  const byYear = {};
  for (const c of courses) {
    if (!byYear[c.year]) byYear[c.year] = [];
    byYear[c.year].push(c);
  }

  return (
    <div>
      <h2>My Courses</h2>
      {courses.length === 0 && <p>No courses yet.</p>}
      {YEARS.map((year) =>
        byYear[year] ? (
          <div key={year} className="year-card">
            <h3>{year}</h3>
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Type</th>
                  <th>Credits</th>
                  <th>Grade</th>
                  <th>Points</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {byYear[year].map((c) =>
                  editing === c.id ? (
                    <tr key={c.id}>
                      <td>
                        <input name="name" value={editForm.name} onChange={handleEditChange} />
                      </td>
                      <td>
                        <select name="courseType" value={editForm.courseType} onChange={handleEditChange}>
                          <option value="Full">Full</option>
                          <option value="Half">Half</option>
                        </select>
                      </td>
                      <td>
                        <input name="creditHours" type="number" value={editForm.creditHours} onChange={handleEditChange} min="1" style={{width: '60px'}} />
                      </td>
                      <td>
                        <select name="grade" value={editForm.grade} onChange={handleEditChange}>
                          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td>-</td>
                      <td className="action-btns">
                        <button className="btn-save" onClick={() => saveEdit(c.id)}>Save</button>
                        <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.courseType}</td>
                      <td>{c.creditHours}</td>
                      <td>{c.grade}</td>
                      <td>{c.gradePoints}</td>
                      <td className="action-btns">
                        <button className="btn-edit" onClick={() => startEdit(c)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(c.id)}>Delete</button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : null
      )}
    </div>
  );
}
