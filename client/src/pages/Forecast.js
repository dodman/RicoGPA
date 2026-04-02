import { useState } from 'react';
import API from '../api';

const TARGETS = [
  { value: 'pass', label: 'Pass' },
  { value: 'credit', label: 'Credit (2.68 GPA)' },
  { value: 'merit', label: 'Meritorious (3.25 GPA)' },
  { value: 'distinction', label: 'Distinction (3.75 GPA)' },
];

export default function Forecast() {
  const [target, setTarget] = useState('distinction');
  const [remainingCredits, setRemainingCredits] = useState(8);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleForecast = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const { data } = await API.get('/api/gpa/forecast', {
        params: { target, remainingCredits },
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Forecast failed');
    }
  };

  return (
    <div>
      <h2>GPA Forecast</h2>
      <p>See what grades you need to reach your target classification.</p>

      <form onSubmit={handleForecast} className="forecast-form">
        <label>
          Target Classification
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label>
          Remaining Course Units (e.g. 8 full courses = 8)
          <input
            type="number"
            value={remainingCredits}
            onChange={(e) => setRemainingCredits(e.target.value)}
            min="0.5"
            step="0.5"
            required
          />
        </label>
        <button type="submit" className="btn">Calculate Forecast</button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="forecast-result">
          <div className="summary-cards">
            <div className="card">
              <h3>Current GPA</h3>
              <p className="big-number">{result.currentGPA.toFixed(2)}</p>
            </div>
            <div className="card">
              <h3>Target GPA</h3>
              <p className="big-number">{result.targetGPA.toFixed(2)}</p>
              <span className="badge">{result.targetLabel}</span>
            </div>
            <div className="card">
              <h3>Needed GPA</h3>
              <p className="big-number">{result.neededGPA.toFixed(2)}</p>
              <span>in remaining {result.remainingCredits} credits</span>
            </div>
          </div>
          <div className="advice-box">
            <p>{result.advice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
