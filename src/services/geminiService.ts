import { GoogleGenAI, Type } from "@google/genai";
import { AmazonItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const scanAmazonDeals = async (query: string, minDiscount: number, marketplace: string): Promise<AmazonItem[]> => {
  const prompt = `Find 5 items on Amazon ${marketplace} that have recently gone on discount of at least ${minDiscount}%.
  Search query: ${query || "popular electronics"}
  Return the results as a JSON array of objects with the following structure:
  {
    "id": "ASIN or identifier",
    "title": "item title",
    "imageUrl": "image url",
    "price": current_price_number,
    "originalPrice": original_price_number,
    "discountPercentage": discount_percent_number,
    "url": "amazon_link",
    "marketplace": "${marketplace}"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    return JSON.parse(text) as AmazonItem[];
  } catch (error) {
    console.error("Error scanning Amazon deals:", error);
    return [];
  }
};

export const comparePrices = async (productTitle: string): Promise<AmazonItem[]> => {
  const prompt = `Compare prices for "${productTitle}" across different Amazon marketplaces (US, UK, CA, FR, DE).
  Find the live prices if possible.
  Return as a JSON array of objects with: id, title, price, marketplace, url.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    return JSON.parse(text) as AmazonItem[];
  } catch (error) {
    console.error("Error comparing prices:", error);
    return [];
  }
};
