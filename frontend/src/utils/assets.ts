/**
 * Get the base URL for assets
 * This handles both GitHub Pages deployment and local development
 */
export const getAssetUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In development, use root path
  if (import.meta.env.DEV) {
    return `/${cleanPath}`;
  }
  
  // In production (GitHub Pages), use base URL
  return `/CGC-Tournament-Manager/${cleanPath}`;
};

/**
 * Get the logo URL
 */
export const getLogoUrl = (): string => {
  return getAssetUrl('Tournament manager logo.png');
};
