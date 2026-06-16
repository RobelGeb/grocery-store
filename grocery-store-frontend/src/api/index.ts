import type { Product, InventoryStatus, Category, CartItem } from "../types";

const BASE_URL = '/api';

export const api = {
    // Products
    getProducts: async (category?: string, page = 1): Promise<Product[]> => {
        const params = new URLSearchParams({ page: String(page)});
        if (category) params.append('category', category);  
        const res = await fetch(`${BASE_URL}/products?${params}`);
        return res.json();
    },

    getProduct: async (id: string): Promise<Product> => {
        const res = await fetch(`${BASE_URL}/products/${id}`);
        return res.json();
    },

    getInventoryStatus: async (productId: string, token: string): Promise<InventoryStatus> => {
        const res = await fetch(`${BASE_URL}/inventory/${productId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    updateInventory: async (productId: string, quantity: number, token: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/inventory/${productId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({quantity, updatedBy: 'admin_user'}),
        });
        if (!res.ok) throw res;
    },

    getCart: async (userId: string): Promise<CartItem[]> => {
        const res = await fetch(`${BASE_URL}/cart/${userId}`)
        return res.json();
    },

    addToCart: async (userId: string, productId: string, quantity: number): Promise<CartItem> => {
        const res = await fetch(`${BASE_URL}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, productId, quantity }),
        });
        return res.json();
    },

    removeFromCart: async (itemId: string): Promise<void> => {
        await fetch(`${BASE_URL}/cart/${itemId}`, {
            method: 'DELETE',
        });
    },

    getCategories: async (): Promise<Category[]> => {
        const res = await fetch(`${BASE_URL}/categories`);
        return res.json();
    }
}