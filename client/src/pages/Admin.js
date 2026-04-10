import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import API from '../api';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [resets, setResets] = useState([]);
  const [viewUser, setViewUser] = useState(null);
  const [viewCourses, setViewCourses] = useState([]);
  const [viewGPA, setViewGPA] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetPassModal, setResetPassModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [search, setSearch] = useState('');

  const flash = (msg, type = 'success') => {
    if (type === 'error') { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  useEffect(() => {
    if (tab === 'dashboard') loadStats();
    if (tab === 'users') loadUsers();
    if (tab === 'resets') loadResets();
  }, [tab]);

  const loadStats = async () => {
    try { const { data } = await API.get('/api/admin/stats'); setStats(data); }
    catch (e) { flash(e.response?.data?.message || 'Failed to load stats', 'error'); }
  };

  const loadUsers = async () => {
    try { const { data } = await API.get('/api/admin/users'); setUsers(data); }
    catch (e) { flash(e.response?.data?.message || 'Failed to load users', 'error'); }
  };

  const loadResets = async () => {
    try { const { data } = await API.get('/api/admin/resets'); setResets(data); }
    catch (e) { flash(e.response?.data?.message || 'Failed to load resets', 'error'); }
  };

  const toggleBlock = async (u) => {
    try {
      await API.put(`/api/admin/users/${u.id}/block`, { blocked: !u.blocked });
      flash(`${u.email} ${u.blocked ? 'unblocked' : 'blocked'}`);
      loadUsers();
      if (tab === 'dashboard') loadStats();
    } catch (e) { flash(e.response?.data?.message || 'Failed', 'error'); }
  };

  const changeRole = async (u, role) => {
    try {
      await API.put(`/api/admin/users/${u.id}/role`, { role });
      flash(`${u.email} role changed to ${role}`);
      loadUsers();
    } catch (e) { flash(e.response?.data?.message || 'Failed', 'error'); }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.email} and all their data? This cannot be undone.`)) return;
    try {
      await API.delete(`/api/admin/users/${u.id}`);
      flash(`${u.email} deleted`);
      loadUsers();
      if (tab === 'dashboard') loadStats();
    } catch (e) { flash(e.response?.data?.message || 'Failed', 'error'); }
  };

  const viewUserCourses = async (u) => {
    try {
      const { data } = await API.get(`/api/admin/users/${u.id}/courses`);
      setViewUser(data.user);
      setViewCourses(data.courses);
      setViewGPA({ gpa: data.gpa, totalCredits: data.totalCredits });
    } catch (e) { flash(e.response?.data?.message || 'Failed', 'error'); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { flash('Password must be at least 6 characters', 'error'); return; }
    try {
      const { data } = await API.put(`/api/admin/users/${resetPassModal.id}/reset-password`, { newPassword });
      flash(data.message);
      setResetPassModal(null);
      setNewPassword('');
    } catch (e) { flash(e.response?.data?.message || 'Failed', 'error'); }
  };

  const handleResetAction = async (id, action) => {
    try {
      const { data } = await API.put(`/api/admin/resets/${id}`, { action });
      flash(data.message + (data.tempPassword ? ` Temp password: ${data.tempPassword}` : ''));
      loadResets();
      if (tab === 'dashboard') loadStats();
    } catch (e) { flash(e.response?.data?.message || 'Failed', 'error'); }
  };

  const classify = (gpa) => {
    if (gpa >= 3.75) return 'Distinction';
    if (gpa >= 3.25) return 'Meritorious';
    if (gpa >= 2.68) return 'Credit';
    return 'Pass';
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (user?.role !== 'admin') {
    return <div className="auth-page"><h2>Access Denied</h2><p>You do not have admin privileges.</p></div>;
  }

  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
        <button className={`admin-tab ${tab === 'resets' ? 'active' : ''}`} onClick={() => setTab('resets')}>
          Password Resets
          {stats?.pendingResets > 0 && <span className="admin-badge">{stats.pendingResets}</span>}
        </button>
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && stats && (
        <div>
          <div className="summary-cards">
            <div className="card">
              <h3>Total Users</h3>
              <div className="big-number">{stats.totalUsers}</div>
            </div>
            <div className="card">
              <h3>Total Courses</h3>
              <div className="big-number">{stats.totalCourses}</div>
            </div>
            <div className="card">
              <h3>Blocked Users</h3>
              <div className="big-number" style={{ color: stats.blockedUsers > 0 ? '#e74c3c' : undefined }}>{stats.blockedUsers}</div>
            </div>
            <div className="card">
              <h3>Pending Resets</h3>
              <div className="big-number" style={{ color: stats.pendingResets > 0 ? '#f39c12' : undefined }}>{stats.pendingResets}</div>
            </div>
          </div>
          <div className="year-card" style={{ marginTop: 20 }}>
            <h3>Recent Registrations</h3>
            <table>
              <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {stats.recentUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td><span className={`admin-role-badge ${u.role}`}>{u.role}</span></td>
                    <td>{u.blocked ? <span style={{ color: '#e74c3c' }}>Blocked</span> : <span style={{ color: '#27ae60' }}>Active</span>}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users List */}
      {tab === 'users' && (
        <div>
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search"
          />
          <div className="year-card">
            <table>
              <thead><tr><th>Email</th><th>Role</th><th>Courses</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className={u.blocked ? 'blocked-row' : ''}>
                    <td>{u.email}</td>
                    <td><span className={`admin-role-badge ${u.role}`}>{u.role}</span></td>
                    <td>{u.course_count}</td>
                    <td>{u.blocked ? <span style={{ color: '#e74c3c' }}>Blocked</span> : <span style={{ color: '#27ae60' }}>Active</span>}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="btn-sm btn-view" onClick={() => viewUserCourses(u)} title="View courses">View</button>
                        <button className="btn-sm btn-block" onClick={() => toggleBlock(u)} title={u.blocked ? 'Unblock' : 'Block'}>
                          {u.blocked ? 'Unblock' : 'Block'}
                        </button>
                        <button className="btn-sm btn-reset" onClick={() => { setResetPassModal(u); setNewPassword(''); }} title="Reset password">Reset PW</button>
                        {u.role === 'user' ? (
                          <button className="btn-sm btn-promote" onClick={() => changeRole(u, 'admin')} title="Make admin">Promote</button>
                        ) : u.id !== user.id ? (
                          <button className="btn-sm btn-demote" onClick={() => changeRole(u, 'user')} title="Remove admin">Demote</button>
                        ) : null}
                        {u.id !== user.id && (
                          <button className="btn-sm btn-delete" onClick={() => deleteUser(u)} title="Delete user">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p style={{ textAlign: 'center', padding: 20, color: '#999' }}>No users found</p>}
          </div>
        </div>
      )}

      {/* Password Resets */}
      {tab === 'resets' && (
        <div className="year-card">
          <table>
            <thead><tr><th>Email</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
            <tbody>
              {resets.map(r => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>
                    <span className={`admin-status-badge ${r.status}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    {r.status === 'pending' ? (
                      <div className="admin-actions">
                        <button className="btn-sm btn-approve" onClick={() => handleResetAction(r.id, 'approve')}>Approve</button>
                        <button className="btn-sm btn-reject" onClick={() => handleResetAction(r.id, 'reject')}>Reject</button>
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.85rem' }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {resets.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999', padding: 20 }}>No password reset requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View User Courses Modal */}
      {viewUser && (
        <div className="admin-modal-overlay" onClick={() => setViewUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{viewUser.email}'s Courses</h3>
              <button className="admin-modal-close" onClick={() => setViewUser(null)}>&times;</button>
            </div>
            {viewGPA && (
              <div className="admin-modal-stats">
                <span><strong>GPA:</strong> {viewGPA.gpa.toFixed(4)}</span>
                <span className="badge">{classify(viewGPA.gpa)}</span>
                <span><strong>Credits:</strong> {viewGPA.totalCredits}</span>
                <span><strong>Status:</strong> {viewUser.blocked ? 'Blocked' : 'Active'}</span>
              </div>
            )}
            {viewCourses.length > 0 ? (
              <table>
                <thead><tr><th>Course</th><th>Year</th><th>Type</th><th>Units</th><th>Grade</th><th>Points</th></tr></thead>
                <tbody>
                  {viewCourses.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.year}</td>
                      <td>{c.courseType || c.course_type}</td>
                      <td>{c.creditHours || c.credit_hours}</td>
                      <td>{c.grade}</td>
                      <td>{c.gradePoints || c.grade_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No courses added yet</p>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassModal && (
        <div className="admin-modal-overlay" onClick={() => setResetPassModal(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Reset Password</h3>
              <button className="admin-modal-close" onClick={() => setResetPassModal(null)}>&times;</button>
            </div>
            <p style={{ color: '#555', marginBottom: 12 }}>Set a new password for <strong>{resetPassModal.email}</strong></p>
            <input
              type="text"
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <div className="admin-actions">
              <button className="btn" onClick={handleResetPassword}>Reset Password</button>
              <button className="btn-cancel" onClick={() => setResetPassModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
