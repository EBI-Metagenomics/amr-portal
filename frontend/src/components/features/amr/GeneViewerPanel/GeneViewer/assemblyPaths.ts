/**
 * AMR FTP-style layout under a given root, for example:
 * `GCA_000214965.2` -> `{base}/GCA/000/214/GCA_000214965.2/`
 * `ERZ25103254` -> `{base}/ERZ/251/032/ERZ25103254/`
 *
 * FASTA and GFF use the same relative tree but may use different roots.
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
  if (!trimmed) return null;
  const prefixMatch = trimmed.match(/^[A-Za-z]+/);
  const prefix = prefixMatch?.[0];
  if (!prefix) return null;
  const rest = trimmed.slice(prefix.length);
  const digitPart = rest.replace(/\..*$/, '').replace(/\D/g, '');
  if (digitPart.length === 0) return null;
  const chunk1 = digitPart.slice(0, 3).padStart(3, '0');
  const chunk2 = digitPart.slice(3, 6).padStart(3, '0');
  return { prefix, chunk1, chunk2 };
}
