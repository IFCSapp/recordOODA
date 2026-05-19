"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEffect, useRef, useState, type PointerEvent } from "react";

const caseNavItem = { href: "/cases", stage: "Case", label: "ケース", helper: "対象を選ぶ", tone: "ooda-tone-case" };

const oodaNavItems = [
  { href: "/observe", stage: "Observe", label: "観察を書く", helper: "事実を拾う", tone: "ooda-tone-observe" },
  { href: "/orient", stage: "Orient", label: "仮説を立てる", helper: "見方をほぐす", tone: "ooda-tone-orient" },
  { href: "/decide", stage: "Decide", label: "支援を決める", helper: "一つ選ぶ", tone: "ooda-tone-decide" },
  { href: "/act", stage: "Act", label: "反応を見る", helper: "結果で更新", tone: "ooda-tone-act" }
];

const CARD_SPACING_DEGREES = 360 / oodaNavItems.length;
const AUTO_ROTATE_DEGREES_PER_SECOND = 10;
const DRAG_DEGREES_PER_PX = 0.42;
const DRAG_THRESHOLD_PX = 10;
const INERTIA_DECAY = 4.2;
const MIN_INERTIA_DEGREES_PER_SECOND = 2;
const MAX_INERTIA_DEGREES_PER_SECOND = 240;
const PLATE_WIDTH = 2.8;
const PLATE_HEIGHT = 1.78;
const PLATE_DEPTH = 0.22;
const PLATE_RADIUS = 0.11;
const PLATE_TEXTURE_WIDTH = 1024;
const PLATE_TEXTURE_HEIGHT = 640;
const PLATE_TEXTURE_SCALE = 2;
const OODA_COLORS = ["#376f8f", "#a45f45", "#55745f", "#b68a2c"];

type OodaNavItem = (typeof oodaNavItems)[number];
type ThreeCarouselState = {
  camera: THREE.Camera;
  objects: THREE.Object3D[];
  pointer: THREE.Vector2;
  raycaster: THREE.Raycaster;
};

type ThreePlate = {
  geometry: THREE.BufferGeometry;
  group: THREE.Group;
  materials: THREE.Material[];
  mesh: THREE.Mesh;
  shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  textures: THREE.Texture[];
};

export function OodaWorkflowMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopRef = useRef<HTMLDivElement | null>(null);
  const threeStateRef = useRef<ThreeCarouselState | null>(null);
  const angleRef = useRef(0);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const dragStartXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const inertiaVelocityRef = useRef(0);
  const dragMovedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    angleRef.current = angle;
  }, [angle]);

  useEffect(() => {
    const activeIndex = oodaNavItems.findIndex((item) => pathname.startsWith(item.href));
    if (activeIndex >= 0) {
      setAngle(-activeIndex * CARD_SPACING_DEGREES);
    }
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = canvas?.parentElement;
    if (!canvas || !track) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xc9d7d6, 1.5);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    keyLight.position.set(-3.8, 4.8, 4.2);
    const rimLight = new THREE.DirectionalLight(0xdff8ff, 1.4);
    rimLight.position.set(4.2, 1.6, -3.8);
    scene.add(ambient, keyLight, rimLight);

    const textureAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const plates = oodaNavItems.map((item, index) => createThreePlate(item, index, textureAnisotropy));
    plates.forEach((plate) => scene.add(plate.shadow, plate.group));

    threeStateRef.current = {
      camera,
      objects: plates.map((plate) => plate.mesh),
      pointer: new THREE.Vector2(),
      raycaster: new THREE.Raycaster()
    };

    const resize = () => {
      const width = Math.max(track.clientWidth, 1);
      const height = Math.max(track.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const viewHeight = width < 480 ? 4.35 : 3.55;
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    };

    let frame = 0;
    const render = () => {
      const width = track.clientWidth;
      const isNarrow = width < 480;
      const radiusX = isNarrow ? 1.65 : 2.7;
      const radiusZ = isNarrow ? 1.0 : 1.36;
      const baseY = 0;

      plates.forEach((plate, index) => {
        const degrees = angleRef.current + index * CARD_SPACING_DEGREES;
        const radians = (degrees * Math.PI) / 180;
        const side = Math.sin(radians);
        const front = Math.cos(radians);
        const depthRatio = (front + 1) / 2;
        const sideProfile = Math.abs(side);
        const scale = 0.72 + depthRatio * 0.28 - sideProfile * 0.05;
        const orbitTiltY = (1 - depthRatio) * (isNarrow ? 0.07 : 0.1);

        const sideRelief = side * Math.pow(sideProfile, 1.35) * (isNarrow ? 0.16 : 0.32);
        const x = side * radiusX + sideRelief;
        const y = baseY - orbitTiltY;
        const z = front * radiusZ;
        plate.group.position.set(x, y, z);
        plate.group.rotation.set(0, radians, 0);
        plate.group.scale.setScalar(scale);
        plate.shadow.position.set(x + side * 0.04, y - PLATE_HEIGHT * scale * 0.53 - 0.08, z - 0.24);
        plate.shadow.scale.set(
          PLATE_WIDTH * scale * (0.46 + depthRatio * 0.3 + sideProfile * 0.16),
          0.24 * scale * (0.78 + depthRatio * 0.24),
          1
        );
        plate.shadow.material.opacity = 0.055 + depthRatio * 0.075 + sideProfile * 0.015;
        plate.mesh.renderOrder = 10 + Math.round(depthRatio * 20 + sideProfile * 4);
      });

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(track);
    resize();
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      threeStateRef.current = null;
      plates.forEach(disposeThreePlate);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let frame = 0;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const elapsedSeconds = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (!isDraggingRef.current) {
        const inertiaVelocity = inertiaVelocityRef.current;
        if (Math.abs(inertiaVelocity) > MIN_INERTIA_DEGREES_PER_SECOND) {
          setAngle((current) => current + inertiaVelocity * elapsedSeconds);
          inertiaVelocityRef.current = inertiaVelocity * Math.exp(-INERTIA_DECAY * elapsedSeconds);
        } else if (!isPausedRef.current) {
          inertiaVelocityRef.current = 0;
          setAngle((current) => current - elapsedSeconds * AUTO_ROTATE_DEGREES_PER_SECOND);
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const captureTarget =
      event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-ooda-drag-surface]") ?? event.currentTarget : event.currentTarget;
    captureTarget.setPointerCapture(event.pointerId);
    captureTargetRef.current = captureTarget;
    dragStartXRef.current = event.clientX;
    lastXRef.current = event.clientX;
    lastMoveTimeRef.current = performance.now();
    inertiaVelocityRef.current = 0;
    dragMovedRef.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    const deltaX = event.clientX - lastXRef.current;
    const now = performance.now();
    const elapsedSeconds = Math.max((now - lastMoveTimeRef.current) / 1000, 0.001);
    const angleDelta = deltaX * DRAG_DEGREES_PER_PX;
    const totalDelta = Math.abs(event.clientX - dragStartXRef.current);
    if (totalDelta > DRAG_THRESHOLD_PX) {
      dragMovedRef.current = true;
    }
    inertiaVelocityRef.current = clamp(angleDelta / elapsedSeconds, -MAX_INERTIA_DEGREES_PER_SECOND, MAX_INERTIA_DEGREES_PER_SECOND);
    setAngle((current) => current + angleDelta);
    lastXRef.current = event.clientX;
    lastMoveTimeRef.current = now;
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    const wasDrag = dragMovedRef.current;
    const captureTarget = captureTargetRef.current;
    if (captureTarget?.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
    captureTargetRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (!wasDrag) {
      const href = getThreePlateHref(event);
      if (href) {
        router.push(href);
      }
    }
    window.setTimeout(() => {
      dragMovedRef.current = false;
    }, 0);
  }

  function getThreePlateHref(event: PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    const state = threeStateRef.current;
    if (!canvas || !state) return null;

    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;

    state.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const hits = state.raycaster.intersectObjects(state.objects, true);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (typeof object.userData.href === "string") return object.userData.href;
        object = object.parent;
      }
    }
    const frontIndex = positiveModulo(Math.round(-angleRef.current / CARD_SPACING_DEGREES), oodaNavItems.length);
    return oodaNavItems[frontIndex].href;
  }

  return (
    <nav aria-label="OODAの流れ" className="workflow-menu-shell">
      <Link
        href={caseNavItem.href}
        className={`case-entry-card ${caseNavItem.tone}`}
        data-ooda-drag-surface
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
      >
        <span className="ooda-orbit-number">0</span>
        <span className="ooda-orbit-stage">{caseNavItem.stage}</span>
        <span className="ooda-orbit-label">{caseNavItem.label}</span>
        <span className="ooda-orbit-helper">{caseNavItem.helper}</span>
      </Link>

      <div
        ref={loopRef}
        className={`ooda-loop-shell${isDragging ? " is-dragging" : ""}`}
        data-ooda-drag-surface
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        onFocusCapture={() => {
          isPausedRef.current = true;
        }}
        onBlurCapture={() => {
          isPausedRef.current = false;
        }}
      >
        <div className="ooda-orbit-grid" aria-hidden="true" />
        <div className="ooda-orbit-track">
          <canvas ref={canvasRef} className="ooda-three-canvas" data-ooda-drag-surface aria-label="OODAの3D回転メニュー" />
          <div className="ooda-three-link-list">
            {oodaNavItems.map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}>
                {item.stage}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function createThreePlate(item: OodaNavItem, index: number, textureAnisotropy: number): ThreePlate {
  const accent = OODA_COLORS[index % OODA_COLORS.length];
  const geometry = new RoundedBoxGeometry(PLATE_WIDTH, PLATE_HEIGHT, PLATE_DEPTH, 5, PLATE_RADIUS);
  const frontTexture = createPlateTexture(item, index, accent, false, textureAnisotropy);
  const backTexture = createPlateTexture(item, index, accent, true, textureAnisotropy);
  const contactShadow = createContactShadow();
  const sideColor = new THREE.Color(accent).lerp(new THREE.Color("#f4f8f6"), 0.78);
  const edgeColor = new THREE.Color(accent).lerp(new THREE.Color("#f8fbfa"), 0.82);

  const frontMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    map: frontTexture,
    metalness: 0,
    roughness: 0.16,
    side: THREE.FrontSide
  });
  const backMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    map: backTexture,
    metalness: 0,
    roughness: 0.22,
    side: THREE.FrontSide
  });
  const sideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    color: sideColor,
    emissive: sideColor,
    emissiveIntensity: 0.18,
    metalness: 0,
    roughness: 0.18,
    side: THREE.DoubleSide
  });
  const topMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    color: edgeColor,
    emissive: edgeColor,
    emissiveIntensity: 0.16,
    metalness: 0,
    roughness: 0.2,
    side: THREE.DoubleSide
  });
  const bottomMaterial = topMaterial.clone();
  const materials = [sideMaterial, sideMaterial.clone(), topMaterial, bottomMaterial, frontMaterial, backMaterial];
  const mesh = new THREE.Mesh(geometry, materials);
  const group = new THREE.Group();
  mesh.userData.href = item.href;
  group.userData.href = item.href;
  group.add(mesh);

  return {
    geometry,
    group,
    materials,
    mesh,
    shadow: contactShadow.mesh,
    textures: [frontTexture, backTexture, contactShadow.texture]
  };
}

function createPlateTexture(item: OodaNavItem, index: number, accent: string, isBack: boolean, textureAnisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = PLATE_TEXTURE_WIDTH * PLATE_TEXTURE_SCALE;
  canvas.height = PLATE_TEXTURE_HEIGHT * PLATE_TEXTURE_SCALE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create plate texture");
  }

  context.scale(PLATE_TEXTURE_SCALE, PLATE_TEXTURE_SCALE);
  context.clearRect(0, 0, PLATE_TEXTURE_WIDTH, PLATE_TEXTURE_HEIGHT);
  const accentColor = new THREE.Color(accent);
  const plateBase = accentColor.clone().lerp(new THREE.Color("#dce8e3"), 0.44).getStyle();
  const plateLight = accentColor.clone().lerp(new THREE.Color("#f7fbf8"), 0.66).getStyle();
  const plateDark = accentColor.clone().lerp(new THREE.Color("#cbd5d1"), 0.52).getStyle();
  const printColor = "#05070b";
  const printAccent = accentColor.clone().lerp(new THREE.Color(printColor), 0.42).getStyle();

  const plateGradient = context.createLinearGradient(0, 0, PLATE_TEXTURE_WIDTH, PLATE_TEXTURE_HEIGHT);
  plateGradient.addColorStop(0, plateLight);
  plateGradient.addColorStop(0.34, plateBase);
  plateGradient.addColorStop(1, plateDark);
  fillRoundedRect(context, 0, 0, PLATE_TEXTURE_WIDTH, PLATE_TEXTURE_HEIGHT, 0, plateGradient);

  if (isBack) {
    context.fillStyle = printColor;
    context.font = '900 184px "Yu Gothic", "Meiryo", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(item.stage, PLATE_TEXTURE_WIDTH / 2, PLATE_TEXTURE_HEIGHT / 2);
  } else {
    const contentLeft = 88;
    const contentWidth = PLATE_TEXTURE_WIDTH - contentLeft * 2;

    context.textAlign = "left";
    context.textBaseline = "alphabetic";

    context.fillStyle = printColor;
    context.font = '900 64px "Yu Gothic", "Meiryo", sans-serif';
    context.fillText(String(index + 1).padStart(2, "0"), contentLeft, 128);

    context.fillStyle = printAccent;
    context.font = '900 72px "Yu Gothic", "Meiryo", sans-serif';
    context.fillText(item.stage, contentLeft + 118, 128);

    context.globalAlpha = 0.2;
    fillRoundedRect(context, contentLeft, 176, contentWidth, 6, 3, printAccent);
    context.globalAlpha = 1;

    context.fillStyle = printColor;
    context.font = '900 132px "Yu Gothic", "Meiryo", sans-serif';
    drawWrappedText(context, item.label, contentLeft, 350, contentWidth, 136, 2);

    context.fillStyle = printColor;
    context.font = '900 68px "Yu Gothic", "Meiryo", sans-serif';
    drawWrappedText(context, item.helper, contentLeft, 552, contentWidth, 78, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = textureAnisotropy;
  texture.generateMipmaps = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createContactShadow() {
  const texture = createContactShadowTexture();
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1f2933"),
    depthTest: false,
    depthWrite: false,
    map: texture,
    opacity: 0.1,
    side: THREE.DoubleSide,
    transparent: true
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = -30;
  return { mesh, texture };
}

function createContactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create contact shadow texture");
  }

  const gradient = context.createRadialGradient(192, 64, 8, 192, 64, 190);
  gradient.addColorStop(0, "rgba(31, 41, 51, 0.34)");
  gradient.addColorStop(0.45, "rgba(31, 41, 51, 0.16)");
  gradient.addColorStop(1, "rgba(31, 41, 51, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function disposeThreePlate(plate: ThreePlate) {
  plate.geometry.dispose();
  plate.shadow.geometry.dispose();
  plate.shadow.material.dispose();
  plate.materials.forEach((material) => material.dispose());
  plate.textures.forEach((texture) => texture.dispose());
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: CanvasGradient | string
) {
  context.fillStyle = fillStyle;
  roundedRectPath(context, x, y, width, height, radius);
  context.fill();
}

function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const characters = Array.from(text);
  const lines: string[] = [];
  let line = "";
  characters.forEach((character) => {
    const next = `${line}${character}`;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = character;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((lineText, index) => {
    context.fillText(lineText, x, y + index * lineHeight);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}
