export {};

declare global {
  interface Window {
    /** Set when a gene feature is clicked; used by JEXL `selectedGeneId` / `getGeneColor`. */
    selectedGeneId?: string;
  }
}
