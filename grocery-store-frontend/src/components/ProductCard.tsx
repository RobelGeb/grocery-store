import type { Product } from '../types/index';
import { StockBadge } from './StockBadge';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock_status === 'out_of_stock';

  return (
    <div className={styles.card}>
      <img
        src={product.image_url || '/placeholder.jpg'}
        alt={product.name}
        className={styles.image}
      />
      <div className={styles.body}>
        <p className={styles.category}>{product.category_name}</p>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>${product.price.toFixed(2)}</p>
        <div className={styles.footer}>
          <StockBadge status={product.stock_status} quantity={product.quantity} />
          <button
            onClick={() => onAddToCart(product.id)}
            disabled={isOutOfStock}
            className={styles.addButton}
          >
            {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
} 