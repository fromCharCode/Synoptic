import * as THREE from 'three'
import type { Patchbay } from '@core/types'
import { STYLES } from './MaterialFactory'

// Pre-allocated temporaries (zero GC in render loop)
const _tempColor = new THREE.Color()
const _tempHSL = { h: 0, s: 0, l: 0 }

export interface SceneManager {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  readonly cubeCamera: THREE.CubeCamera
  readonly cubeRenderTarget: THREE.WebGLCubeRenderTarget
  readonly renderTarget: THREE.WebGLRenderTarget
  readonly kGroup: THREE.Group
  readonly clippingPlane: THREE.Plane
  readonly lights: {
    key: THREE.DirectionalLight
    fill: THREE.DirectionalLight
    rim: THREE.PointLight
    warm: THREE.PointLight
    beat: THREE.PointLight
  }
  resize(width: number, height: number): void
  update(dt: number, patchbay: Patchbay, mouseX: number, mouseY: number, styleId: string): void
  updateCubeMap(): void
  setStyle(styleId: string): void
}

export function createSceneManager(canvas: HTMLCanvasElement): SceneManager {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x08080e)
  scene.fog = new THREE.FogExp2(0x08080e, 0.015)

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 2, 8)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.localClippingEnabled = true

  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
  const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget)
  scene.add(cubeCamera)

  const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    format: THREE.RGBAFormat,
  })

  // Lighting rig
  const ambient = new THREE.AmbientLight(0x1a1a2e, 0.5)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight(0xffeedd, 0.9)
  keyLight.position.set(5, 8, 6)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0x6688cc, 0.35)
  fillLight.position.set(-4, 3, -5)
  scene.add(fillLight)

  const rimLight = new THREE.PointLight(0x4488ff, 0.5, 30)
  rimLight.position.set(-3, -4, 6)
  scene.add(rimLight)

  const warmLight = new THREE.PointLight(0xff8844, 0.3, 25)
  warmLight.position.set(6, 2, -4)
  scene.add(warmLight)

  const beatLight = new THREE.PointLight(0xffffff, 0, 40)
  scene.add(beatLight)

  const kGroup = new THREE.Group()
  scene.add(kGroup)

  const clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  const mgr: SceneManager = {
    scene, camera, renderer, cubeCamera, cubeRenderTarget, renderTarget, kGroup, clippingPlane,
    lights: { key: keyLight, fill: fillLight, rim: rimLight, warm: warmLight, beat: beatLight },

    resize(width: number, height: number) {
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderTarget.setSize(width, height)
    },

    update(dt: number, patchbay: Patchbay, mouseX: number, mouseY: number, styleId: string) {
      const style = STYLES[styleId] ?? STYLES['glass']!

      // Camera mouse tracking
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02
      camera.position.y += (1.5 + mouseY * -0.5 - camera.position.y) * 0.02
      camera.position.z += (8 + patchbay.get('cDist') - camera.position.z) * 0.03

      // Camera shake
      const shake = patchbay.get('cShk')
      if (shake > 0.01) {
        camera.position.x += (Math.random() - 0.5) * shake
        camera.position.y += (Math.random() - 0.5) * shake * 0.7
      }

      // FOV modulation
      camera.fov = 50 + patchbay.get('camFov')
      camera.updateProjectionMatrix()

      camera.lookAt(0, 0, 0)

      // Fog
      ;(scene.fog as THREE.FogExp2).density = Math.max(0, style.fogDensity + patchbay.get('fog'))

      // Tone mapping exposure
      renderer.toneMappingExposure = 1.3 + patchbay.get('exp')

      // Beat light
      beatLight.intensity *= 0.9

      // Light modulation
      keyLight.intensity = 0.9 + patchbay.get('keyInt')
      fillLight.intensity = 0.35 + patchbay.get('fillInt')
      rimLight.intensity = 0.5 + patchbay.get('rimInt')

      // Light hue modulation
      const keyHueMod = patchbay.get('keyHue')
      if (Math.abs(keyHueMod) > 0.001) {
        _tempColor.set(0xffeedd).getHSL(_tempHSL)
        _tempColor.setHSL((_tempHSL.h + keyHueMod) % 1, _tempHSL.s, _tempHSL.l)
        keyLight.color.copy(_tempColor)
      }

      const fillHueMod = patchbay.get('fillHue')
      if (Math.abs(fillHueMod) > 0.001) {
        _tempColor.set(0x6688cc).getHSL(_tempHSL)
        _tempColor.setHSL((_tempHSL.h + fillHueMod) % 1, _tempHSL.s, _tempHSL.l)
        fillLight.color.copy(_tempColor)
      }

      const rimHueMod = patchbay.get('rimHue')
      if (Math.abs(rimHueMod) > 0.001) {
        _tempColor.set(0x4488ff).getHSL(_tempHSL)
        _tempColor.setHSL((_tempHSL.h + rimHueMod) % 1, _tempHSL.s, _tempHSL.l)
        rimLight.color.copy(_tempColor)
      }

      // Background hue modulation
      const bgHueMod = patchbay.get('bgHue')
      if (Math.abs(bgHueMod) > 0.001) {
        _tempColor.set(style.bgColor).getHSL(_tempHSL)
        _tempColor.setHSL((_tempHSL.h + bgHueMod) % 1, _tempHSL.s, _tempHSL.l)
        ;(scene.background as THREE.Color).copy(_tempColor)
        ;(scene.fog as THREE.FogExp2).color.copy(_tempColor)
      }

      void dt
    },

    updateCubeMap() {
      cubeCamera.update(renderer, scene)
    },

    setStyle(styleId: string) {
      const style = STYLES[styleId] ?? STYLES['glass']!
      ;(scene.background as THREE.Color).set(style.bgColor)
      ;(scene.fog as THREE.FogExp2).color.set(style.bgColor)
      ;(scene.fog as THREE.FogExp2).density = style.fogDensity
    },
  }

  return mgr
}
