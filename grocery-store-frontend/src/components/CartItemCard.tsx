import type { CartItem } from '../types/index';
import styles from './CartItemCard.module.css';

interface Props extends CartItem {
    onRemove: (id: string) => void;
}

export function CartItemCard({ id, name, quantity, price, image_url, onRemove }: Props) {
    const lineTotal = (Number(price) * quantity).toFixed(2);

    return (
        <div className={styles.card}>
            <img
                src={image_url || '/placeholder.jpg'}
                alt={name}
                className={styles.image}
            />
            <div className={styles.info}>
                <div className={styles.name}>{name}</div>
                <div className={styles.unitPrice}>${Number(price).toFixed(2)} each</div>
            </div>
            <div className={styles.right}>
                <div className={styles.qty}>
                    <span className={styles.qtyLabel}>Qty</span>
                    <span className={styles.qtyValue}>{quantity}</span>
                </div>
                <div className={styles.lineTotal}>
                    <span className={styles.lineTotalLabel}>Total</span>
                    <span className={styles.lineTotalValue}>${lineTotal}</span>
                </div>
                <button
                    className={styles.removeButton}
                    onClick={() => onRemove(id)}
                    aria-label="Remove item"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}