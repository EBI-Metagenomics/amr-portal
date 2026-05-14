/**
 * AMR portal — mirrors METT `dataportal-app/.../gene-viewer/GeneViewer/assembly.ts`.
 * Bgzip FASTA + sidecars from a direct FASTA URI, e.g.
 * `/path/sample.fa.gz`, `/path/sample.fa.gz.fai`, `/path/sample.fa.gz.gzi`.
 */

export type GenomeMeta = {
  assembly_name: string;
  contigs: { name: string; length: number }[];
};

const getAssembly = (genomeMeta: GenomeMeta, fastaUri: string) => {
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
          uri: fastaUri,
        },
        faiLocation: {
          uri: `${fastaUri}.fai`,
        },
        gziLocation: {
          uri: `${fastaUri}.gzi`,
        },
      },
    },
  };
};

export default getAssembly;
