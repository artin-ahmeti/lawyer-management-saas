/**
 * The signature object: a clepsydra-like open vessel with a narrow waist, a
 * matte graphite body, a cobalt interior and controlled edge highlights. Plain
 * three.js, loaded lazily on capable desktops only; the static hero image is a
 * render of this same scene (see scripts/render-vessel.mjs).
 *
 * Colours are the Clepso tokens as linear values for the renderer: graphite is
 * dark-theme --surface-3 / --ink ramp, cobalt is the brand accent, the flow is
 * the dark-theme --accent.
 */
import {
  NeutralToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Mesh,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VESSEL, vesselRadius } from './vessel-profile';

const TOKENS = {
  graphite: '#191D25', // --surface (dark)
  lip: '#6E7686', // --border-strong (dark)
  cobalt: '#2B52D9', // brand cobalt (light-theme --accent)
  cobaltDeep: '#1B3699', // --chart-seq-6 (light)
  flow: '#88A3FF', // --accent (dark)
};

const HALF = VESSEL.half;
const WALL = VESSEL.wall;

function profile(inset: number, from: number, to: number, steps: number): Vector2[] {
  const pts: Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = from + ((to - from) * i) / steps;
    pts.push(new Vector2(Math.max(0.02, vesselRadius(y) - inset), y));
  }
  return pts;
}

/** A rounded lip joining the outer and inner walls at one end. */
function lip(y: number, up: boolean): Vector2[] {
  const r = vesselRadius(y);
  const cx = r - WALL / 2;
  const pts: Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (Math.PI * i) / 16;
    pts.push(
      new Vector2(cx + Math.cos(a) * (WALL / 2), y + (up ? 1 : -1) * Math.sin(a) * (WALL / 2)),
    );
  }
  return pts;
}

export interface VesselOptions {
  theme?: 'dark' | 'light';
  /** Render one still frame without the flow (used for the static fallback). */
  still?: boolean;
  onFirstFrame?: () => void;
}

export interface VesselHandle {
  setTheme(theme: 'dark' | 'light'): void;
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  setPointer(x: number, y: number): void;
  resize(): void;
  dispose(): void;
}

export function createVesselScene(
  canvas: HTMLCanvasElement,
  options: VesselOptions = {},
): VesselHandle {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  const env = environment.texture;
  scene.environment = env;

  const camera = new PerspectiveCamera(26, 4 / 5, 0.1, 50);
  camera.position.set(0, 2.9, 8.2);
  camera.lookAt(0, 0.08, 0);

  // Soft studio light: a warm-neutral key from the upper left, a cool cobalt rim
  // from behind, and a low fill so the graphite never goes flat black.
  const key = new DirectionalLight(new Color('#F4F3EF'), 1.35);
  key.position.set(-3.2, 4.2, 3.4);
  const rim = new DirectionalLight(new Color(TOKENS.flow), 3.2);
  rim.position.set(3.4, 1.6, -3.2);
  const fill = new AmbientLight(new Color('#A9B1BE'), 0.1);
  scene.add(key, rim, fill);

  const vessel = new Group();
  vessel.rotation.set(0.1, 0, -0.07);
  scene.add(vessel);

  const outerMat = new MeshPhysicalMaterial({
    color: new Color('#526ca5'),
    roughness: 0.18,
    metalness: 0.3,
    transmission: 0.22,
    thickness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 0.7,
    side: DoubleSide,
  });
  const innerMat = new MeshPhysicalMaterial({
    color: new Color(TOKENS.cobalt),
    vertexColors: true,
    roughness: 0.26,
    metalness: 0.02,
    emissive: new Color(TOKENS.cobaltDeep),
    emissiveIntensity: 0.3,
    clearcoat: 0.6,
    envMapIntensity: 0.6,
    side: DoubleSide,
  });
  const lipMat = new MeshPhysicalMaterial({
    color: new Color(TOKENS.lip),
    roughness: 0.26,
    metalness: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: DoubleSide,
  });

  const SEG = 96;
  const outer = new Mesh(new LatheGeometry(profile(0, -HALF, HALF, 96), SEG), outerMat);
  const innerGeo = new LatheGeometry(profile(WALL, HALF, -HALF, 96), SEG);
  // Depth: the cobalt darkens toward the waist so the mouth reads as a well.
  const pos = innerGeo.getAttribute('position');
  const shade = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.min(1, Math.abs(y) / HALF);
    const f = 0.22 + 0.68 * Math.pow(t, 1.6);
    shade.set([f, f, f], i * 3);
  }
  innerGeo.setAttribute('color', new Float32BufferAttribute(shade, 3));
  const inner = new Mesh(innerGeo, innerMat);
  const lipTop = new Mesh(new LatheGeometry(lip(HALF, true), SEG), lipMat);
  const lipBottom = new Mesh(new LatheGeometry(lip(-HALF, false), SEG), lipMat);
  vessel.add(outer, inner, lipTop, lipBottom);

  // The flow: a few cobalt points gathered into the mouth, aligned through the
  // waist and released below. Ambient only; paused on request.
  const COUNT = options.still ? 0 : 34;
  const dotGeo = new SphereGeometry(0.024, 12, 8);
  const dotMat = new MeshBasicMaterial({
    color: new Color(TOKENS.flow),
    transparent: true,
    opacity: 0.95,
  });
  const dots = new InstancedMesh(dotGeo, dotMat, Math.max(COUNT, 1));
  dots.count = COUNT;
  vessel.add(dots);
  const seeds = Array.from({ length: COUNT }, (_, i) => ({
    phase: i / COUNT,
    angle: i * 2.399963,
    spread: 0.35 + ((i * 17) % 29) / 58,
  }));
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();

  function placeDots(time: number) {
    for (let i = 0; i < COUNT; i++) {
      const seed = seeds[i]!;
      const t = (seed.phase + time / 9) % 1; // 9s per pass
      const y = 2.05 - t * 4.1;
      const inside = Math.abs(y) <= HALF;
      const r = inside
        ? Math.max(0, vesselRadius(y) - WALL - 0.05) * seed.spread
        : seed.spread * (y > 0 ? 0.55 : 0.4);
      const a = seed.angle + t * 2.2;
      p.set(Math.cos(a) * r, y, Math.sin(a) * r);
      const fade = t < 0.08 ? t / 0.08 : t > 0.9 ? (1 - t) / 0.1 : 1;
      const scale = (0.55 + 0.45 * (1 - Math.abs(y) / 2.05)) * fade;
      s.setScalar(Math.max(0.0001, scale));
      m.compose(p, q, s);
      dots.setMatrixAt(i, m);
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let paused = false;
  let running = false;
  let raf = 0;
  let elapsed = 0;
  let last = 0;
  let first = true;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(now: number) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!paused) {
      elapsed += dt;
      const smoothing = 1 - Math.exp(-dt * 4);
      pointer.x += (pointer.tx - pointer.x) * smoothing;
      pointer.y += (pointer.ty - pointer.y) * smoothing;
    }
    // At most ~3° of parallax.
    vessel.rotation.y = pointer.x * 0.05;
    vessel.rotation.x = 0.1 + pointer.y * 0.035;
    key.position.x = -3.2 + Math.sin(elapsed * 0.25) * 0.6;
    placeDots(elapsed);
    renderer.render(scene, camera);
    if (first) {
      first = false;
      options.onFirstFrame?.();
    }
    if (running && !paused) raf = requestAnimationFrame(frame);
  }

  function setTheme(theme: 'dark' | 'light') {
    outerMat.color.set(theme === 'dark' ? '#526ca5' : '#b4c8f6');
    lipMat.color.set(theme === 'dark' ? '#8eafff' : '#7797e4');
    fill.intensity = theme === 'dark' ? 0.18 : 0.45;
    renderer.render(scene, camera);
  }
  resize();
  setTheme(options.theme ?? 'dark');

  return {
    setTheme,
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    setPaused(next) {
      if (paused === next) return;
      paused = next;
      cancelAnimationFrame(raf);
      if (running && !paused) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    },
    setPointer(x, y) {
      pointer.tx = x;
      pointer.ty = y;
    },
    resize() {
      resize();
      if (!running) renderer.render(scene, camera);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      for (const mesh of [outer, inner, lipTop, lipBottom]) mesh.geometry.dispose();
      outerMat.dispose();
      innerMat.dispose();
      lipMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      dots.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
