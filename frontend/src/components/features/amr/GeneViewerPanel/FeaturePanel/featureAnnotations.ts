export type FeatureAnnotation = {
  key: string;
  label: string;
  value: string;
};

const CORE_ATTRIBUTE_KEYS = new Set([
  'locus_tag',
  'ID',
  'gene',
  'Name',
  'product',
  'product_source',
  'Alias',
  'Note',
  'Dbxref',
]);

const ANNOTATION_ORDER = [
  'amrfinderplus_element_symbol',
  'amrfinderplus_element_name',
  'amrfinderplus_scope',
  'element_type',
  'element_subtype',
  'drug_class',
  'drug_subclass',
  'cog',
  'kegg',
  'eggNOG',
  'inference',
] as const;

const ATTRIBUTE_LABELS: Record<string, string> = {
  amrfinderplus_element_symbol: 'AMR element symbol',
  amrfinderplus_element_name: 'Element name',
  amrfinderplus_scope: 'Scope',
  element_type: 'Element type',
  element_subtype: 'Element subtype',
  drug_class: 'Drug class',
  drug_subclass: 'Drug subclass',
  Ontology_term: 'Ontology Term',
  interpro: 'InterPro',
  pfam: 'Pfam',
  eC_number: 'EC Number',
  cog: 'COG',
  kegg: 'KEGG',
  eggNOG: 'eggNOG',
  inference: 'Inference',
  uf_keyword: 'UniFIRE keyword',
  uf_ontology_term: 'UniFIRE ontology term',
  uf_chebi: 'UniFIRE ChEBI',
  uf_gene_name: 'UniFIRE gene name',
  uf_gene_name_synonym: 'UniFIRE gene name synonym',
  uf_pirsr_cofactor: 'UniFIRE PIRSR cofactor',
  uf_prot_rec_fullname: 'UniFIRE recommended protein name',
  uf_prot_rec_shortname: 'UniFIRE recommended short name',
  uf_prot_rec_ecnumber: 'UniFIRE recommended EC number',
  uf_prot_alt_fullname: 'UniFIRE alternative protein name',
  uf_prot_alt_shortname: 'UniFIRE alternative short name',
  uf_prot_alt_ecnumber: 'UniFIRE alternative EC number',
};

function formatAttributeLabel(key: string): string {
  if (ATTRIBUTE_LABELS[key]) return ATTRIBUTE_LABELS[key];
  return key
    .replace(/^amrfinderplus_/i, '')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function annotationSortRank(key: string): number {
  const index = ANNOTATION_ORDER.indexOf(key as (typeof ANNOTATION_ORDER)[number]);
  return index === -1 ? ANNOTATION_ORDER.length : index;
}

export function buildFeatureAnnotations(attributes: Record<string, string>): FeatureAnnotation[] {
  return Object.entries(attributes)
    .filter(([key, value]) => !CORE_ATTRIBUTE_KEYS.has(key) && value.trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: formatAttributeLabel(key),
      value: value.trim(),
    }))
    .sort((a, b) => {
      const rankDiff = annotationSortRank(a.key) - annotationSortRank(b.key);
      if (rankDiff !== 0) return rankDiff;
      return a.label.localeCompare(b.label);
    });
}
