export interface Vec3 {
  x: number
  y: number
  z: number
}

export const TOPOLOGY_INFO = [
  { name: 'Klassische Flasche', description: 'Hals durchdringt die Wand.' },
  { name: 'Figure-8', description: '8er-Selbstdurchdringung.' },
  { name: 'Pinched', description: 'Falte statt Durchdringung.' },
  { name: 'Möbius-Band', description: 'Ein Band, eine Seite.' },
  { name: 'Torus', description: 'Orientierbare Referenz.' },
  { name: 'Boys Surface', description: 'Projektive Ebene in 3D.' },
  { name: 'Enneper', description: 'Minimale Sattelfläche.' },
  { name: 'Dinis Spirale', description: 'Pseudosphärisch, negativ gekrümmt.' },
  { name: 'Superformula', description: 'Gielis — organisch, alien.' },
] as const

// Prototype: kC
export function kleinBottle(u: number, v: number): Vec3 {
  const cU = Math.cos(u)
  const sU = Math.sin(u)
  const cV = Math.cos(v)
  const sV = Math.sin(v)
  const r = 4 * (1 - cU / 2)
  let x: number
  let y: number
  if (u <= Math.PI) {
    x = 6 * cU * (1 + sU) + r * cU * cV
    y = 16 * sU + r * sU * cV
  } else {
    x = 6 * cU * (1 + sU) - r * cV
    y = 16 * sU
  }
  return { x: x * 0.12, y: y * 0.12 - 0.8, z: r * sV * 0.12 }
}

// Prototype: kF
export function figure8(u: number, v: number): Vec3 {
  const a = 2.2
  const cU = Math.cos(u)
  const sU = Math.sin(u)
  const cH = Math.cos(u / 2)
  const sH = Math.sin(u / 2)
  const sV = Math.sin(v)
  const s2 = Math.sin(2 * v)
  const r = a + cH * sV - sH * s2
  return { x: r * cU, y: r * sU, z: sH * sV + cH * s2 }
}

// Prototype: kP
export function pinched(u: number, v: number): Vec3 {
  const cU = Math.cos(u)
  const sU = Math.sin(u)
  const cV = Math.cos(v)
  const sV = Math.sin(v)
  const cH = Math.cos(u / 2)
  const sH = Math.sin(u / 2)
  const r = 1.5 + 0.8 * cV
  const p = 1 + 0.5 * Math.cos(u)
  return {
    x: r * cU * p,
    y: r * sU * p,
    z: 2 * sH * sV + 1.2 * cH * Math.sin(2 * v),
  }
}

// Prototype: mB
export function mobiusBand(u: number, v: number): Vec3 {
  const w = (v / (2 * Math.PI)) * 2 - 1
  const R = 2.5
  const r = R + w * Math.cos(u / 2) * 1.2
  return {
    x: r * Math.cos(u),
    y: r * Math.sin(u),
    z: w * Math.sin(u / 2) * 1.2,
  }
}

// Prototype: tS
export function torus(u: number, v: number): Vec3 {
  const R = 2.2
  const r = 0.9
  return {
    x: (R + r * Math.cos(v)) * Math.cos(u),
    y: (R + r * Math.cos(v)) * Math.sin(u),
    z: r * Math.sin(v),
  }
}

// Prototype: bS
export function boysSurface(u: number, v: number): Vec3 {
  const U = u - Math.PI
  const V = v / 2
  const cU = Math.cos(U)
  const sU = Math.sin(U)
  const cV = Math.cos(V)
  const s2 = Math.sqrt(2)
  const dn = 2 - s2 * Math.sin(3 * U) * Math.sin(2 * V)
  return {
    x: ((s2 * cV * cV * Math.cos(2 * U) + cU * Math.sin(2 * V)) / dn) * 1.8,
    y: ((s2 * cV * cV * Math.sin(2 * U) - sU * Math.sin(2 * V)) / dn) * 1.8,
    z: (3 * cV * cV / dn) * 1.5 - 1.5,
  }
}

// Prototype: eS
export function enneper(u: number, v: number): Vec3 {
  const U = (u / (Math.PI * 2)) * 4 - 2
  const V = (v / (Math.PI * 2)) * 4 - 2
  return {
    x: (U - (U * U * U) / 3 + U * V * V) * 0.5,
    y: (V - (V * V * V) / 3 + V * U * U) * 0.5,
    z: (U * U - V * V) * 0.5,
  }
}

// Prototype: dS
export function diniSpiral(u: number, v: number): Vec3 {
  const a = 1
  const b = 0.2
  const U = u * 2
  const V = (v / (Math.PI * 2)) * 1.8 + 0.1
  return {
    x: a * Math.cos(U) * Math.sin(V) * 1.5,
    y: a * Math.sin(U) * Math.sin(V) * 1.5,
    z: (a * (Math.cos(V) + Math.log(Math.tan(V / 2))) + b * U) * 0.25,
  }
}

// Prototype: sF
export function superformula(u: number, v: number): Vec3 {
  function sf(a: number, m: number, n1: number, n2: number, n3: number): number {
    const t = (m * a) / 4
    return Math.pow(
      Math.pow(Math.abs(Math.cos(t)), n2) + Math.pow(Math.abs(Math.sin(t)), n3),
      -1 / n1
    )
  }
  const r1 = sf(u, 6, 1, 1, 1)
  const r2 = sf(v - Math.PI, 4, 1, 1, 1)
  const sV = Math.sin(v - Math.PI)
  const cV = Math.cos(v - Math.PI)
  return {
    x: r1 * Math.cos(u) * r2 * cV * 2,
    y: r1 * Math.sin(u) * r2 * cV * 2,
    z: r2 * sV * 2,
  }
}

const SURFACES = [
  kleinBottle,
  figure8,
  pinched,
  mobiusBand,
  torus,
  boysSurface,
  enneper,
  diniSpiral,
  superformula,
]

function smoothstepInterp(t: number): number {
  return t * t * (3 - 2 * t)
}

// topology: 0-800 continuous. Each 100 = one topology.
// Morphs between adjacent topologies using smoothstep.
export function evaluateSurface(u: number, v: number, topology: number): Vec3 {
  const s = Math.min(Math.floor(topology / 100), SURFACES.length - 2)
  const t = smoothstepInterp(Math.min((topology - s * 100) / 100, 1))
  const a = SURFACES[s]!(u, v)
  const b = SURFACES[Math.min(s + 1, SURFACES.length - 1)]!(u, v)
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}
