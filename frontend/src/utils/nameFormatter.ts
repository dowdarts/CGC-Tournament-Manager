/**
 * Capitalizes the first letter of each word in a name
 * Handles hyphenated names, names with apostrophes, and multiple spaces
 * Examples:
 *   "john smith" -> "John Smith"
 *   "mary-jane o'brien" -> "Mary-Jane O'Brien"
 *   "jean-claude van damme" -> "Jean-Claude Van Damme"
 */
export function capitalizePlayerName(name: string): string {
  if (!name) return '';
  
  return name
    .trim()
    .toLowerCase()
    .split(/(\s+)/) // Split by spaces but keep the spaces
    .map(word => {
      if (!word || word.match(/^\s+$/)) return word; // Keep whitespace as-is
      
      // Handle hyphenated names (e.g., "Mary-Jane")
      if (word.includes('-')) {
        return word.split('-').map(part => capitalizeWord(part)).join('-');
      }
      
      // Handle names with apostrophes (e.g., "O'Brien")
      if (word.includes("'")) {
        return word.split("'").map(part => capitalizeWord(part)).join("'");
      }
      
      return capitalizeWord(word);
    })
    .join('');
}

/**
 * Capitalizes the first letter of a single word
 */
function capitalizeWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}
