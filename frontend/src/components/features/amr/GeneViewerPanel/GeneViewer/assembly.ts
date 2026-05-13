/**
 * AMR portal — mirrors METT `dataportal-app/.../gene-viewer/GeneViewer/assembly.ts`.
 * Bgzip FASTA + sidecars under one assembly directory, e.g.
 * `{dir}/{assembly}.fa.gz`, `.fa.gz.fai`, `.fa.gz.gzi`.
 */

export type GenomeMeta = {
  assembly_name: string;
  contigs: { name: string; length: number }[];
};

const getAssembly = (genomeMeta: GenomeMeta, assemblyDirectoryUrl: string) => {
  const dir = assemblyDirectoryUrl.replace(/\/$/, '');
  const asm = genomeMeta.assembly_name;
  const faUri = `${dir}/${asm}.fa.gz`;
  return {
    name: genomeMeta.assembly_name,
    sequence: {
      type: 'ReferenceSequenceTrack',
      trackId: 'reference',
      adapter: {
        type: 'BgzipFastaAdapter',
        sequences: genomeMeta.contigs.map(contig => ({
          name: contig.name,
          length: contig.length,
        })),
        fastaLocation: {
          uri: faUri,
        },
        faiLocation: {
          uri: `${faUri}.fai`,
        },
        gziLocation: {
          uri: `${faUri}.gzi`,
        },
      },
    },
  };
};

export default getAssembly;
