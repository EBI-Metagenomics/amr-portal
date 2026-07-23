/**
 * Patch generic-filehandle2 RemoteFile.stat for cross-origin bgzip FASTA.
 *
 * JBrowse needs the compressed file size when reading the last BGZF block
 * (no "next block" in .gzi). Upstream RemoteFile gets size from Content-Range
 * on range responses, but EBI FTP does not expose Content-Range to JS
 * (missing Access-Control-Expose-Headers). Mid-file reads still work because
 * .gzi provides both start and end compressed offsets.
 *
 * Content-Length from HEAD is CORS-safelisted and is available on that host.
 */
import { RemoteFile } from 'generic-filehandle2';

type RemoteFileInternals = {
  _stat?: { size: number };
  url: string;
  baseOverrides?: RequestInit;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  __amrHeadStatPatched?: boolean;
};

const proto = RemoteFile.prototype as unknown as RemoteFileInternals & {
  stat: () => Promise<{ size: number }>;
};

if (!proto.__amrHeadStatPatched) {
  proto.__amrHeadStatPatched = true;
  const originalStat = proto.stat;

  proto.stat = async function patchedStat(this: RemoteFileInternals) {
    if (!this._stat) {
      try {
        const head = await this.fetch(this.url, {
          ...(this.baseOverrides ?? {}),
          method: 'HEAD',
          mode: 'cors',
          redirect: 'follow',
        });
        const contentLength = head.headers.get('content-length');
        if (head.ok && contentLength) {
          const size = Number.parseInt(contentLength, 10);
          if (Number.isFinite(size) && size >= 0) {
            this._stat = { size };
            return this._stat;
          }
        }
      } catch {
        // Fall through to upstream stat (Content-Range path).
      }
    }
    return originalStat.call(this);
  };
}
