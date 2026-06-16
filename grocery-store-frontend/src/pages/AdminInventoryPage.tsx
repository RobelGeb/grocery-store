import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { api } from '../api';
import styles from './AdminInventoryPage.module.css'
import { useAuth } from '../context/AuthContext';

export function AdminInventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const { accessToken, logout } = useAuth();

    useEffect(() => {
        api.getProducts().then(setProducts);
    }, []);

    const handleUpdateStock = async (productId: string, newQuantity: number) => {
        if (!accessToken) return
        try {
            await api.updateInventory(productId, newQuantity, accessToken);
            api.getProducts().then(setProducts);
        } catch (err) {
            if (err instanceof Response && err.status === 401) logout();
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.heading}>Admin Inventory</h1>
                <button className={styles.signOutBtn} onClick={logout}>Sign out</button>
            </div>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Status</th>
                        <th>Update Stock</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <InventoryRow
                            key={product.id}
                            product={product}
                            onUpdate={handleUpdateStock}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function InventoryRow({ product, onUpdate }: {
    product: Product;
    onUpdate: (id: string, quantity: number) => void
}) {
    const [newQuantity, setNewQuantity] = useState(product.quantity);

    const statusClass = 
        product.stock_status === 'out_of_stock' ? styles.outOfStock :
        product.stock_status === 'low_stock' ? styles.lowStock :
        styles.inStock;

    return (
        <tr>
      <td>{product.name}</td>
      <td className={styles.sku}>{product.sku}</td>
      <td>{product.quantity}</td>
      <td>
        <span className={statusClass}>
          {product.stock_status.replace('_', ' ')}
        </span>
      </td>
      <td>
        <div className={styles.updateCell}>
          <input
            type="number"
            min="0"
            value={newQuantity}
            onChange={(e) => setNewQuantity(parseInt(e.target.value))}
            className={styles.qtyInput}
          />
          <button onClick={() => onUpdate(product.id, newQuantity)} className={styles.saveBtn}>
            Save
          </button>
        </div>
      </td>
    </tr>
    )
}