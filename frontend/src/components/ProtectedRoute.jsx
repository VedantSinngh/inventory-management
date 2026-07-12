import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-ink font-sans">
        <div className="text-xl">Checking permissions...</div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role is not allowed, redirect to dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-ink font-sans">
        <div className="bg-white p-8 border border-zinc-200 rounded-xl shadow-sm text-center max-w-md">
          <h1 className="font-display text-2xl mb-4">Access Denied</h1>
          <p className="text-zinc-600 mb-6">
            You do not have permission to view this page. Required roles: {allowedRoles.join(', ')}
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-ink text-white rounded-pill text-sm hover:opacity-90 transition-opacity"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
