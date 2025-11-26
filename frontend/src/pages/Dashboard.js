import React, { useEffect, useState, useContext } from 'react';
import { API_BASE } from '../api';
import AuthContext from '../AuthContext';

// GPA thresholds (lower bound for each class)
const CLASS_TO_GPA_TARGET = {
  Distinction: 3.75, // > 3.75
  Merit: 3.25,       // 3.25 – 3.74
  Credit: 2.68,      // 2.68 – 3.24
  Pass: 2.25        // < 2.25 (we just use 2.25 as reference)
};

// Minimum total credits for each band
const CLASS_TO_MIN_CREDITS = {
  Distinction: 30, // > 30 credits
  Merit: 26,       // 26.0 – 29.9
  Credit: 22,      // 22.0 – 25.9
  Pass: 18         // < 18  (we use 18 as simple reference)
};

// Text description for UI
const CLASS_TO_CREDIT_DESC = {
  Distinction: '> 30 credits',
  Merit: '26.0 – 29.9 credits',
  Credit: '22.0 – 25.9 credits',
  Pass: '< 18 credits'
};

const CLASS_TO_GPA_DESC = {
  Distinction: '> 3.75 GPA',
  Merit: '3.25 – 3.74 GPA',
  Credit: '2.68 – 3.24 GPA',
  Pass: '< 2.25 GPA'
};

export default function Dashboard() {
  const { auth } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const [targetClass, setTargetClass] = useState('Distinction');
  const [forecastError, setForecastError] = useState('');
  const [forecast, setForecast] = useState(null);

  // load GPA summary from backend
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/gpa/me`, {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.msg || 'Failed to load GPA');
        }
        setSummary(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    if (auth?.token) {
      load();
    }
  }, [auth]);

  async function submitForecast(e) {
    e.preventDefault();
    setForecastError('');
    setForecast(null);

    if (!summary) {
      setForecastError('No GPA data available yet.');
      return;
    }

    const totalCreditsSoFar = summary.totalCredits || 0;
    const minCreditsForClass = CLASS_TO_MIN_CREDITS[targetClass];
    const targetGPA = CLASS_TO_GPA_TARGET[targetClass];

    if (!minCreditsForClass || !targetGPA) {
      setForecastError('Invalid target classification.');
      return;
    }

    // automatic remaining credits based on chosen class
    const remainingCredits = Math.max(minCreditsForClass - totalCreditsSoFar, 0);

    if (remainingCredits <= 0) {
      // already at or above minimum credits for this band
      setForecast({
        alreadyEnoughCredits: true,
        targetClass,
        minCreditsForClass,
        totalCreditsSoFar,
        creditDesc: CLASS_TO_CREDIT_DESC[targetClass],
        gpaDesc: CLASS_TO_GPA_DESC[targetClass]
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/gpa/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          targetGPA,
          remainingCredits
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Forecast failed');
      }

      setForecast({
        ...data,
        targetClass,
        remainingCredits,
        minCreditsForClass,
        totalCreditsSoFar,
        creditDesc: CLASS_TO_CREDIT_DESC[targetClass],
        gpaDesc: CLASS_TO_GPA_DESC[targetClass]
      });
    } catch (err) {
      console.error(err);
      setForecastError(err.message || 'Something went wrong');
    }
  }

  if (loading) {
    return <div className="container">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="container">
        <div className="card">No GPA data yet. Add some courses first.</div>
      </div>
    );
  }

  const { user, perYear, cumulativeGPA, totalCredits } = summary;

  return (
    <div className="container">
      <h2>Dashboard</h2>

      <div className="card">
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Cumulative GPA:</strong> {cumulativeGPA}
        </p>
        <p>
          <strong>Total Credits:</strong> {totalCredits}
        </p>
      </div>

      <h3>GPA by Year</h3>
      {perYear && Object.keys(perYear).length === 0 && (
        <div className="card">No courses yet.</div>
      )}
      {perYear &&
        Object.entries(perYear).map(([year, info]) => (
          <div key={year} className="card">
            <strong>Year {year}</strong>
            <p>GPA: {info.gpa}</p>
            <p>Credits: {info.credits}</p>
          </div>
        ))}

      <h3>Forecast target GPA / degree class</h3>
      <form onSubmit={submitForecast} className="card form-card">
        {forecastError && <div className="error">{forecastError}</div>}

        <label>
          Target classification
          <select
            value={targetClass}
            onChange={(e) => setTargetClass(e.target.value)}
          >
            <option value="Pass">Pass</option>
            <option value="Credit">Credit</option>
            <option value="Merit">Merit</option>
            <option value="Distinction">Distinction</option>
          </select>
        </label>

        <p style={{ fontSize: '13px', marginTop: '4px' }}>
          Credits band for <strong>{targetClass}</strong>:{' '}
          {CLASS_TO_CREDIT_DESC[targetClass]} — GPA range:{' '}
          {CLASS_TO_GPA_DESC[targetClass]}
        </p>

        <button type="submit">Calculate</button>
      </form>

      {forecast && (
        <div className="card">
          <p>
            <strong>Target class:</strong> {forecast.targetClass}
          </p>
          <p>
            <strong>Credits band:</strong> {forecast.creditDesc}
          </p>
          <p>
            <strong>GPA range:</strong> {forecast.gpaDesc}
          </p>
          <p>
            <strong>Total credits so far:</strong> {forecast.totalCreditsSoFar}
          </p>
          <p>
            <strong>Minimum credits for this class (used in forecast):</strong>{' '}
            {forecast.minCreditsForClass}
          </p>

          {forecast.alreadyEnoughCredits ? (
            <p>
              You already have at least the minimum credits for{' '}
              <strong>{forecast.targetClass}</strong>. Focus on keeping your GPA
              within the required range.
            </p>
          ) : (
            <>
              <p>
                <strong>Credits remaining (automatic):</strong>{' '}
                {forecast.remainingCredits}
              </p>
              <p>
                <strong>
                  Required average grade point in the remaining credits:
                </strong>{' '}
                {forecast.requiredAvgGP}
              </p>
              <p>
                <strong>Recommended minimum grade:</strong>{' '}
                {forecast.recommendedGrade}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}