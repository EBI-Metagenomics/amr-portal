export const EXTERNAL_DB_URLS = {
  KEGG: import.meta.env.VITE_KEGG_URL || 'https://www.genome.jp/entry/',
  COG: import.meta.env.VITE_COG_URL || 'https://www.ncbi.nlm.nih.gov/research/cog/cogcategory/',
  COG_CATEGORY:
    import.meta.env.VITE_COG_CATEGORY_URL || 'https://www.ncbi.nlm.nih.gov/research/cog/cogcategory/',
  COG_ACCESSION:
    import.meta.env.VITE_COG_ACCESSION_URL || 'https://www.ncbi.nlm.nih.gov/research/cog/cog/',
  GO: import.meta.env.VITE_GO_URL || 'https://amigo.geneontology.org/amigo/term/',
  INTERPRO: import.meta.env.VITE_INTERPRO_URL || 'https://www.ebi.ac.uk/interpro/entry/InterPro/',
  PFAM: import.meta.env.VITE_PFAM_URL || 'https://www.ebi.ac.uk/interpro/entry/pfam/',
  EC: import.meta.env.VITE_EC_URL || 'https://www.enzyme-database.org/query.php?ec=',
} as const;

export type ExternalAnnotationDb = keyof typeof EXTERNAL_DB_URLS;

/** Annotation attribute keys rendered as comma-separated inline links. */
export const INLINE_LINKABLE_ANNOTATION_KEYS: Record<string, ExternalAnnotationDb> = {
  Ontology_term: 'GO',
  uf_ontology_term: 'GO',
  interpro: 'INTERPRO',
  pfam: 'PFAM',
  eC_number: 'EC',
  uf_prot_rec_ecnumber: 'EC',
  uf_prot_alt_ecnumber: 'EC',
};

/** Annotation attribute keys rendered as a vertical list of links (existing behaviour). */
export const COLUMN_LINKABLE_ANNOTATION_KEYS: Record<string, ExternalAnnotationDb> = {
  kegg: 'KEGG',
  cog: 'COG',
};

export function generateExternalDbLink(dbType: ExternalAnnotationDb, id: string): string {
  const baseUrl = EXTERNAL_DB_URLS[dbType];
  const trimmed = id.trim();

  switch (dbType) {
    case 'KEGG': {
      const keggId = trimmed.startsWith('ko:') ? trimmed.slice(3) : trimmed;
      return `${baseUrl}${keggId}`;
    }
    case 'GO': {
      const goId = trimmed.toUpperCase().startsWith('GO:') ? trimmed : `GO:${trimmed}`;
      return `${baseUrl}${goId}`;
    }
    case 'INTERPRO':
    case 'PFAM':
      return `${baseUrl}${trimmed}/`;
    case 'EC':
      return `${baseUrl}${trimmed}`;
    case 'COG_ACCESSION': {
      const accession = trimmed.replace(/^COG:/i, '');
      return `${baseUrl}${accession}/`;
    }
    default:
      return `${baseUrl}${trimmed}`;
  }
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

/** Display label for a Dbxref entry such as `COG:COG2367`. */
export function formatDbxrefDisplayId(entry: string): string {
  return entry.trim();
}

export function isCogDbxref(entry: string): boolean {
  return /^COG:/i.test(entry.trim());
}

export function cogAccessionFromDbxref(entry: string): string {
  return entry.trim().replace(/^COG:/i, '');
}
