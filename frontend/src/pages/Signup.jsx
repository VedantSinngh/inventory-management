import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import api from '../services/api';

const Signup = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('signup'); // 'signup' or 'verify'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [verificationToken, setVerificationToken] = useState('');
  const [errors, setErrors] = useState({});

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate signup form
  const validateSignup = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;

    try {
      setLoading(true);
      const response = await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      success('Account created! Check your email to verify your account.');
      setStep('verify');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      showError(err.data?.message || err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle email verification
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationToken.trim()) {
      setErrors({ token: 'Verification token is required' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/verify-email', {
        token: verificationToken
      });

      success('Email verified successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      showError(err.data?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner fullScreen text="Processing..." />;

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
        {step === 'signup' ? (
          <>
            <h2 style={{ fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>CREATE ACCOUNT</h2>
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '32px', fontSize: '13px' }}>
              JOIN THE INVENTORY SYSTEM
            </p>

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: errors.name ? '1px solid #ff6b6b' : 'none',
                    borderBottom: errors.name ? 'none' : '1px solid transparent',
                    padding: '12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 150ms ease'
                  }}
                  onFocus={e => !errors.name && (e.target.style.borderBottom = '1px solid #000000')}
                  onBlur={e => !errors.name && (e.target.style.borderBottom = '1px solid transparent')}
                />
                {errors.name && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b' }}>{errors.name}</p>}
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: errors.email ? '1px solid #ff6b6b' : 'none',
                    borderBottom: errors.email ? 'none' : '1px solid transparent',
                    padding: '12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 150ms ease'
                  }}
                  onFocus={e => !errors.email && (e.target.style.borderBottom = '1px solid #000000')}
                  onBlur={e => !errors.email && (e.target.style.borderBottom = '1px solid transparent')}
                />
                {errors.email && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b' }}>{errors.email}</p>}
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Password
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
                CREATE ACCOUNT
              </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px' }}>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 'bold' }}>
                  Login here
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>VERIFY EMAIL</h2>
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '13px' }}>
              A verification link has been sent to <strong>{formData.email}</strong>
            </p>

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Verification Token
                </label>
                <textarea
                  value={verificationToken}
                  onChange={e => {
                    setVerificationToken(e.target.value);
                    if (errors.token) setErrors(prev => ({ ...prev, token: '' }));
                  }}
                  placeholder="Paste the verification token from the email"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: errors.token ? '1px solid #ff6b6b' : '1px solid var(--color-border)',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    outline: 'none',
                    minHeight: '100px',
                    resize: 'vertical',
                    borderRadius: '4px'
                  }}
                />
                {errors.token && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b' }}>{errors.token}</p>}
              </div>

              <button type="submit" className="btn-solid" style={{ padding: '14px' }}>
                VERIFY EMAIL
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('signup');
                  setVerificationToken('');
                  setErrors({});
                }}
                className="btn-secondary"
                style={{ padding: '14px' }}
              >
                BACK
              </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <p>Didn't receive an email? Check your spam folder or contact support.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;
