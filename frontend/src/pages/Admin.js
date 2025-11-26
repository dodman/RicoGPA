import React, { useEffect, useState, useContext } from 'react';
import { API_BASE } from '../api';
import AuthContext from '../AuthContext';

export default function Admin() {
  const { auth } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/admin/users`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.msg || 'Failed to load users');
        }
        setUsers(data.users || []);
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

  async function deleteUser(id) {
    if (!window.confirm('Delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/user/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Delete failed');
      }
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Delete failed');
    }
  }

  if (loading) {
    return <div className="container">Loading admin panel…</div>;
  }

  if (error) {
    return <div className="container"><div className="error">{error}</div></div>;
  }

  return (
    <div className="container">
      <h2>Admin Panel</h2>
      {users.length === 0 && <div className="card">No users or not authorized.</div>}
      {users.map(u => (
        <div key={u._id} className="card">
          <p><strong>{u.name}</strong> — {u.email}</p>
          <p>Admin: {u.isAdmin ? 'Yes' : 'No'}</p>
          <p>Courses: {u.courses?.length ?? 0}</p>
          <button onClick={() => deleteUser(u._id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
