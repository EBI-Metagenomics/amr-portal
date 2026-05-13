/**
 * AMR FTP-style layout for assembly `GCA_000214965.2` under a given root:
 * `{base}/GCA/000/214/GCA_000214965.2/` — FASTA and GFF use the same relative tree but may use different roots.
 */
export function buildGenomeAssemblyDirectoryUrl(genomeBaseUrl: string, assemblyId: string): string | null {
  const base = genomeBaseUrl.replace(/\/$/, '');
  const parts = parseAssemblyIdPathSegments(assemblyId);
  if (!parts) return null;
  const { prefix, chunk1, chunk2 } = parts;
  return `${base}/${prefix}/${chunk1}/${chunk2}/${assemblyId}`;
}

export function buildGenomeGffUri(assemblyDirectoryUrl: string, assemblyId: string): string {
  const dir = assemblyDirectoryUrl.replace(/\/$/, '');
  return `${dir}/${assemblyId}_annotations.gff.gz`;
}

function parseAssemblyIdPathSegments(assemblyId: string): {
  prefix: string;
  chunk1: string;
  chunk2: string;
} | null {
  const trimmed = assemblyId.trim();
  const underscore = trimmed.indexOf('_');
  if (underscore <= 0 || underscore >= trimmed.length - 1) return null;
  const prefix = trimmed.slice(0, underscore);
  const after = trimmed.slice(underscore + 1);
  const digitPart = after.replace(/\..*$/, '').replace(/\D/g, '');
  if (digitPart.length === 0) return null;
  const chunk1 = digitPart.slice(0, 3).padStart(3, '0');
  const chunk2 = digitPart.slice(3, 6).padStart(3, '0');
  return { prefix, chunk1, chunk2 };
}
