import React, { useContext, useState } from 'react';
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
import { Package, ShoppingCart, LayoutDashboard, LogOut, Warehouse, Users as UsersIcon, Truck, Building2, Boxes, AlertCircle, BarChart3, ClipboardList, Percent, Camera, Bell } from 'lucide-react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { InventoryProvider, InventoryContext } from './context/InventoryContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import AlertCenter from './components/AlertCenter';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1280);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth < 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/shipments', label: 'Shipments', icon: Truck },
    { path: '/suppliers', label: 'Suppliers', icon: Building2 },
    { path: '/batches', label: 'Batches', icon: Boxes },
    { path: '/alerts', label: 'Alerts', icon: AlertCircle },
    { path: '/cycle-counts', label: 'Cycle Counts', icon: BarChart3 },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/warehouses', label: 'Warehouses', icon: Warehouse },
    { path: '/reorders', label: 'Reorder Engine', icon: ShoppingCart },
    { path: '/returns', label: 'Returns', icon: ClipboardList },
    { path: '/dead-stock', label: 'Dead Stock', icon: Percent },
    { path: '/scanner', label: 'Scanner', icon: Camera },
    ...(user?.role === 'ADMIN' ? [{ path: '/users', label: 'Users', icon: UsersIcon }] : [])
  ];

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-surface-1)' }}>
      <div style={{ 
        height: '64px', 
        padding: '0 20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--color-border)' 
      }}>
        <h2 style={{ 
          fontSize: collapsed ? '14px' : '18px', 
          fontWeight: '600', 
          color: 'var(--color-accent)', 
          margin: 0,
          letterSpacing: '-0.2px'
        }}>
          {collapsed ? 'IMS' : 'SYSTEM.CORE'}
        </h2>
      </div>
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: collapsed ? 'center' : 'flex-start',
                height: '40px',
                padding: collapsed ? '0' : '0 12px',
                backgroundColor: isActive ? 'var(--color-accent-glow)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                borderRadius: '0',
                transition: 'all 150ms ease'
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} style={{ flexShrink: 0, marginRight: collapsed ? 0 : '8px' }} />
              {!collapsed && <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop view */}
      <div style={{ 
        width: collapsed ? '60px' : '240px', 
        height: '100vh', 
        borderRight: '1px solid var(--color-border)',
        flexShrink: 0,
        display: 'block',
        '@media (max-width: 768px)': { display: 'none' }
      }} className="desktop-sidebar-container">
        {sidebarContent}
      </div>

      {/* Mobile view bottom drawer triggers could be rendered but layout will automatically arrange it */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar-container {
            display: none !important;
          }
          .mobile-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 56px;
            background-color: var(--color-surface-1);
            border-top: 1px solid var(--color-border);
            display: flex !important;
            justify-content: space-around;
            align-items: center;
            z-index: 100;
          }
          .mobile-bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            color: var(--color-text-secondary);
            font-size: 10px;
          }
          .mobile-bottom-nav-item.active {
            color: var(--color-accent);
          }
        }
      `}</style>
      <div className="mobile-bottom-nav" style={{ display: 'none' }}>
        <Link to="/" className={`mobile-bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        <Link to="/products" className={`mobile-bottom-nav-item ${location.pathname === '/products' ? 'active' : ''}`}>
          <Package size={18} />
          <span>Products</span>
        </Link>
        <Link to="/orders" className={`mobile-bottom-nav-item ${location.pathname === '/orders' ? 'active' : ''}`}>
          <ShoppingCart size={18} />
          <span>Orders</span>
        </Link>
        <Link to="/warehouses" className={`mobile-bottom-nav-item ${location.pathname === '/warehouses' ? 'active' : ''}`}>
          <Warehouse size={18} />
          <span>Warehouses</span>
        </Link>
        <Link to="/alerts" className={`mobile-bottom-nav-item ${location.pathname === '/alerts' ? 'active' : ''}`}>
          <AlertCircle size={18} />
          <span>Alerts</span>
        </Link>
      </div>
    </>
  );
};

const Topbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { socketConnected } = useContext(InventoryContext);
  const [alertOpen, setAlertOpen] = useState(false);
  const location = useLocation();

  // Create breadcrumb
  const pathParts = location.pathname.split('/').filter(p => p);
  const breadcrumb = pathParts.length > 0 
    ? `SYSTEM / ${pathParts.map(p => p.toUpperCase()).join(' / ')}` 
    : 'SYSTEM / DASHBOARD';

  return (
    <div style={{
      height: '56px', 
      backgroundColor: 'var(--color-surface-1)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', 
      alignItems: 'center', 
      padding: '0 24px', 
      justifyContent: 'space-between',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: '400', letterSpacing: '0.4px' }}>
          {breadcrumb}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pulsing-dot" style={{ animationPlayState: socketConnected ? 'running' : 'paused', opacity: socketConnected ? 1 : 0.2 }}></span>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: '600', letterSpacing: '0.8px' }}>Live</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <input 
          placeholder="Quick search..." 
          style={{ width: '180px', height: '28px', fontSize: '12px', padding: '0 8px', borderRadius: '4px' }}
        />
        <button 
          onClick={() => setAlertOpen(true)} 
          style={{ display: 'flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}
          title="Open Alert Center"
        >
          <Bell size={18} style={{ color: 'var(--color-text-secondary)', transition: 'color 150ms' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: '500' }}>{user ? user.name : 'ADMIN'}</div>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600' }}>
            {user ? user.name.slice(0,2).toUpperCase() : 'AD'}
          </div>
          <button onClick={logout} style={{ display: 'flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}>
            <LogOut size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
      </div>

      <AlertCenter isOpen={alertOpen} onClose={() => setAlertOpen(false)} />
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--color-canvas)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          backgroundColor: 'var(--color-canvas)', 
          padding: '24px',
          paddingBottom: '80px' // offset bottom mobile menu
        }}>
           {children}
        </div>
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
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: '14px', marginBottom: '10px' }}>Loading...</div>
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
