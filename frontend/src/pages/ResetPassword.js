import React from 'react';
import { useParams } from 'react-router-dom';

export default function ResetPassword() {
  const { token } = useParams();
  return (
    <div className="container">
      <h2>Reset Password</h2>
      <p>Token: {token}</p>
      <p>This screen is a placeholder. Password reset is not implemented yet.</p>
    </div>
  );
}
