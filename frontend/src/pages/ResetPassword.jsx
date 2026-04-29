import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import api from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('reset'); // 'reset' or 'success'
  const [token] = useState(searchParams.get('token') || '');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      showError('Reset token not found in URL');
      return;
    }
    if (!validateForm()) return;

    try {
      setLoading(true);
      await api.post('/auth/reset-password', {
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      success('Password reset successfully!');
      setStep('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      showError(err.data?.message || err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner fullScreen text="Resetting password..." />;

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--color-bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {step === 'reset' ? (
          <>
            <h2 style={{ fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>RESET PASSWORD</h2>
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '32px', fontSize: '13px' }}>
              ENTER YOUR NEW PASSWORD
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: errors.password ? '1px solid #ff6b6b' : 'none',
                    borderBottom: errors.password ? 'none' : '1px solid transparent',
                    padding: '12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 150ms ease'
                  }}
                  onFocus={e => !errors.password && (e.target.style.borderBottom = '1px solid #000000')}
                  onBlur={e => !errors.password && (e.target.style.borderBottom = '1px solid transparent')}
                />
                {errors.password && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b' }}>{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: errors.confirmPassword ? '1px solid #ff6b6b' : 'none',
                    borderBottom: errors.confirmPassword ? 'none' : '1px solid transparent',
                    padding: '12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 150ms ease'
                  }}
                  onFocus={e => !errors.confirmPassword && (e.target.style.borderBottom = '1px solid #000000')}
                  onBlur={e => !errors.confirmPassword && (e.target.style.borderBottom = '1px solid transparent')}
                />
                {errors.confirmPassword && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b' }}>{errors.confirmPassword}</p>}
              </div>

              <button type="submit" className="btn-solid" style={{ marginTop: '12px', padding: '14px' }}>
                RESET PASSWORD
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Password Reset Successfully</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Your password has been reset. Redirecting to login...
            </p>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              If not redirected, <a href="/login" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>click here</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
