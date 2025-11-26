import React from 'react';
import GradeBadge from './GradeBadge';

export default function YearCard({ year, gpa, credits }) {
  return (
    <div className="card">
      <strong>Year {year}</strong>
      <div style={{ marginTop: 4 }}>
        GPA: <strong>{gpa}</strong>
        <GradeBadge gpa={gpa} />
      </div>
      <div style={{ marginTop: 4 }}>Credits: {credits}</div>
    </div>
  );
}