/**
 * Get the base URL for assets
 * This handles both GitHub Pages deployment and custom domain
 */
export const getAssetUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Use import.meta.env.BASE_URL which is set by Vite config
  // This will be '/CGC-Tournament-Manager/' for GitHub Pages or '/' for custom domain
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${cleanPath}`;
};

/**
 * Get the logo URL
 */
export const getLogoUrl = (): string => {
  return getAssetUrl('Tournament manager logo.png');
};
