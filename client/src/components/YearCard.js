export default function YearCard({ year, courses, yearGPA, yearCredits }) {
  const classify =
    yearGPA >= 4.0 ? 'Distinction' :
    yearGPA >= 3.0 ? 'Merit' :
    yearGPA >= 2.0 ? 'Credit' :
    yearGPA >= 1.0 ? 'Pass' : 'Below Pass';

  return (
    <div className="year-card">
      <div className="year-header">
        <h3>{year}</h3>
        <div className="year-stats">
          <span className="year-gpa">GPA: <strong>{yearGPA.toFixed(2)}</strong></span>
          <span className="badge">{classify}</span>
          <span className="year-credits">{yearCredits} credits</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Course</th>
            <th>Type</th>
            <th>Credits</th>
            <th>Grade</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.courseType}</td>
              <td>{c.creditHours}</td>
              <td>{c.grade}</td>
              <td>{c.gradePoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
