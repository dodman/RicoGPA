import { useEffect, useState } from 'react';
import API from '../api';

export default function Courses() {
  const [courses, setCourses] = useState([]);

  const fetchCourses = () => {
    API.get('/api/gpa/courses').then((res) => setCourses(res.data));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    await API.delete(`/api/gpa/course/${id}`);
    fetchCourses();
  };

  // Group by year
  const byYear = {};
  for (const c of courses) {
    if (!byYear[c.year]) byYear[c.year] = [];
    byYear[c.year].push(c);
  }

  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

  return (
    <div>
      <h2>My Courses</h2>
      {courses.length === 0 && <p>No courses yet.</p>}
      {years.map((year) =>
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
                {byYear[year].map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.courseType}</td>
                    <td>{c.creditHours}</td>
                    <td>{c.grade}</td>
                    <td>{c.gradePoints}</td>
                    <td>
                      <button className="btn-delete" onClick={() => handleDelete(c._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null
      )}
    </div>
  );
}
