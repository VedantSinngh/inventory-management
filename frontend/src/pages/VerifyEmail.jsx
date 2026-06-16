import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/Spinner';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const performVerification = async () => {
      try {
        const response = await api.verifyEmailGet(token);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (err) {
        console.error('Email verification error:', err);
        setStatus('error');
        setMessage(err.message || 'Verification link is invalid or expired.');
      }
    };

    performVerification();
  }, [token, navigate]);

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
        maxWidth: '450px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>EMAIL VERIFICATION</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', fontSize: '13px', textTransform: 'uppercase' }}>
          Account Activation Pipeline
        </p>

        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <Spinner />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '48px', color: '#10B981' }}>✓</div>
            <p style={{ color: '#10B981', fontWeight: 'bold', fontSize: '16px' }}>{message}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Redirecting to login page...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ fontSize: '48px', color: '#EF4444' }}>✗</div>
            <p style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '16px' }}>{message}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '10px' }}>
              <Link 
                to="/login" 
                style={{
                  display: 'block',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '12px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
