
export function CartPage() {

    const [cartItems, setCartItems] = useState<Product[]>([]);
    return (
        <div>
            <h1>Your Cart</h1>
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