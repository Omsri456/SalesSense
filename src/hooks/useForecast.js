import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { generateForecast } from '../data/forecastData';

export function useForecast({ sku = 'all', modelId = 'lstm', horizonDays = 90 }) {
  const [data, setData] = useState(() => generateForecast({ sku, modelId, horizonDays }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchForecast() {
      setLoading(true);
      try {
        const storeId = 'STORE_01';
        const res = await api.getForecast(storeId, sku, horizonDays);
        if (isMounted && res) {
          setData(res);
          setIsLive(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          // Gracefully fallback to simulated forecast
          setData(generateForecast({ sku, modelId, horizonDays }));
          setIsLive(false);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchForecast();

    return () => {
      isMounted = false;
    };
  }, [sku, modelId, horizonDays]);

  return { data, loading, error, isLive };
}
