import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { products as fallbackProducts } from '../data/products';

export function useProducts() {
  const [products, setProducts] = useState(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        const data = await api.getProducts();
        if (isMounted && data && Array.isArray(data)) {
          setProducts(data);
          setIsLive(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          // Gracefully fallback to local mock data if backend is offline
          setProducts(fallbackProducts);
          setIsLive(false);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return { products, loading, error, isLive };
}
