import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { api } from '../api';
import styles from './AdminInventoryPage.module.css'

export function AdminInventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        api.getProducts().then(setProducts);
    }, []);

    const handleUpdateStock = async (productId: string, newQuantity: number) => {
        await fetch(`/api/inventory/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQuantity, updatedBy: 'admin_user' }),
        });
        api.getProducts().then(setProducts);
    };

    return (
        <div className={styles.page}>
            <h1 className={styles.heading}>Admin Inventory</h1>
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