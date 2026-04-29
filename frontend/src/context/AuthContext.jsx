import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Try to restore user from sessionStorage on mount
      const userInfo = sessionStorage.getItem('userInfo');
      const token = sessionStorage.getItem('token');
      
      console.log('AuthContext: Initializing - userInfo present:', !!userInfo, 'token present:', !!token);
      
      if (userInfo && token) {
        try {
          const userData = JSON.parse(userInfo);
          setUser(userData);
          console.log('AuthContext: User restored from session:', userData.email);
        } catch (parseError) {
          console.error('AuthContext: Failed to parse stored user info:', parseError);
          sessionStorage.removeItem('userInfo');
          sessionStorage.removeItem('token');
          setError(parseError.message);
        }
      } else {
        console.log('AuthContext: No stored user info, user will need to login');
      }
    } catch (err) {
      console.error('AuthContext: Error during initialization:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      console.log('AuthContext: Attempting login for:', email);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('AuthContext: Login response status:', response.status);
      
      if (response.ok) {
        console.log('AuthContext: Login successful, storing user and token');
        setUser(data);
        sessionStorage.setItem('userInfo', JSON.stringify(data));
        sessionStorage.setItem('token', data.token);
        navigate('/');
        return { success: true };
      } else {
        const errorMsg = data.message || 'Login failed';
        console.error('AuthContext: Login failed:', errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setError(error.message);
      return { success: false, message: 'Server connection error: ' + error.message };
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out user');
    setUser(null);
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

