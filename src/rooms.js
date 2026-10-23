// x is the position along the back wall. phase = build phase where the room goes live.
export const ROOMS = [
  { id: 'reception', x: -12.5, color: 0x4f8cff, phase: 2 },
  { id: 'library', x: -7.5, color: 0x2fbf8f, phase: 3 },
  { id: 'apply', x: -2.5, color: 0xff8a3d, phase: 4 },
  { id: 'consultant', x: 2.5, color: 0xb36bff, phase: 6 },
  { id: 'community', x: 7.5, color: 0xff4f6d, phase: 5 },
  { id: 'admin', x: 12.5, color: 0x6b7280, phase: 2, adminOnly: true },
]
