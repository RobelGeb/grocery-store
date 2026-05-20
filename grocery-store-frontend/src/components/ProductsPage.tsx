import { useState, useEffect } from 'react';
import type { Product, Category } from '../types';
import { api } from '../api';
import { ProductCard } from './ProductCard';
import styles from './ProductsPage.module.css';

export function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getCategories().then(setCategories);

    }, []);

    useEffect(() => {
        setLoading(true);
        api.getProducts(selectedCategory || undefined)
            .then(setProducts)
            .finally(() => setLoading(false));
    }, [selectedCategory]);

    useEffect(() => {
        const handleFocus = () => {
            api.getProducts(selectedCategory || undefined).then(setProducts);
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        }
    }, [selectedCategory]);

    const handleAddToCart = async (productId: string) => {
        await api.addToCart('default_user', productId, 1);
    };

    return (
        <div className={styles.page}>
            <div className={styles.filters}>
                <button 
                    onClick={() => setSelectedCategory('')} 
                    className={`${styles.filterBtn} ${selectedCategory === '' ? styles.active : ''}`}
                >
                    All Products
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.slug)}
                        className={`${styles.filterBtn}${selectedCategory === category.slug ? ` ${styles.active}` : ''}`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>
            {loading ? (
                <div className={styles.loading}>Loading products...</div>
            ) : (
                <div className={styles.grid}>
                {products.map((product) => (
                    <ProductCard
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