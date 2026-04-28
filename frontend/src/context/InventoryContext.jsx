import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchProducts = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWarehouses = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/warehouses', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) setWarehouses(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchOrders();
      fetchWarehouses();

      const socket = io();
      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));
      
      socket.on('product-created', fetchProducts);
      socket.on('product-updated', fetchProducts);
      socket.on('order-created', fetchOrders);
      socket.on('stock-changed', () => { fetchProducts(); fetchOrders(); });

      return () => socket.disconnect();
    }
  }, [user]);

  return (
    <InventoryContext.Provider value={{
      products, orders, warehouses, fetchProducts, fetchOrders, fetchWarehouses, socketConnected
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
