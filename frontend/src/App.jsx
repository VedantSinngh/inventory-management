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

  return (
    <div style={{ width: '250px', backgroundColor: 'var(--color-bg-secondary)', height: '100vh', padding: '20px 0', overflowY: 'auto' }}>
      <div style={{ padding: '0 20px', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px' }}>SYSTEM.CORE</h2>
      </div>
      <nav>
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px',
              backgroundColor: isActive ? 'var(--color-border)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: 'var(--color-text-heading)',
              textDecoration: 'none',
              marginBottom: '4px',
              transition: 'all 150ms ease'
            }}>
              <Icon size={18} style={{ marginRight: '12px' }} />
              <span style={{ fontSize: '15px' }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  );
};

const Topbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { socketConnected } = useContext(InventoryContext);
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div style={{
      height: '60px', backgroundColor: 'var(--color-bg-primary)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', margin: 0, letterSpacing: '0.12em' }}>INVENTORY CONTROL</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="pulsing-dot" style={{ animationPlayState: socketConnected ? 'running' : 'paused', opacity: socketConnected ? 1 : 0.2 }}></span>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Live</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ fontSize: '13px' }}>{user ? user.name : 'ADMINISTRATOR'}</div>
        
        {/* Notification Bell */}
        <button 
          onClick={() => setAlertOpen(true)} 
          style={{ display: 'flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}
          title="Open Alert Center"
        >
          <Bell size={18} style={{ color: 'var(--color-text-secondary)', transition: 'color 150ms' }} />
        </button>

        <button onClick={logout} style={{ display: 'flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}>
          <LogOut size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      <AlertCenter isOpen={alertOpen} onClose={() => setAlertOpen(false)} />
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-bg-primary)', padding: '20px' }}>
           {children}
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  // Show nothing while loading to prevent redirect flash
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-bg-primary)'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading...</div>
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
