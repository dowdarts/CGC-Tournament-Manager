/**
 * Get the base URL for assets
 * This handles both GitHub Pages deployment and custom domain
 */
export const getAssetUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Always use root path for custom domain
  return `/${cleanPath}`;
};

/**
 * Get the logo URL
 */
export const getLogoUrl = (): string => {
  return getAssetUrl('Tournament manager logo.png');
};
