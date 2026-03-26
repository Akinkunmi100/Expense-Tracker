import { create } from 'zustand';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  fetchProducts: (userId: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'user_id' | 'created_at'>, userId: string) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  decrementStock: (id: string, amount: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async (userId) => {
    set({ isLoading: true });
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (!error && data) {
      set({ products: data as Product[] });
    }
    set({ isLoading: false });
  },

  addProduct: async (product, userId) => {
    try {
      const payload = { ...product, user_id: userId };
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();
        
      if (error) throw error;
      set((state) => ({ products: [...state.products, data as Product] }));
    } catch (err) {
      console.error('Failed to add product', err);
      throw err;
    }
  },

  updateProduct: async (id, updates) => {
    const previousState = get().products;
    
    set((state) => ({
      products: state.products.map((p) => p.id === id ? { ...p, ...updates } : p)
    }));

    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
    } catch (err) {
      set({ products: previousState });
      throw err;
    }
  },

  deleteProduct: async (id) => {
    const previousState = get().products;
    
    set((state) => ({
      products: state.products.filter((p) => p.id !== id)
    }));

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      set({ products: previousState });
      throw err;
    }
  },

  decrementStock: async (id, amount) => {
    const product = get().products.find(p => p.id === id);
    if (!product) return;
    
    const newQty = Math.max(0, product.stock_qty - amount);
    await get().updateProduct(id, { stock_qty: newQty });
  }
}));
