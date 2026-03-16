import * as THREE from 'three'

export interface FresnelUniforms {
  [uniform: string]: { value: unknown }
  strength: { value: number }
  color: { value: THREE.Color }
  opacity: { value: number }
  invertAtFold: { value: number }
}

export function createFresnelMaterial(): { material: THREE.ShaderMaterial; uniforms: FresnelUniforms } {
  const uniforms: FresnelUniforms = {
    strength: { value: 0.6 },
    color: { value: new THREE.Color(0x5ce0d6) },
    opacity: { value: 0.8 },
    invertAtFold: { value: 0 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float strength;
      uniform vec3 color;
      uniform float opacity;
      uniform float invertAtFold;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 viewDir = normalize(vViewPos);
        float d = dot(vNormal, viewDir);
        float normalFresnel = pow(1.0 - abs(d), 3.0) * strength;
        float invertedFresnel = pow(abs(d), 3.0) * strength;
        float foldMask = smoothstep(0.0, 0.1, -d) * invertAtFold;
        float fresnel = mix(normalFresnel, invertedFresnel, foldMask);
        gl_FragColor = vec4(color * fresnel, fresnel * opacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  return { material, uniforms }
}
