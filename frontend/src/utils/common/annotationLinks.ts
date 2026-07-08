export const EXTERNAL_DB_URLS = {
  KEGG: import.meta.env.VITE_KEGG_URL || 'https://www.genome.jp/entry/',
  COG: import.meta.env.VITE_COG_URL || 'https://www.ncbi.nlm.nih.gov/research/cog/cogcategory/',
  COG_CATEGORY: import.meta.env.VITE_COG_CATEGORY_URL || 'https://www.ncbi.nlm.nih.gov/research/cog/cogcategory/',
} as const;

export type ExternalAnnotationDb = keyof typeof EXTERNAL_DB_URLS;

export function generateExternalDbLink(dbType: ExternalAnnotationDb, id: string): string {
  const baseUrl = EXTERNAL_DB_URLS[dbType];
  if (dbType === 'KEGG') {
    const keggId = id.startsWith('ko:') ? id.slice(3) : id;
    return `${baseUrl}${keggId}`;
  }
  return `${baseUrl}${id}`;
}

export function splitAnnotationIds(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function formatKeggDisplayId(id: string): string {
  return id.startsWith('ko:') ? id.slice(3) : id;
}
