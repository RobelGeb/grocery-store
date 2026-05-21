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