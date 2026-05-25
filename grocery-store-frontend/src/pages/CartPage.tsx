import styles from './CartPage.module.css';
import { api } from '../api';
import { useEffect, useState } from 'react';
import type { CartItem } from '../types';
import { CartItemCard } from '../components/CartItemCard';

export function CartPage() {
    const [{ cartItems, loading }, setCartItemState] = useState<{ cartItems: CartItem[]; loading: boolean }>({
        cartItems: [],
        loading: true,
    });

    useEffect(() => {
        api.getCart('bdee0e0b-620d-4cfc-a4cb-cbe27bfe8e76')
            .then(cartItems => setCartItemState({ cartItems, loading: false }));
    }, []);

    const handleRemove = async (id: string) => {
        await api.removeFromCart(id);
        setCartItemState(prev => ({
            ...prev,
            cartItems: prev.cartItems.filter(item => item.id !== id),
        }));
    };

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Your Cart</h1>
                {!loading && <p className={styles.itemCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>}
            </div>

            {loading ? (
                <div className={styles.loading}>Loading your cart...</div>
            ) : cartItems.length === 0 ? (
                <div className={styles.empty}>
                    <p>Your cart is empty.</p>
                    <a href="/" className={styles.emptyLink}>Continue Shopping</a>
                </div>
            ) : (
                <div className={styles.layout}>
                    <div className={styles.itemsList}>
                        {cartItems.map(item => (
                            <CartItemCard key={item.id} {...item} onRemove={handleRemove} />
                        ))}
                    </div>

                    <div className={styles.summary}>
                        <h2 className={styles.summaryTitle}>Order Summary</h2>
                        <div className={styles.summaryRow}>
                            <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Estimated tax</span>
                            <span>${(subtotal * 0.08).toFixed(2)}</span>
                        </div>
                        <hr className={styles.summaryDivider} />
                        <div className={styles.summaryTotal}>
                            <span>Total</span>
                            <span>${(subtotal * 1.08).toFixed(2)}</span>
                        </div>
                        <button className={styles.checkoutButton}>Proceed to Checkout</button>
                        <a href="/" className={styles.continueLink}>Continue Shopping</a>
                    </div>
                </div>
            )}
        </div>
    );
}
