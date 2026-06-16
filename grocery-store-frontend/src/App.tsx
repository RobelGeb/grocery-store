import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { ProductsPage } from './components/ProductsPage';
import { AdminInventoryPage } from './pages/AdminInventoryPage';
import { CartPage } from './pages/CartPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLoginPage } from './pages/AdminLoginPage';

function RequireAdmin({ children }: {children: React.ReactNode }) {
  const { accessToken } = useAuth();
  return accessToken ? children : <AdminLoginPage />
}


function App() {

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/admin" element={<RequireAdmin><AdminInventoryPage /></RequireAdmin>} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
