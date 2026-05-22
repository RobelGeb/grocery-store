import type { CartItem } from '../types/index';
import styles from './CartItemCard.module.css';


export function CartItemCard(cartItem: CartItem) {

    return (
        <div className={styles.card}>
            {/* <img
                src={image_url || '/placeholder.jpg'}
                alt={cartItem.name}
            /> */}
            <div>
                {cartItem.name}
            </div>
            {/* <div>
                ${Number(cartItem.price.toFixed(2))}
            </div> */}
        </div>
    )
}
    