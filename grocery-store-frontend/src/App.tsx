import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { ProductsPage } from './components/ProductsPage'
import { AdminInventoryPage } from './pages/AdminInventoryPage'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductsPage />} />
        <Route path="/admin" element={<AdminInventoryPage />} />
      </Routes>
    </BrowserRouter>  
  )
}

export default App
