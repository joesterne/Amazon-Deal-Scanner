import { GoogleGenAI, Type } from "@google/genai";
import { AmazonItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

// High-speed in-memory & session-backed cache with TTL
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry<any>>();
const IN_FLIGHT_REQUESTS = new Map<string, Promise<any>>();
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

const getCached = <T>(key: string): T | null => {
  const now = Date.now();
  
  // 1. Check memory cache (fastest, 0ms)
  const mem = MEMORY_CACHE.get(key);
  if (mem && mem.expiry > now) {
    return mem.data as T;
  }
  if (mem) {
    MEMORY_CACHE.delete(key);
  }

  // 2. Check sessionStorage
  try {
    const raw = sessionStorage.getItem(`amz_cache_${key}`);
    if (raw) {
      const parsed: CacheEntry<T> = JSON.parse(raw);
      if (parsed.expiry > now) {
        MEMORY_CACHE.set(key, parsed); // hydrate memory cache
        return parsed.data;
      }
      sessionStorage.removeItem(`amz_cache_${key}`);
    }
  } catch {
    // SessionStorage unavailable or full
  }

  return null;
};

const setCached = <T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void => {
  const entry: CacheEntry<T> = {
    data,
    expiry: Date.now() + ttlMs,
  };
  MEMORY_CACHE.set(key, entry);

  try {
    sessionStorage.setItem(`amz_cache_${key}`, JSON.stringify(entry));
  } catch {
    // Handle quota limits gracefully
  }
};

/**
 * High-speed Amazon deal scanner with query deduplication,
 * gemini-3.8-flash optimization, and intelligent TTL caching.
 */
export const scanAmazonDeals = async (
  query: string,
  minDiscount: number,
  marketplace: string
): Promise<AmazonItem[]> => {
  const normalizedQuery = (query || "popular electronics").trim().toLowerCase();
  const cacheKey = `scan_${marketplace}_${minDiscount}_${normalizedQuery}`;

  // Check cache hit
  const cached = getCached<AmazonItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Request deduplication for simultaneous calls
  if (IN_FLIGHT_REQUESTS.has(cacheKey)) {
    return IN_FLIGHT_REQUESTS.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    const prompt = `Find 5 items on Amazon ${marketplace} with verified discount of >=${minDiscount}%.
Query: ${normalizedQuery}.
Provide concise JSON with accurate IDs, titles, prices, and links.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                price: { type: Type.NUMBER },
                originalPrice: { type: Type.NUMBER },
                discountPercentage: { type: Type.NUMBER },
                url: { type: Type.STRING },
                marketplace: { type: Type.STRING }
              },
              required: ["id", "title", "imageUrl", "price", "url", "marketplace"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      const parsed = JSON.parse(text) as AmazonItem[];
      setCached(cacheKey, parsed);
      return parsed;
    } catch (error) {
      console.error("Error scanning Amazon deals:", error);
      return [];
    } finally {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
    }
  })();

  IN_FLIGHT_REQUESTS.set(cacheKey, fetchPromise);
  return fetchPromise;
};

/**
 * High-speed cross-marketplace price comparison with deduplication and caching.
 */
export const comparePrices = async (productTitle: string): Promise<AmazonItem[]> => {
  const normalizedTitle = productTitle.trim().toLowerCase();
  if (!normalizedTitle) return [];

  const cacheKey = `compare_${normalizedTitle}`;

  // Check cache hit
  const cached = getCached<AmazonItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Request deduplication
  if (IN_FLIGHT_REQUESTS.has(cacheKey)) {
    return IN_FLIGHT_REQUESTS.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    const prompt = `Compare live prices for "${normalizedTitle}" across Amazon marketplaces (US, UK, CA, FR, DE).
Return JSON array with: id, title, price, marketplace, url.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                price: { type: Type.NUMBER },
                marketplace: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["id", "title", "price", "marketplace", "url"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      const parsed = JSON.parse(text) as AmazonItem[];
      setCached(cacheKey, parsed);
      return parsed;
    } catch (error) {
      console.error("Error comparing prices:", error);
      return [];
    } finally {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
    }
  })();

  IN_FLIGHT_REQUESTS.set(cacheKey, fetchPromise);
  return fetchPromise;
};

/**
 * Clears the speed cache when fresh live data is explicitly demanded.
 */
export const clearDealsCache = (): void => {
  MEMORY_CACHE.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("amz_cache_"))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
};
