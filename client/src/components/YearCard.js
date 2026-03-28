export default function YearCard({ year, courses }) {
  return (
    <div className="year-card">
      <h3>{year}</h3>
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
            <tr key={c._id}>
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
