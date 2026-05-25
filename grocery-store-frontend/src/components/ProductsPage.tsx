import { useState, useEffect } from 'react';
import type { Product, Category } from '../types';
import { api } from '../api';
import { ProductCard } from './ProductCard';
import styles from './ProductsPage.module.css';

export function ProductsPage() {
    const [{ products, loading }, setProductState] = useState<{ products: Product[]; loading: boolean }>({ products: [], loading: true });
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    useEffect(() => {
        api.getCategories().then(setCategories);
    }, []);

    useEffect(() => {
        api.getProducts(selectedCategory || undefined)
            .then(products => setProductState({ products, loading: false }));
        return () => setProductState({ products: [], loading: true });
    }, [selectedCategory]);

    useEffect(() => {
        const handleFocus = () => {
            api.getProducts(selectedCategory || undefined)
                .then(products => setProductState({ products, loading: false }));
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [selectedCategory]);

    const handleAddToCart = async (productId: string) => {
        await api.addToCart('bdee0e0b-620d-4cfc-a4cb-cbe27bfe8e76', productId, 1);
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
                <div>
                    <a href="/cart">    <button className={`${styles.filterBtn} ${styles.cartBtn}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                            </svg>
                        </button>
                    </a>
                </div>
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