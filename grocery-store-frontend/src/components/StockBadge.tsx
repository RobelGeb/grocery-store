import styles from './StockBadge.module.css';

interface StockBadgeProps {
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    quantity?: number;
}

export function StockBadge({ status, quantity }: StockBadgeProps) {
    if (status === 'out_of_stock') {
        return (
            <span className={` ${styles.badge} ${styles.outOfStock}`}>
                Out of Stock
            </span>
        );
    } else if (status === 'low_stock') {
        return (
            <span className={` ${styles.badge} ${styles.lowStock}`}>
                Low Stock ({quantity !== undefined && `(${quantity})`} left)
            </span>
        );
    } else {
        return (
            <span className={` ${styles.badge} ${styles.inStock}`}>
                In Stock
            </span>
        );
    }
}