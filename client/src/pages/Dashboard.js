import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import API from '../api';
import YearCard from '../components/YearCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get('/api/gpa/me').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="loading">Loading dashboard...</div>;

  const classification =
    data.gpa >= 4.0 ? 'Distinction' :
    data.gpa >= 3.0 ? 'Merit' :
    data.gpa >= 2.0 ? 'Credit' :
    data.gpa >= 1.0 ? 'Pass' : 'Below Pass';

  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

  return (
    <div>
      <h2>Welcome, {user.email}</h2>

      <div className="summary-cards">
        <div className="card">
          <h3>Cumulative GPA</h3>
          <p className="big-number">{data.gpa.toFixed(2)}</p>
          <span className="badge">{classification}</span>
        </div>
        <div className="card">
          <h3>Total Credits</h3>
          <p className="big-number">{data.totalCredits}</p>
        </div>
        <div className="card">
          <h3>Total Courses</h3>
          <p className="big-number">{data.totalCourses}</p>
        </div>
      </div>

      <h2>Courses by Year</h2>
      {years.map((year) =>
        data.byYear[year] && data.byYear[year].courses.length > 0 ? (
          <YearCard
            key={year}
            year={year}
            courses={data.byYear[year].courses}
            yearGPA={data.byYear[year].gpa}
            yearCredits={data.byYear[year].totalCredits}
          />
        ) : null
      )}
      {data.totalCourses === 0 && <p>No courses added yet. Go to Add Course to get started.</p>}
    </div>
  );
}
