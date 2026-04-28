import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await login(email, password);
    if (!res.success) {
      setError(res.message);
    }
  };

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
        <h2 style={{ fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>SYSTEM ACCESS</h2>
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '32px', fontSize: '13px' }}>
          ENTER CRENDENTIALS TO CONTINUE
        </p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Email Identifier</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@system.core"
              required
              style={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: 'none',
                borderBottom: '1px solid transparent',
                padding: '12px',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 150ms ease'
              }}
              onFocus={e => e.target.style.borderBottom = '1px solid #000000'}
              onBlur={e => e.target.style.borderBottom = '1px solid transparent'}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Security Key</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: 'none',
                borderBottom: '1px solid transparent',
                padding: '12px',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 150ms ease'
              }}
              onFocus={e => e.target.style.borderBottom = '1px solid #000000'}
              onBlur={e => e.target.style.borderBottom = '1px solid transparent'}
            />
          </div>
          
          <button type="submit" className="btn-solid" style={{ marginTop: '12px', padding: '14px' }}>
            AUTHENTICATE
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
