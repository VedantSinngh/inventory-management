import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const FieldError = ({ msg }) =>
  msg ? <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)', letterSpacing: '0.12px' }}>{msg}</p> : null;

const Signup = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('signup');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [verificationToken, setVerificationToken] = useState('');
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateSignup = () => {
    const errs = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) errs.name = 'At least 2 characters required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address';
    if (formData.password.length < 8) errs.password = 'Must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    try {
      setLoading(true);
      await api.post('/auth/signup', { name: formData.name, email: formData.email, password: formData.password });
      success('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      showError(err.data?.message || err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationToken.trim()) { setErrors({ token: 'Token is required' }); return; }
    try {
      setLoading(true);
      await api.post('/auth/verify-email', { token: verificationToken });
      success('Email verified! Redirecting…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      showError(err.data?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-canvas)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Atmospheric Orbs */}
      <div className="orb orb-rose" style={{ width: '440px', height: '440px', top: '-100px', left: '-80px' }} />
      <div className="orb orb-sky" style={{ width: '360px', height: '360px', bottom: '-60px', right: '-60px' }} />
      <div className="orb orb-lavender" style={{ width: '220px', height: '220px', bottom: '30%', left: '5%' }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'var(--color-surface-card)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--rounded-xxl)',
        padding: '48px 44px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 8px 40px rgba(12, 10, 9, 0.06)',
      }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: '300',
            color: 'var(--color-ink)',
            letterSpacing: '-0.2px',
            marginBottom: '4px'
          }}>
            Stock.IMS
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            Inventory Intelligence Platform
          </p>
        </div>

        {step === 'signup' ? (
          <>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '30px',
              fontWeight: '300',
              textAlign: 'center',
              marginBottom: '8px',
              letterSpacing: '-0.3px'
            }}>
              Create your account
            </h1>
            <p style={{ textAlign: 'center', fontSize: '15px', color: 'var(--color-muted)', marginBottom: '36px' }}>
              Join Stock.IMS to manage your inventory
            </p>

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { label: 'Full name', name: 'name', type: 'text', placeholder: 'Jane Smith' },
                { label: 'Email address', name: 'email', type: 'email', placeholder: 'you@company.com' },
                { label: 'Password', name: 'password', type: 'password', placeholder: '8+ characters' },
                { label: 'Confirm password', name: 'confirmPassword', type: 'password', placeholder: '••••••••' },
              ].map(({ label, name, type, placeholder }) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: errors[name] ? 'var(--color-danger)' : 'var(--color-body)',
                    marginBottom: 0
                  }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    style={{
                      borderColor: errors[name] ? 'var(--color-danger-border)' : undefined,
                      height: '44px'
                    }}
                  />
                  <FieldError msg={errors[name]} />
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: loading ? 'var(--color-muted)' : 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  border: 'none',
                  borderRadius: 'var(--rounded-pill)',
                  fontSize: '15px',
                  fontWeight: '500',
                  fontFamily: 'var(--font-body)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '8px'
                }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '14px', color: 'var(--color-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--color-ink)', fontWeight: '500', textDecoration: 'underline' }}>
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '30px',
              fontWeight: '300',
              textAlign: 'center',
              marginBottom: '8px',
              letterSpacing: '-0.3px'
            }}>
              Verify your email
            </h1>
            <p style={{ textAlign: 'center', fontSize: '15px', color: 'var(--color-muted)', marginBottom: '32px' }}>
              We sent a verification link to <strong style={{ color: 'var(--color-ink)' }}>{formData.email}</strong>
            </p>

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>
                  Verification token
                </label>
                <textarea
                  value={verificationToken}
                  onChange={e => { setVerificationToken(e.target.value); if (errors.token) setErrors(p => ({ ...p, token: '' })); }}
                  placeholder="Paste the token from the email"
                  style={{ minHeight: '100px', height: 'auto', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                />
                <FieldError msg={errors.token} />
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', height: '44px',
                backgroundColor: loading ? 'var(--color-muted)' : 'var(--color-primary)',
                color: 'var(--color-on-primary)', border: 'none',
                borderRadius: 'var(--rounded-pill)', fontSize: '15px', fontWeight: '500',
                fontFamily: 'var(--font-body)', cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                {loading ? 'Verifying…' : 'Verify email'}
              </button>

              <button type="button" onClick={() => { setStep('signup'); setVerificationToken(''); setErrors({}); }}
                className="btn-secondary" style={{ width: '100%', height: '44px' }}>
                Back
              </button>
            </form>

            <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)' }}>
              Didn't receive an email? Check your spam folder or contact support.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;
