import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Warehouses from './pages/Warehouses';
import Users from './pages/Users';
import Login from './pages/Login';
import Signup from './pages/Signup';

import ResetPassword from './pages/ResetPassword';
import Shipments from './pages/Shipments';
import Suppliers from './pages/Suppliers';
import Batches from './pages/Batches';
import Alerts from './pages/Alerts';
import CycleCounts from './pages/CycleCounts';
import Analytics from './pages/Analytics';
import ReorderEngine from './pages/ReorderEngine';
import Returns from './pages/Returns';
import DeadStock from './pages/DeadStock';
import MobileScanner from './pages/MobileScanner';
import VerifyEmail from './pages/VerifyEmail';
import { Package, ShoppingCart, LayoutDashboard, LogOut, Warehouse, Users as UsersIcon, Truck, Building2, Boxes, AlertCircle, BarChart3, ClipboardList, Percent, Camera, Bell, Menu, X, ChevronDown } from 'lucide-react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { InventoryProvider, InventoryContext } from './context/InventoryContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import AlertCenter from './components/AlertCenter';

const MStripe = () => (
  <div className="m-stripe-divider">
    <div className="m-light-blue"></div>
    <div className="m-dark-blue"></div>
    <div className="m-red"></div>
  </div>
);

const TopNav = () => {
  const { user, logout } = useContext(AuthContext);
  const { socketConnected } = useContext(InventoryContext);
  const [alertOpen, setAlertOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navGroups = {
    'Operations': [
      { path: '/orders', label: 'Orders' },
      { path: '/shipments', label: 'Shipments' },
      { path: '/suppliers', label: 'Suppliers' },
      { path: '/batches', label: 'Batches' },
    ],
    'Inventory': [
      { path: '/products', label: 'Products' },
      { path: '/warehouses', label: 'Warehouses' },
      { path: '/cycle-counts', label: 'Cycle Counts' },
      { path: '/returns', label: 'Returns' },
      { path: '/dead-stock', label: 'Dead Stock' },
    ],
    'Intelligence': [
      { path: '/analytics', label: 'Analytics' },
      { path: '/alerts', label: 'Alerts' },
      { path: '/reorders', label: 'Reorder Engine' },
      { path: '/scanner', label: 'Scanner' },
    ]
  };

  if (user?.role === 'ADMIN') {
    navGroups['Admin'] = [{ path: '/users', label: 'Users' }];
  }

  // Desktop Dropdown Component
  const NavDropdown = ({ title, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div 
        style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div style={{
          color: isOpen ? 'var(--color-on-dark)' : 'var(--color-body)',
          cursor: 'pointer',
          padding: '0 16px',
          fontWeight: isOpen ? '700' : '400',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'color 150ms'
        }}>
          {title} <ChevronDown size={14} />
        </div>
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '64px',
            left: '0',
            backgroundColor: 'var(--color-surface-card)',
            border: '1px solid var(--color-hairline)',
            borderTop: 'none',
            minWidth: '200px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {items.map(item => (
              <Link 
                key={item.path} 
                to={item.path}
                style={{
                  padding: '12px 16px',
                  color: location.pathname === item.path ? 'var(--color-on-dark)' : 'var(--color-body)',
                  fontWeight: location.pathname === item.path ? '700' : '400',
                  textDecoration: 'none',
                  fontSize: '14px',
                  borderBottom: '1px solid var(--color-hairline)',
                  transition: 'background-color 150ms'
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={{
        height: '64px', 
        backgroundColor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-hairline)',
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 24px', 
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 999
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', height: '100%' }}>
          {/* Logo Area */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '24px' }}><MStripe /></div>
            <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '1px', color: 'var(--color-on-dark)' }}>
              SYSTEM.M
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Link to="/" style={{
              color: location.pathname === '/' ? 'var(--color-on-dark)' : 'var(--color-body)',
              padding: '0 16px',
              fontWeight: location.pathname === '/' ? '700' : '400',
              fontSize: '14px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              letterSpacing: '0.5px'
            }}>Dashboard</Link>
            {Object.entries(navGroups).map(([title, items]) => (
              <NavDropdown key={title} title={title} items={items} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Connection Status */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulsing-dot" style={{ animationPlayState: socketConnected ? 'running' : 'paused', opacity: socketConnected ? 1 : 0.2 }}></span>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-muted)', fontWeight: '700', letterSpacing: '1px' }}>
              {socketConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <button onClick={() => setAlertOpen(true)} className="btn-icon" style={{ width: '40px', height: '40px', backgroundColor: 'transparent' }}>
            <Bell size={20} style={{ color: 'var(--color-on-dark)' }} />
          </button>

          {/* User Profile */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid var(--color-hairline)', paddingLeft: '24px' }}>
            <div style={{ fontSize: '14px', color: 'var(--color-on-dark)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {user?.name || 'USER'}
            </div>
            <button onClick={logout} style={{ color: 'var(--color-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
              <LogOut size={18} />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="mobile-only" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: 'var(--color-on-dark)' }}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AlertCenter isOpen={alertOpen} onClose={() => setAlertOpen(false)} />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--color-canvas)',
          zIndex: 998,
          overflowY: 'auto',
          padding: '24px'
        }}>
          <MStripe />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
            <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-on-dark)', textTransform: 'uppercase' }}>Dashboard</Link>
            {Object.entries(navGroups).map(([title, items]) => (
              <div key={title}>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '12px', borderLeft: '1px solid var(--color-hairline)' }}>
                  {items.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '16px', color: 'var(--color-on-dark)', textDecoration: 'none' }}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', color: 'var(--color-on-dark)', textTransform: 'uppercase' }}>{user?.name}</span>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="btn-secondary" style={{ height: '36px', padding: '0 16px' }}>LOGOUT</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 1025px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
};

// Footer removed for minimalist design

const Layout = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-canvas)' }}>
      <TopNav />
      <div style={{ 
        flex: 1, 
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: 'var(--spacing-xl) var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column'
      }}>
         {children}
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-canvas)'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
          <div style={{ fontSize: '14px', fontWeight: '300', textTransform: 'uppercase', letterSpacing: '2px' }}>SYSTEM.M INITIALIZING...</div>
          <div style={{ width: '48px', margin: '16px auto' }}><MStripe /></div>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <InventoryProvider>
              <ToastContainer />
              <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
                  <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                  <Route path="/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
                  <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                  <Route path="/cycle-counts" element={<ProtectedRoute><CycleCounts /></ProtectedRoute>} />
                  <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                  <Route path="/warehouses" element={<ProtectedRoute><Warehouses /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                  <Route path="/reorders" element={<ProtectedRoute><ReorderEngine /></ProtectedRoute>} />
                  <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
                  <Route path="/dead-stock" element={<ProtectedRoute><DeadStock /></ProtectedRoute>} />
                  <Route path="/scanner" element={<ProtectedRoute><MobileScanner /></ProtectedRoute>} />
                  <Route path="/verify" element={<VerifyEmail />} />
                </Routes>
            </InventoryProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
