'use client';

import { useState, useEffect } from 'react';

const API_KEY = 'fca_live_xw88ZhJhdbpqpU37EOTvBKXDr6IqTBeEthDBFmf1';
const API_URL = `https://api.freecurrencyapi.com/v1/latest?apikey=${API_KEY}&currencies=IDR&base_currency=USD`;

// Cache in memory to avoid re-fetching on component re-mounts within the same session
let cachedRate: number | null = null;
let lastFetchTime: number | null = null;

export default function useCurrency() {
  const [idrRate, setIdrRate] = useState<number>(16000); // Start with a fallback
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      const now = new Date().getTime();
      // Use cache if it's less than 1 hour old
      if (cachedRate && lastFetchTime && (now - lastFetchTime < 3600 * 1000)) {
        setIdrRate(cachedRate);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch currency rate');
        }
        const data = await response.json();
        const rate = data.data.IDR;
        if (typeof rate !== 'number') {
            throw new Error('Invalid currency rate received');
        }
        
        setIdrRate(rate);
        cachedRate = rate;
        lastFetchTime = now;
        setError(null);
      } catch (e: any) {
        console.error("Failed to fetch currency rate:", e);
        setError(e);
        // Keep using the fallback rate in case of an error
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { idrRate, loading, error };
}
