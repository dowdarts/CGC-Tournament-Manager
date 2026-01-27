/**
 * Get the base URL for assets
 * This handles both GitHub Pages deployment and custom domain
 */
export const getAssetUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Use import.meta.env.BASE_URL which is set by Vite config at build time
  // This will be '/CGC-Tournament-Manager/' for GitHub Pages
  const base = import.meta.env.BASE_URL;
  
  // Ensure base ends with / and doesn't create double slashes
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${cleanPath}`;
};

/**
 * Get the logo URL
 */
export const getLogoUrl = (): string => {
  return getAssetUrl('Tournament manager logo.png');
};
