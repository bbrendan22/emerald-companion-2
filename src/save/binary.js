export function bytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError('Expected Uint8Array or ArrayBuffer');
}
export function view(input) {
  const b = bytes(input);
  return new DataView(b.buffer, b.byteOffset, b.byteLength);
}
export function sectorChecksum(input) {
  const v = view(input);
  if (v.byteLength % 4) throw new Error('Checksum payload must contain whole 32-bit words');
  let sum = 0;
  for (let i = 0; i < v.byteLength; i += 4) sum = (sum + v.getUint32(i, true)) >>> 0;
  return ((sum >>> 16) + (sum & 0xffff)) & 0xffff;
}
