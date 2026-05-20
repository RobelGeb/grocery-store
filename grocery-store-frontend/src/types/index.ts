export interface Category {
    id: string;
    name: string;
    slug: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    sku: string;
    category_name: string;
    quantity: number;
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface CartItem {
    id: string;
    product_id: string;
    name: string;

}

export interface InventoryStatus {
    quantity: number;
    low_stock_threshold: number,
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
}