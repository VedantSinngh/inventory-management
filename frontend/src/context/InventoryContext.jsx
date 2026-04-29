import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const InventoryContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create axios-like API helper
const createApiClient = (token) => {
  return {
    get: async (url, config = {}) => {
      const response = await fetch(`${API_URL}${url}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        ...config
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return response.json();
    },
    post: async (url, data, config = {}) => {
      const response = await fetch(`${API_URL}${url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data),
        ...config
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return response.json();
    },
    put: async (url, data, config = {}) => {
      const response = await fetch(`${API_URL}${url}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data),
        ...config
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return response.json();
    }
  };
};

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [api, setApi] = useState(null);
  const { user } = useContext(AuthContext);

  const fetchProducts = async () => {
    if (!user || !user.token) return;
    try {
      const res = await fetch(`${API_URL}/products?limit=100`, {
        headers: { Authorization: `Bearer ${user.token}` },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async () => {
    if (!user || !user.token) return;
    try {
      const res = await fetch(`${API_URL}/orders?limit=100`, {
        headers: { Authorization: `Bearer ${user.token}` },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchWarehouses = async () => {
    if (!user || !user.token) return;
    try {
      const res = await fetch(`${API_URL}/warehouses?limit=100`, {
        headers: { Authorization: `Bearer ${user.token}` },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  useEffect(() => {
    if (user && user.token) {
      // Create API client
      const apiClient = createApiClient(user.token);
      setApi(apiClient);

      setLoading(true);
      
      Promise.all([fetchProducts(), fetchOrders(), fetchWarehouses()])
        .then(() => setLoading(false))
        .catch((err) => {
          console.error('Error fetching data:', err);
          setLoading(false);
        });

      try {
        const socket = io(SOCKET_URL, {
          auth: {
            token: user.token
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });
        
        socket.on('connect', () => {
          setSocketConnected(true);
          // Join dashboard for real-time updates
          socket.emit('join-dashboard');
        });
        
        socket.on('disconnect', () => {
          setSocketConnected(false);
        });
        
        // Stock updates
        socket.on('stock-changed', (data) => {
          fetchProducts();
          fetchOrders();
        });

        // Dashboard updates
        socket.on('dashboard-update', (data) => {
          if (data.type === 'SHIPMENT_UPDATE') {
            fetchProducts();
          } else if (data.type === 'NEW_ALERT') {
            setAlerts(prev => [data.data, ...prev]);
          } else if (data.type === 'BATCH_UPDATE') {
            fetchProducts();
          }
        });

        // Shipment updates
        socket.on('shipment-update', (data) => {
          setShipments(prev =>
            prev.map(s => s._id === data.shipmentId ? { ...s, ...data } : s)
          );
        });

        // Alert notifications
        socket.on('new-alert', (alertData) => {
          setAlerts(prev => [alertData, ...prev]);
        });

        // Batch updates
        socket.on('batch-update', (data) => {
          setBatches(prev =>
            prev.map(b => b._id === data.batchId ? { ...b, ...data } : b)
          );
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        return () => {
          socket.disconnect();
        };
      } catch (err) {
        console.error('Error setting up socket:', err);
      }
    } else {
      setLoading(false);
    }
  }, [user?.token]);

  return (
    <InventoryContext.Provider value={{
      products,
      orders,
      warehouses,
      alerts,
      shipments,
      batches,
      fetchProducts,
      fetchOrders,
      fetchWarehouses,
      socketConnected,
      loading,
      api
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

