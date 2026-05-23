import type { CartItem } from '../types/index';
import styles from './CartItemCard.module.css';


export function CartItemCard(cartItem: CartItem) {

    return (
        <div className={styles.card}>
            <img
                src={cartItem.image_url || '/placeholder.jpg'}
                alt={cartItem.name}
                className={styles.image}
            />
            <div>
                {cartItem.name}
            </div> 
            <div>
                Quantity: {cartItem.quantity}
            </div>
            <div>
                ${Number(cartItem.price).toFixed(2)} ea., ${(Number(cartItem.price) * cartItem.quantity).toFixed(2)} total
            </div>
        </div>
    )
}
    