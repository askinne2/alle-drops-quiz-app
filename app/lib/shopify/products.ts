/**
 * Product fetching utilities
 * Fetches products from Shopify's Product JSON endpoint (no auth required)
 * Uses /products/{handle}.js - the same approach as the original theme code
 */

/**
 * Product data from Shopify's /products/{handle}.js endpoint
 */
export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  description: string;
  featured_image: string | null;
  images: string[];
  price: number;
  price_min: number;
  price_max: number;
  compare_at_price: number | null;
  compare_at_price_min: number;
  compare_at_price_max: number;
  available: boolean;
  variants: Array<{
    id: number;
    title: string;
    price: number;
    compare_at_price: number | null;
    available: boolean;
  }>;
}

/**
 * Get product by handle using Shopify's Product JSON endpoint
 * This is called from the frontend (browser) and requires NO authentication
 * Uses /products/{handle}.js - same as original theme code
 * 
 * @param handle - Product handle (e.g., 'northwest-allergy-drops')
 * @returns Product data or null
 */
export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  try {
    const response = await fetch(`/products/${handle}.js`);

    if (!response.ok) {
      console.error(`Product fetch error: ${response.status} for handle: ${handle}`);
      return null;
    }

    const product = await response.json();
    return product;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

/**
 * Convert region value to product handle
 * Maps region values to product handles
 * 
 * @param region - Region value (e.g., 'northwest', 'southeast')
 * @returns Product handle (e.g., 'northwest-alledrops')
 */
export function regionToProductHandle(region: string): string {
  const regionMap: Record<string, string> = {
    northwest: "northwest-alledrops",
    southwest: "southwest-alledrops",
    north_central: "north-central-alledrops",
    south_central: "south-central-alledrops",
    midwest: "midwest-alledrops",
    southeast: "southeast-alledrops",
    northeast: "northeast-alledrops",
  };

  return regionMap[region] || `${region.replace(/_/g, "-")}-alledrops`;
}

