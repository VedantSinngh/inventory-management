import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Warehouses from './pages/Warehouses';
import Login from './pages/Login';
import { Package, ShoppingCart, LayoutDashboard, LogOut, Warehouse } from 'lucide-react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { InventoryProvider, InventoryContext } from './context/InventoryContext';

const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/warehouses', label: 'Warehouses', icon: Warehouse },
  ];

  return (
    <div style={{ width: '250px', backgroundColor: 'var(--color-bg-secondary)', height: '100vh', padding: '20px 0' }}>
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
        <button onClick={logout} style={{ display: 'flex' }}><LogOut size={16} style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }} /></button>
      </div>
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
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InventoryProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/warehouses" element={<ProtectedRoute><Warehouses /></ProtectedRoute>} />
          </Routes>
        </InventoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
