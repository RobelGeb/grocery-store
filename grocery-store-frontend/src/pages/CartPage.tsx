import styles from './CartPage.module.css';
import { api } from '../api';
import { useEffect, useState } from 'react';
import type { CartItem } from '../types';
import { CartItemCard } from '../components/CartItemCard';

export function CartPage() {

    const [{cartItems, loading}, setCartItemState] = (
        useState< {cartItems: CartItem[], loading: boolean} >({cartItems: [], loading: true})
    );

    useEffect(() => {
        api.getCart("bdee0e0b-620d-4cfc-a4cb-cbe27bfe8e76")
        .then(cartItems => setCartItemState({ cartItems, loading: false }));
    }, []);

    return (
        <div>
            <h1>Your Cart</h1>
            {loading ? (
                <div className={styles.loading}>Loading items in your cart...</div>
            ) : (
                <div className={styles.grid}>
                {cartItems.map((item) => (
                    <CartItemCard key={item.id} {...item} />
                ))}
                </div>
            )}
        </div>
    )
}