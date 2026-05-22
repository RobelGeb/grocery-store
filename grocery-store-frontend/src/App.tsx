import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { ProductsPage } from './components/ProductsPage'
import { AdminInventoryPage } from './pages/AdminInventoryPage'
import { CartPage } from './pages/CartPage'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductsPage />} />
        <Route path="/admin" element={<AdminInventoryPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </BrowserRouter>  
  )
}

export default App
