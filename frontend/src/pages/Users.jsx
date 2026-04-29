import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { Trash2, Edit2, Plus, Users } from 'lucide-react';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF'
  });
  const [errors, setErrors] = useState({});

  // Fetch users list
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/auth/users?page=${page}&limit=10`);
      setUsers(response.data);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      showError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [user?.role]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!editingUser && !formData.password) newErrors.password = 'Password is required';
    if (!editingUser && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create or update user
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      if (editingUser) {
        // Update user role/status only
        await api.put(`/auth/users/${editingUser._id}`, {
          role: formData.role
        });
        success('User updated successfully');
      } else {
        // Create new user
        await api.post('/auth/register', formData);
        success(`${formData.role} user created successfully`);
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'STAFF' });
      fetchUsers(currentPage);
    } catch (err) {
      showError(err.data?.message || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  // Edit user
  const handleEdit = (userData) => {
    setEditingUser(userData);
    setFormData({
      name: userData.name,
      email: userData.email,
      password: '',
      role: userData.role
    });
    setShowModal(true);
  };

  // Delete user
  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setLoading(true);
      await api.delete(`/auth/users/${userId}`);
      success('User deleted successfully');
      fetchUsers(currentPage);
    } catch (err) {
      showError(err.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'STAFF' });
    setErrors({});
  };

  // Check authorization
  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          ❌ You do not have permission to access this page.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '10px' }}>
          Only ADMIN users can manage users.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>User Management</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {loading && <Spinner />}

      {!loading && (
        <>
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Last Login</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{u.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: u.role === 'ADMIN' ? '#ff6b6b' : u.role === 'MANAGER' ? '#4ecdc4' : '#95a5a6',
                          color: 'white'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          backgroundColor: u.status === 'ACTIVE' ? '#2ecc71' : u.status === 'PENDING' ? '#f39c12' : '#e74c3c',
                          color: 'white'
                        }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(u)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--color-border)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(u._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            backgroundColor: '#ffebee',
                            border: '1px solid #ff6b6b',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#ff6b6b'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => fetchUsers(page)}
                  style={{
                    padding: '8px 12px',
                    border: page === currentPage ? 'none' : '1px solid var(--color-border)',
                    backgroundColor: page === currentPage ? 'var(--color-accent)' : 'transparent',
                    color: page === currentPage ? 'white' : 'var(--color-text-heading)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            borderRadius: '8px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px' }}>
              {editingUser ? `Edit ${editingUser.name}` : 'Add New User'}
            </h2>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: errors.name ? '1px solid #ff6b6b' : '1px solid var(--color-border)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.name && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ff6b6b' }}>{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={editingUser}
                  placeholder="user@example.com"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: errors.email ? '1px solid #ff6b6b' : '1px solid var(--color-border)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: editingUser ? 'var(--color-bg-secondary)' : 'transparent',
                    boxSizing: 'border-box',
                    cursor: editingUser ? 'not-allowed' : 'text'
                  }}
                />
                {errors.email && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ff6b6b' }}>{errors.email}</p>}
              </div>

              {/* Password */}
              {!editingUser && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: errors.password ? '1px solid #ff6b6b' : '1px solid var(--color-border)',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {errors.password && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ff6b6b' }}>{errors.password}</p>}
                </div>
              )}

              {/* Role */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'var(--color-bg-primary)',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  Cancel
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
