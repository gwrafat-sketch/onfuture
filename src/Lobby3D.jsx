import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ROOMS } from './rooms.js'

const DOOR_WALL_Z = -13.5
const STAND_Z = -10.6 // where the character stands in front of a door
const BOUNDS = { x: 16, zMin: -11.8, zMax: 12 }
const GLOBE = { x: 0, z: -3.5, r: 1.9 }

function makeCharacter() {
  const g = new THREE.Group()
  const skin = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.8 })
  const shirt = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 })
  const pants = new THREE.MeshStandardMaterial({ color: 0x1f2a4d, roughness: 0.8 })
  const hair = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 })
  const bag = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.6 })

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.6, 6, 12), shirt)
  body.position.y = 1.25
  body.castShadow = true
  g.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), skin)
  head.position.y = 2.05
  head.castShadow = true
  g.add(head)

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair
  )
  cap.position.y = 2.1
  g.add(cap)

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.28), bag)
  backpack.position.set(0, 1.3, -0.38)
  backpack.castShadow = true
  g.add(backpack)

  const makeLimb = (mat, w, h, x, y) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, y, 0)
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat)
    m.position.y = -h / 2
    m.castShadow = true
    pivot.add(m)
    g.add(pivot)
    return pivot
  }
  const legL = makeLimb(pants, 0.22, 0.75, -0.15, 0.8)
  const legR = makeLimb(pants, 0.22, 0.75, 0.15, 0.8)
  const armL = makeLimb(skin, 0.16, 0.6, -0.43, 1.6)
  const armR = makeLimb(skin, 0.16, 0.6, 0.43, 1.6)

  g.userData = { legL, legR, armL, armR, body }
  return g
}

function makeDoor(room) {
  const g = new THREE.Group()
  g.position.set(room.x, 0, DOOR_WALL_Z + 0.3)

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 4.8, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1b2447, roughness: 0.6 })
  )
  frame.position.y = 2.4
  g.add(frame)

  const panelMat = new THREE.MeshStandardMaterial({
    color: room.color,
    roughness: 0.45,
    emissive: room.color,
    emissiveIntensity: room.adminOnly ? 0.05 : 0.35,
  })
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.1, 4.2, 0.2), panelMat)
  panel.position.set(0, 2.1, 0.22)
  panel.userData.roomId = room.id
  g.add(panel)

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff3c4, metalness: 0.6, roughness: 0.3 })
  )
  knob.position.set(1.1, 2.0, 0.4)
  g.add(knob)

  // glowing mat on the floor
  const mat = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({ color: room.color, transparent: true, opacity: 0.28 })
  )
  mat.rotation.x = -Math.PI / 2
  mat.position.set(0, 0.02, STAND_Z - DOOR_WALL_Z - 0.3)
  g.add(mat)

  return { group: g, panel, panelMat, mat }
}

export default function Lobby3D({ t, onOpenRoom, started }) {
  const mountRef = useRef(null)
  const labelRefs = useRef({})
  const globeLabelRef = useRef(null)
  const keysRef = useRef({ up: false, down: false, left: false, right: false })
  const apiRef = useRef({})
  const onOpenRef = useRef(onOpenRoom)
  const [near, setNear] = useState(null)

  useEffect(() => {
    onOpenRef.current = onOpenRoom
  }, [onOpenRoom])

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1226)
    scene.fog = new THREE.Fog(0x0b1226, 28, 60)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.touchAction = 'none'

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120)

    // lights
    scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x1a1f3a, 0.9))
    const sun = new THREE.DirectionalLight(0xffffff, 1.1)
    sun.position.set(8, 16, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -22
    sun.shadow.camera.right = 22
    sun.shadow.camera.top = 18
    sun.shadow.camera.bottom = -18
    scene.add(sun)

    // floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x17203f, roughness: 0.85 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 30), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.z = 0
    floor.receiveShadow = true
    scene.add(floor)
    const grid = new THREE.GridHelper(38, 38, 0x2d3a6b, 0x1f2a52)
    grid.position.y = 0.01
    grid.scale.z = 30 / 38
    scene.add(grid)

    // back wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(38, 9, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x121a36, roughness: 0.9 })
    )
    wall.position.set(0, 4.5, DOOR_WALL_Z - 0.3)
    wall.receiveShadow = true
    scene.add(wall)

    // doors
    const doors = ROOMS.map((room) => ({ room, ...makeDoor(room) }))
    doors.forEach((d) => scene.add(d.group))
    const clickable = doors.map((d) => d.panel)

    // globe (country selector, Russia first)
    const globeGroup = new THREE.Group()
    globeGroup.position.set(GLOBE.x, 0, GLOBE.z)
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.4, 0.8, 24),
      new THREE.MeshStandardMaterial({ color: 0x1b2447, roughness: 0.6 })
    )
    pedestal.position.y = 0.4
    pedestal.castShadow = true
    globeGroup.add(pedestal)
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE.r * 0.75, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0x2447a8,
        roughness: 0.5,
        emissive: 0x0f2468,
        emissiveIntensity: 0.6,
      })
    )
    globe.position.y = 2.5
    globe.castShadow = true
    globeGroup.add(globe)
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE.r * 0.78, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0x7fb0ff, wireframe: true, transparent: true, opacity: 0.35 })
    )
    wire.position.y = 2.5
    globeGroup.add(wire)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff8a3d })
    )
    // a marker on the globe surface (Russia is just the first country)
    const mr = GLOBE.r * 0.75
    marker.position.set(mr * 0.62, mr * 0.7, mr * 0.35)
    globe.add(marker)
    scene.add(globeGroup)

    // decorative pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1b2447, roughness: 0.7 })
    ;[-17, 17].forEach((x) => {
      ;[-8, 4].forEach((z) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 7, 16), pillarMat)
        p.position.set(x, 3.5, z)
        p.castShadow = true
        scene.add(p)
      })
    })

    // character
    const hero = makeCharacter()
    hero.position.set(0, 0, 6)
    scene.add(hero)
    const heroShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    )
    heroShadow.rotation.x = -Math.PI / 2
    heroShadow.position.y = 0.03
    scene.add(heroShadow)

    // target marker (tap to move)
    const targetRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
    )
    targetRing.rotation.x = -Math.PI / 2
    targetRing.position.y = 0.04
    targetRing.visible = false
    scene.add(targetRing)

    // movement state
    const state = {
      target: null,
      pendingRoom: null,
      nearId: null,
      facing: 0,
      walkT: 0,
    }
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    const proj = new THREE.Vector3()

    const clampPos = (p) => {
      p.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, p.x))
      p.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, p.z))
    }

    const walkToRoom = (id) => {
      const room = ROOMS.find((r) => r.id === id)
      if (!room) return
      state.target = new THREE.Vector3(room.x, 0, STAND_Z)
      state.pendingRoom = id
      targetRing.position.set(room.x, 0.04, STAND_Z)
      targetRing.visible = true
    }
    apiRef.current.walkToRoom = walkToRoom
    apiRef.current.enterNear = () => {
      if (state.nearId) onOpenRef.current(state.nearId)
    }

    const resize = () => {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      renderer.setSize(w, h)
      camera.aspect = w / h
      // pull the camera back a little on narrow (portrait) screens
      camera.userData.back = w / h < 0.8 ? 1.35 : 1
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    const onPointerDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(clickable, false)
      if (hits.length) {
        walkToRoom(hits[0].object.userData.roomId)
        return
      }
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        const p = hit.clone()
        clampPos(p)
        state.target = p
        state.pendingRoom = null
        targetRing.position.set(p.x, 0.04, p.z)
        targetRing.visible = true
      }
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    const keyMap = {
      w: 'up', arrowup: 'up',
      s: 'down', arrowdown: 'down',
      a: 'left', arrowleft: 'left',
      d: 'right', arrowright: 'right',
    }
    const onKey = (down) => (e) => {
      const k = e.key.toLowerCase()
      if (keyMap[k]) {
        keysRef.current[keyMap[k]] = down
        e.preventDefault()
      } else if (down && (k === 'e' || k === 'enter')) {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') return
        apiRef.current.enterNear()
      }
    }
    const kd = onKey(true)
    const ku = onKey(false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    const clock = new THREE.Clock()
    const move = new THREE.Vector3()
    const camGoal = new THREE.Vector3()
    const camLook = new THREE.Vector3()
    let raf = 0

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(clock.getDelta(), 0.05)
      const time = clock.elapsedTime
      const k = keysRef.current

      // movement
      move.set(0, 0, 0)
      if (k.up) move.z -= 1
      if (k.down) move.z += 1
      if (k.left) move.x -= 1
      if (k.right) move.x += 1
      let step = 0
      const speed = 5.8
      if (move.lengthSq() > 0) {
        move.normalize()
        state.target = null
        state.pendingRoom = null
        targetRing.visible = false
        step = speed * dt
      } else if (state.target) {
        move.subVectors(state.target, hero.position)
        move.y = 0
        const dist = move.length()
        if (dist < 0.12) {
          state.target = null
          targetRing.visible = false
          move.set(0, 0, 0)
        } else {
          move.normalize()
          step = Math.min(speed * dt, dist)
        }
      }

      const moving = step > 0
      if (moving) {
        hero.position.addScaledVector(move, step)
        clampPos(hero.position)
        // keep out of the globe pedestal
        const gx = hero.position.x - GLOBE.x
        const gz = hero.position.z - GLOBE.z
        const gd = Math.hypot(gx, gz)
        const minD = 1.9
        if (gd < minD) {
          hero.position.x = GLOBE.x + (gx / (gd || 1)) * minD
          hero.position.z = GLOBE.z + (gz / (gd || 1)) * minD
        }
        const want = Math.atan2(move.x, move.z)
        let diff = want - state.facing
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        state.facing += diff * Math.min(1, dt * 12)
        hero.rotation.y = state.facing
        state.walkT += dt * 10
      } else {
        state.walkT *= 0.85
      }

      // walk animation
      const sw = moving ? Math.sin(state.walkT) * 0.7 : Math.sin(state.walkT) * 0.7
      const { legL, legR, armL, armR, body } = hero.userData
      legL.rotation.x = sw
      legR.rotation.x = -sw
      armL.rotation.x = -sw * 0.8
      armR.rotation.x = sw * 0.8
      body.position.y = 1.25 + (moving ? Math.abs(Math.sin(state.walkT)) * 0.06 : Math.sin(time * 2) * 0.01)
      heroShadow.position.x = hero.position.x
      heroShadow.position.z = hero.position.z

      // arrival at a door
      if (state.pendingRoom && !state.target) {
        const id = state.pendingRoom
        state.pendingRoom = null
        onOpenRef.current(id)
      }

      // which door is the character standing at?
      let nearId = null
      for (const d of doors) {
        const dx = hero.position.x - d.room.x
        const dz = hero.position.z - STAND_Z
        if (Math.hypot(dx, dz) < 2.4) {
          nearId = d.room.id
          break
        }
      }
      if (nearId !== state.nearId) {
        state.nearId = nearId
        setNear(nearId)
      }

      // door glow
      doors.forEach((d) => {
        const active = d.room.id === nearId
        d.mat.material.opacity = 0.22 + (active ? 0.3 + Math.sin(time * 5) * 0.08 : 0)
        d.panelMat.emissiveIntensity = d.room.adminOnly ? 0.05 : active ? 0.7 : 0.35
      })

      if (targetRing.visible) {
        const s = 1 + Math.sin(time * 6) * 0.12
        targetRing.scale.set(s, s, s)
      }

      globe.rotation.y += dt * 0.5
      wire.rotation.y -= dt * 0.2

      // camera follow
      const back = camera.userData.back || 1
      camGoal.set(hero.position.x * 0.85, 7.5 * back, hero.position.z + 10.5 * back)
      camera.position.lerp(camGoal, Math.min(1, dt * 4))
      camLook.set(hero.position.x * 0.85, 1.6, hero.position.z - 3)
      camera.lookAt(camLook)

      renderer.render(scene, camera)

      // update HTML labels
      const w = mount.clientWidth
      const h = mount.clientHeight
      const place = (el, x, y, z) => {
        if (!el) return
        proj.set(x, y, z).project(camera)
        if (proj.z > 1 || proj.z < -1) {
          el.style.display = 'none'
          return
        }
        el.style.display = ''
        const px = (proj.x * 0.5 + 0.5) * w
        const py = (-proj.y * 0.5 + 0.5) * h
        el.style.transform = `translate(-50%, -100%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`
      }
      doors.forEach((d) => place(labelRefs.current[d.room.id], d.room.x, 5.2, DOOR_WALL_Z + 0.5))
      place(globeLabelRef.current, GLOBE.x, 4.9, GLOBE.z)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => m.dispose())
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  const pad = (dir, val) => () => {
    keysRef.current[dir] = val
  }

  return (
    <div className="lobby">
      <div className="lobby-canvas" ref={mountRef} />

      <div className="labels" aria-hidden={!started}>
        {ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={'room-label' + (r.adminOnly ? ' locked' : '') + (near === r.id ? ' near' : '')}
            style={{ '--c': '#' + r.color.toString(16).padStart(6, '0') }}
            ref={(el) => (labelRefs.current[r.id] = el)}
            onClick={() => apiRef.current.walkToRoom && apiRef.current.walkToRoom(r.id)}
          >
            {r.adminOnly ? '🔒 ' : ''}
            {t.rooms[r.id].title}
          </button>
        ))}
        <div className="globe-label" ref={globeLabelRef}>
          <strong>{t.countryLabel}</strong>
          <span className="open">{t.countryOpen}</span>
          <span className="soon">{t.countrySoon}</span>
        </div>
      </div>

      {near && (
        <div className="near-bar">
          <span>
            {t.nearHint}: <b>{t.rooms[near].title}</b>
          </span>
          <button type="button" onClick={() => apiRef.current.enterNear()}>
            {t.enterRoom} ↵
          </button>
        </div>
      )}

      <div className="dpad" aria-hidden="true">
        {[
          ['up', '▲'],
          ['left', '◀'],
          ['down', '▼'],
          ['right', '▶'],
        ].map(([dir, sym]) => (
          <button
            key={dir}
            type="button"
            className={'dp-' + dir}
            onPointerDown={pad(dir, true)}
            onPointerUp={pad(dir, false)}
            onPointerLeave={pad(dir, false)}
            onPointerCancel={pad(dir, false)}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  )
      }
