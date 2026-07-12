import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { Trash2, Edit2, Plus, X } from 'lucide-react';

const roleBadge = (role) => {
  const map = { ADMIN: 'badge-danger', MANAGER: 'badge-info', STAFF: 'badge-muted' };
  return map[role] || 'badge-muted';
};

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'STAFF' });
  const [errors, setErrors] = useState({});

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/auth/users?page=${page}&limit=10`);
      setUsers(response.data);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.pages);
    } catch (err) { showError(err.message || 'Failed to fetch users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.role === 'ADMIN') fetchUsers(); }, [user?.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    if (!editingUser && !formData.password) e.password = 'Password is required';
    if (!editingUser && formData.password && formData.password.length < 8) e.password = 'Must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      if (editingUser) {
        await api.put(`/auth/users/${editingUser._id}`, { role: formData.role });
        success('User updated');
      } else {
        await api.post('/auth/register', formData);
        success(`${formData.role} created`);
      }
      setShowModal(false); setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'STAFF' });
      fetchUsers(currentPage);
    } catch (err) { showError(err.data?.message || err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      setLoading(true);
      await api.delete(`/auth/users/${userId}`);
      success('User deleted');
      fetchUsers(currentPage);
    } catch (err) { showError(err.message || 'Failed to delete'); }
    finally { setLoading(false); }
  };

  const closeModal = () => { setShowModal(false); setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'STAFF' }); setErrors({}); };

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-muted)' }}>
        <h1 style={{ marginBottom: '12px' }}>Access restricted</h1>
        <p>Only admin users can access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Users</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
            {users.length} team member{users.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ height: '40px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
          onClick={() => setShowModal(true)}
        >
          <Plus size={14} /> Add user
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner text="Loading users…" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '48px' }}>No users found</td></tr>
              ) : users.map(u => (
                <tr key={u._id}>
                  <td style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{u.name}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{u.email}</td>
                  <td><span className={`badge ${roleBadge(u.role)}`}>{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : u.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {[
                        { icon: Edit2, action: () => handleEdit(u), label: 'Edit' },
                        { icon: Trash2, action: () => handleDelete(u._id), label: 'Delete', danger: true },
                      ].map(({ icon: Icon, action, label, danger }) => (
                        <button key={label} onClick={action} title={label}
                          style={{
                            width: '32px', height: '32px', border: '1px solid var(--color-hairline)',
                            borderRadius: 'var(--rounded-md)', background: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: danger ? 'var(--color-danger)' : 'var(--color-muted)', transition: 'all 150ms'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-soft)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Icon size={14} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button key={page} onClick={() => fetchUsers(page)}
              style={{
                width: '36px', height: '36px', border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--rounded-md)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)',
                backgroundColor: page === currentPage ? 'var(--color-primary)' : 'transparent',
                color: page === currentPage ? 'var(--color-on-primary)' : 'var(--color-muted)',
                transition: 'all 150ms'
              }}>
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(12,10,9,0.4)', backdropFilter: 'blur(6px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-xxl)', padding: '36px 36px',
            width: '100%', maxWidth: '440px',
            boxShadow: '0 16px 48px rgba(12,10,9,0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '300', marginBottom: '4px' }}>
                  {editingUser ? `Edit ${editingUser.name}` : 'Add user'}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
                  {editingUser ? 'Update role assignment' : 'Create a new team member account'}
                </p>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { label: 'Full name', name: 'name', type: 'text', ph: 'Jane Smith', disabled: !!editingUser },
                { label: 'Email address', name: 'email', type: 'email', ph: 'user@company.com', disabled: !!editingUser },
                ...(!editingUser ? [{ label: 'Password', name: 'password', type: 'password', ph: '8+ characters' }] : []),
              ].map(f => (
                <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: errors[f.name] ? 'var(--color-danger)' : 'var(--color-body)', marginBottom: 0 }}>{f.label}</label>
                  <input type={f.type} name={f.name} value={formData[f.name]} onChange={handleChange} placeholder={f.ph} disabled={f.disabled}
                    style={{ height: '44px', opacity: f.disabled ? 0.6 : 1, cursor: f.disabled ? 'not-allowed' : 'text', borderColor: errors[f.name] ? 'var(--color-danger-border)' : undefined }} />
                  {errors[f.name] && <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>{errors[f.name]}</p>}
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Role</label>
                <select name="role" value={formData.role} onChange={handleChange} style={{ height: '44px' }}>
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} className="btn-secondary" style={{ flex: 1, height: '44px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '44px' }}>
                  {editingUser ? 'Update user' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
