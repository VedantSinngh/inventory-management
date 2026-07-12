import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(email, password);
    if (!res.success) {
      setError(res.message);
    }
    setLoading(false);
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
      <div className="orb orb-peach" style={{ width: '480px', height: '480px', top: '-120px', right: '-80px' }} />
      <div className="orb orb-lavender" style={{ width: '360px', height: '360px', bottom: '-80px', left: '-60px' }} />
      <div className="orb orb-mint" style={{ width: '240px', height: '240px', top: '40%', left: '10%' }} />

      {/* Auth Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'var(--color-surface-card)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--rounded-xxl)',
        padding: '48px 44px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 40px rgba(12, 10, 9, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0'
      }}>
        {/* Wordmark */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
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
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', letterSpacing: '0.15px' }}>
            Inventory Intelligence Platform
          </p>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '32px',
          fontWeight: '300',
          color: 'var(--color-ink)',
          letterSpacing: '-0.32px',
          lineHeight: 1.2,
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Welcome back
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--color-muted)',
          textAlign: 'center',
          marginBottom: '36px',
          letterSpacing: '0.15px'
        }}>
          Sign in to continue to your workspace
        </p>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: 'var(--rounded-lg)',
            fontSize: '14px',
            marginBottom: '20px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{ height: '44px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>
                Password
              </label>
              <Link to="/reset-password" style={{
                fontSize: '13px',
                color: 'var(--color-muted)',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 150ms'
              }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ height: '44px' }}
            />
          </div>

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
              marginTop: '8px',
              transition: 'background-color 150ms ease'
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: '32px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--color-muted)',
          letterSpacing: '0.15px'
        }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{
            color: 'var(--color-ink)',
            fontWeight: '500',
            textDecoration: 'underline'
          }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
