import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
const TYPES = ['Full', 'Half'];

export default function AddCourse() {
  const [form, setForm] = useState({
    name: '',
    year: 'Year 1',
    courseType: 'Full',
    creditHours: '',
    grade: 'A+',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await API.post('/api/gpa/add-course', {
        ...form,
        creditHours: Number(form.creditHours),
      });
      setSuccess('Course added!');
      setForm({ name: '', year: 'Year 1', courseType: 'Full', creditHours: '', grade: 'A+' });
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add course');
    }
  };

  return (
    <div className="auth-page">
      <h2>Add Course</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Course Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <select name="year" value={form.year} onChange={handleChange}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select name="courseType" value={form.courseType} onChange={handleChange}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          name="creditHours"
          type="number"
          placeholder="Credit Hours"
          value={form.creditHours}
          onChange={handleChange}
          min="1"
          required
        />
        <select name="grade" value={form.grade} onChange={handleChange}>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button type="submit" className="btn">Add Course</button>
      </form>
    </div>
  );
}
