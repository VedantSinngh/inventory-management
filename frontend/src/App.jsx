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
import { LogOut, Bell, Menu, X, ChevronDown, Sun, Moon } from 'lucide-react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { InventoryProvider, InventoryContext } from './context/InventoryContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import AlertCenter from './components/AlertCenter';

const TopNav = () => {
  const { user, logout } = useContext(AuthContext);
  const { socketConnected } = useContext(InventoryContext);
  const [alertOpen, setAlertOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
      { path: '/analytics', label: 'Analytics', roles: ['ADMIN', 'MANAGER'] },
      { path: '/alerts', label: 'Alerts' },
      { path: '/reorders', label: 'Reorder Engine', roles: ['ADMIN', 'MANAGER'] },
      { path: '/scanner', label: 'Scanner' },
    ]
  };

  // Filter items by role
  Object.keys(navGroups).forEach(key => {
    navGroups[key] = navGroups[key].filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(user?.role);
    });
  });

  if (user?.role === 'ADMIN') {
    navGroups['Admin'] = [{ path: '/users', label: 'Users' }];
  }

  const NavDropdown = ({ title, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isGroupActive = items.some(item => location.pathname === item.path);
    return (
      <div
        style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className={`nav-link-dropdown${isGroupActive ? ' active' : ''}`} style={{
          cursor: 'pointer',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          height: '100%',
          color: isGroupActive ? 'var(--color-ink)' : 'var(--color-muted)'
        }}>
          {title} <ChevronDown size={13} strokeWidth={2.5} style={{ transition: 'transform 150ms', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </div>
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '64px',
            left: '0',
            backgroundColor: 'var(--color-surface-card)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-lg)',
            minWidth: '200px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 24px rgba(12, 10, 9, 0.08)',
            overflow: 'hidden',
            padding: '6px 0'
          }}>
            {items.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`dropdown-link${location.pathname === item.path ? ' active' : ''}`}
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
        padding: '0 32px',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 999,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', height: '100%' }}>
          {/* Wordmark */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: '300',
              color: 'var(--color-ink)',
              letterSpacing: '-0.2px',
              lineHeight: 1
            }}>
              Stock.IMS
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Link
              to="/"
              className={`nav-link${location.pathname === '/' ? ' active' : ''}`}
            >
              Dashboard
            </Link>
            {Object.entries(navGroups).map(([title, items]) => (
              <NavDropdown key={title} title={title} items={items} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Connection Status */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
            <span className="pulsing-dot" style={{
              animationPlayState: socketConnected ? 'running' : 'paused',
              opacity: socketConnected ? 1 : 0.2
            }} />
            <span style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              color: 'var(--color-muted)',
              fontWeight: '600',
              letterSpacing: '0.8px',
              fontFamily: 'var(--font-body)'
            }}>
              {socketConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          <button
            onClick={() => setAlertOpen(true)}
            className="btn-icon-circular"
            aria-label="Open alerts"
          >
            <Bell size={18} />
          </button>

          <button
            onClick={toggleTheme}
            className="btn-icon-circular"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* User Profile */}
          <div className="desktop-only" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderLeft: '1px solid var(--color-hairline)',
            paddingLeft: '20px',
            marginLeft: '8px'
          }}>
            <span style={{
              fontSize: '14px',
              color: 'var(--color-ink)',
              fontWeight: '500',
              fontFamily: 'var(--font-body)'
            }}>
              {user?.name || 'User'}
            </span>
            <button
              onClick={logout}
              style={{
                color: 'var(--color-muted)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 150ms'
              }}
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: 'var(--color-ink)', padding: '4px' }}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AlertCenter isOpen={alertOpen} onClose={() => setAlertOpen(false)} />
      </div>

      {/* Mobile Menu */}
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
          padding: '32px 28px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                fontWeight: '300',
                color: 'var(--color-ink)',
                textDecoration: 'none'
              }}
            >
              Dashboard
            </Link>
            {Object.entries(navGroups).map(([title, items]) => (
              <div key={title}>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.96px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-body)',
                  marginBottom: '14px'
                }}>
                  {title}
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  paddingLeft: '12px',
                  borderLeft: '1px solid var(--color-hairline)'
                }}>
                  {items.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '20px',
                        fontWeight: '300',
                        color: location.pathname === item.path ? 'var(--color-ink)' : 'var(--color-body)',
                        textDecoration: 'none'
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div style={{
              marginTop: '16px',
              paddingTop: '24px',
              borderTop: '1px solid var(--color-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                color: 'var(--color-body)',
                fontWeight: '500'
              }}>
                {user?.name}
              </span>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="btn-secondary"
                style={{ height: '36px', padding: '0 16px', fontSize: '14px' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Layout = ({ children }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--color-canvas)'
    }}>
      <TopNav />
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
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
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: '300',
            color: 'var(--color-muted)'
          }}>
            Loading…
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Layout>
        <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '16px', fontWeight: '300' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '32px' }}>
            You do not have permission to view this page. Required roles: {allowedRoles.join(', ')}
          </p>
          <Link to="/" style={{
            padding: '10px 24px',
            backgroundColor: 'var(--color-ink)',
            color: 'white',
            borderRadius: '9999px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Return to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

function App() {
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', storedTheme);
  }, []);

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
                <Route path="/analytics" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><Analytics /></ProtectedRoute>} />
                <Route path="/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                <Route path="/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                <Route path="/cycle-counts" element={<ProtectedRoute><CycleCounts /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/warehouses" element={<ProtectedRoute><Warehouses /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><Users /></ProtectedRoute>} />
                <Route path="/reorders" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><ReorderEngine /></ProtectedRoute>} />
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
