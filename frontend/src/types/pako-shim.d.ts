declare module 'pako' {
  export function inflate(data: Uint8Array | ArrayBuffer): Uint8Array;
  export function inflateRaw(data: Uint8Array | ArrayBuffer): Uint8Array;
}
