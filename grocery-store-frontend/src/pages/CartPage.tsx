import styles from './CartPage.module.css';
import { api } from '../api';
import { useEffect, useState } from 'react';
import type { CartItem } from '../types';

export function CartPage() {

    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    useEffect(() => {
        api.getCart("bdee0e0b-620d-4cfc-a4cb-cbe27bfe8e76").then(setCartItems);
    }, []);

    return (
        <div>
            <h1>Your Cart</h1>
            {loading ? (
                <div className={styles.loading}>Loading items in your cart...</div>
            ) : (
                <div className={styles.grid}>
                {cartItems.map((item) => (
                    <CartItemCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                    />
                ))}
                </div>
            )}
        </div>
    )
}