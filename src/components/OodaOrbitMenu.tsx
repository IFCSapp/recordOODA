"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type OodaOrbitItem = {
  href: string;
  stage: string;
  stageLabel?: string;
  label: string;
  helper: string;
  tone: string;
};

type Plate = {
  group: THREE.Group;
  geometry: THREE.BoxGeometry;
  basePositions: Float32Array;
  materials: THREE.Material[];
  textures: THREE.Texture[];
};

const CARD_SPACING = 90;
const PLATE_WIDTH = 2.36;
const PLATE_HEIGHT = 1.34;
const PLATE_DEPTH = 0.16;
const PLATE_WIDTH_SEGMENTS = 22;
const SIDE_PLATE_MAX_BEND = 0.36;
const COLORS = ["#376f8f", "#a45f45", "#55745f", "#b68a2c"];
const AUTO_ROTATE_DEGREES_PER_SECOND = 6;
const DRAG_DEGREES_PER_PX = 0.42;
const DRAG_THRESHOLD_PX = 10;
const INERTIA_DECAY = 4.2;
const MIN_INERTIA_DEGREES_PER_SECOND = 2;
const MAX_INERTIA_DEGREES_PER_SECOND = 240;
const EXPERIENCE_LABELS: Record<string, string> = {
  Observe: "見る",
  Orient: "見立てる",
  Decide: "選ぶ",
  Act: "反応"
};

export function OodaOrbitMenu({ items, currentPath }: { items: readonly OodaOrbitItem[]; currentPath: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => currentPath.startsWith(item.href))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = canvas?.parentElement;
    if (!canvas || !track) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
    camera.position.set(0, 0.42, 7.2);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xd8e1dd, 2.2);
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-3.2, 4.4, 4.8);
    const rim = new THREE.DirectionalLight(0xe8f8ff, 1.2);
    rim.position.set(3.2, 1.4, -3.5);
    scene.add(ambient, key, rim);

    const plates = items.map((item, index) => createPlate(item, index));
    plates.forEach((plate) => scene.add(plate.group));
    const plateMeshes = plates.map((plate) => plate.group.children[0]).filter((object): object is THREE.Object3D => Boolean(object));

    const loop = createLoopRing(activeIndex);
    scene.add(loop.group);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let width = 1;
    let height = 1;
    const resize = () => {
      width = Math.max(track.clientWidth, 1);
      height = Math.max(canvas.clientHeight || track.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const viewHeight = width < 480 ? 2.05 : 3.08;
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(track);
    observer.observe(canvas);
    resize();

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let lastFrameTime = performance.now();
    const targetAngle = -activeIndex * CARD_SPACING;
    let angle = targetAngle;
    let inertiaVelocity = 0;
    let isDragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let lastX = 0;
    let lastMoveTime = 0;

    const getPlateHref = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(plateMeshes, true);
      for (const hit of hits) {
        let object: THREE.Object3D | null = hit.object;
        while (object) {
          if (typeof object.userData.href === "string") return object.userData.href;
          object = object.parent;
        }
      }
      return null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
      isDragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      lastX = event.clientX;
      lastMoveTime = performance.now();
      inertiaVelocity = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = event.clientX - lastX;
      const now = performance.now();
      const elapsedSeconds = Math.max((now - lastMoveTime) / 1000, 0.001);
      const angleDelta = deltaX * DRAG_DEGREES_PER_PX;
      angle += angleDelta;
      inertiaVelocity = clamp(angleDelta / elapsedSeconds, -MAX_INERTIA_DEGREES_PER_SECOND, MAX_INERTIA_DEGREES_PER_SECOND);
      if (Math.abs(event.clientX - dragStartX) > DRAG_THRESHOLD_PX) {
        dragMoved = true;
      }
      lastX = event.clientX;
      lastMoveTime = now;
    };

    const stopDragging = (event: PointerEvent) => {
      if (!isDragging) return;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.classList.remove("is-dragging");
      isDragging = false;
      if (!dragMoved) {
        const href = getPlateHref(event);
        if (href) {
          router.push(href);
        }
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);

    const render = (time: number) => {
      const elapsed = Math.min((time - lastFrameTime) / 1000, 0.05);
      lastFrameTime = time;
      if (!isDragging) {
        if (Math.abs(inertiaVelocity) > MIN_INERTIA_DEGREES_PER_SECOND) {
          angle += inertiaVelocity * elapsed;
          inertiaVelocity *= Math.exp(-INERTIA_DECAY * elapsed);
        } else if (!prefersReducedMotion) {
          inertiaVelocity = 0;
          angle -= elapsed * AUTO_ROTATE_DEGREES_PER_SECOND;
        }
      }
      const baseDegrees = angle;
      const isNarrow = width < 520;
      const radiusX = isNarrow ? 1.58 : 2.06;
      const radiusZ = isNarrow ? 0.86 : 1.12;

      plates.forEach((plate, index) => {
        const degrees = baseDegrees + index * CARD_SPACING;
        const radians = degreesToRadians(degrees);
        const side = Math.sin(radians);
        const front = Math.cos(radians);
        const depth = (front + 1) / 2;
        const sideDepth = Math.pow(Math.abs(side), 1.35);
        const bend = sideDepth * SIDE_PLATE_MAX_BEND;
        const bendDirection = front >= 0 ? 1 : -1;
        const scale = 0.7 + depth * 0.3 - sideDepth * 0.05;
        bendPlateGeometry(plate, bend, bendDirection);
        plate.group.position.set(side * radiusX, -0.02 - (1 - depth) * 0.12, front * radiusZ);
        plate.group.rotation.set(0, radians, 0);
        plate.group.scale.setScalar(scale);
        plate.group.renderOrder = 10 + Math.round(depth * 10);
      });

      loop.group.rotation.z = degreesToRadians(baseDegrees * 0.2);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", stopDragging);
      canvas.removeEventListener("pointercancel", stopDragging);
      observer.disconnect();
      plates.forEach(disposePlate);
      disposeLoop(loop);
      renderer.dispose();
    };
  }, [activeIndex, items, router]);

  return (
    <div className="ooda-loop-shell" aria-label="OODAの3Dループ">
      <span className="sr-only">OODAは一巡して戻る。見る、見立てる、選ぶ、反応で戻す。</span>
      <div className="ooda-orbit-grid" aria-hidden="true" />
      <div className="ooda-orbit-track">
        <canvas ref={canvasRef} className="ooda-three-canvas" aria-label="OODA loop" />
        <div className="ooda-three-link-list">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={currentPath.startsWith(item.href) ? "page" : undefined}>
              {item.stageLabel ?? item.stage}: {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="ooda-experience-rail" aria-label="OODAの体験順序">
        {items.map((item, index) => {
          const isCurrent = currentPath.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={isCurrent ? "step" : undefined} className={`ooda-experience-step ooda-tone-${item.tone}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{EXPERIENCE_LABELS[item.stage] ?? item.stageLabel ?? item.stage}</strong>
              <small>{item.helper}</small>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function createPlate(item: OodaOrbitItem, index: number): Plate {
  const accent = COLORS[index % COLORS.length];
  const geometry = new THREE.BoxGeometry(PLATE_WIDTH, PLATE_HEIGHT, PLATE_DEPTH, PLATE_WIDTH_SEGMENTS, 1, 1);
  const basePositions = new Float32Array(geometry.attributes.position.array as Float32Array);
  const front = createPlateTexture(item, index, accent, false);
  const back = createPlateTexture(item, index, accent, true);
  const sideColor = new THREE.Color(accent).lerp(new THREE.Color("#f6faf8"), 0.74);
  const edge = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.7,
    clearcoatRoughness: 0.16,
    color: sideColor,
    roughness: 0.32
  });
  const materials: THREE.Material[] = [
    edge,
    edge.clone(),
    edge.clone(),
    edge.clone(),
    new THREE.MeshPhysicalMaterial({ clearcoat: 0.9, clearcoatRoughness: 0.08, map: front, roughness: 0.2 }),
    new THREE.MeshPhysicalMaterial({ clearcoat: 0.72, clearcoatRoughness: 0.18, map: back, roughness: 0.28 })
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.href = item.href;
  const group = new THREE.Group();
  group.userData.href = item.href;
  group.add(mesh);

  return { group, geometry, basePositions, materials, textures: [front, back] };
}

function bendPlateGeometry(plate: Plate, bend: number, direction: number) {
  const position = plate.geometry.attributes.position;
  const halfWidth = PLATE_WIDTH / 2;
  const shouldBend = bend > 0.001;
  const radius = shouldBend ? halfWidth / bend : 0;

  for (let index = 0; index < position.count; index += 1) {
    const offset = index * 3;
    const x = plate.basePositions[offset];
    const y = plate.basePositions[offset + 1];
    const z = plate.basePositions[offset + 2];

    if (!shouldBend) {
      position.setXYZ(index, x, y, z);
      continue;
    }

    const normalizedX = clamp(x / halfWidth, -1, 1);
    const theta = normalizedX * bend;
    const curvedX = Math.sin(theta) * radius;
    const curvedZ = z + direction * (Math.cos(theta) * radius - radius);
    position.setXYZ(index, curvedX, y, curvedZ);
  }

  position.needsUpdate = true;
  plate.geometry.computeVertexNormals();
}

function createLoopRing(activeIndex: number) {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const radiusX = 1.48;
  const radiusY = 0.82;
  const activeLoopIndex = activeIndex % COLORS.length;

  const addLoopMesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    geometries.push(geometry);
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1;
    group.add(mesh);
    return mesh;
  };

  COLORS.forEach((color, index) => {
    const isCurrent = index === activeLoopIndex;
    const startDegrees = index * 90 + 4;
    const endDegrees = index * 90 + 83;
    const baseOpacity = isCurrent ? 0.5 : 0.32;
    const arcMaterial = new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity: baseOpacity,
      transparent: true
    });
    addLoopMesh(createLoopArcGeometry(startDegrees, endDegrees, radiusX, radiusY, isCurrent ? 0.014 : 0.012), arcMaterial);

    const streamMaterial = new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity: isCurrent ? 0.64 : 0.42,
      transparent: true
    });
    addLoopMesh(createLoopArcGeometry(endDegrees - 10, endDegrees - 3, radiusX * 0.94, radiusY * 0.94, isCurrent ? 0.015 : 0.012), streamMaterial);

    const nodeGeometry = new THREE.SphereGeometry(isCurrent ? 0.042 : 0.034, 16, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity: isCurrent ? 0.66 : 0.46,
      transparent: true
    });
    const node = addLoopMesh(nodeGeometry, nodeMaterial);
    const nodeAngle = degreesToRadians(startDegrees - 5);
    node.position.set(Math.sin(nodeAngle) * radiusX, Math.cos(nodeAngle) * radiusY, 0);
  });

  group.position.set(0, -0.04, 0.84);
  group.scale.set(0.98, 0.98, 0.98);
  return { group, geometries, materials };
}

function createLoopArcGeometry(startDegrees: number, endDegrees: number, radiusX: number, radiusY: number, tubeRadius: number) {
  const points: THREE.Vector3[] = [];
  const steps = 28;
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const angle = degreesToRadians(startDegrees + (endDegrees - startDegrees) * progress);
    points.push(new THREE.Vector3(Math.sin(angle) * radiusX, Math.cos(angle) * radiusY, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 36, tubeRadius, 8, false);
}

function createPlateTexture(item: OodaOrbitItem, index: number, accent: string, isBack: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create OODA texture");

  const accentColor = new THREE.Color(accent);
  const pale = accentColor.clone().lerp(new THREE.Color("#fbfff8"), 0.72).getStyle();
  const mid = accentColor.clone().lerp(new THREE.Color("#eef5f1"), 0.48).getStyle();
  const dark = accentColor.clone().lerp(new THREE.Color("#1f2933"), 0.32).getStyle();
  const gradient = context.createLinearGradient(0, 0, 1024, 640);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.36, pale);
  gradient.addColorStop(1, mid);
  context.fillStyle = gradient;
  roundRect(context, 0, 0, 1024, 640, 34);
  context.fill();

  context.fillStyle = accent;
  context.globalAlpha = 0.16;
  context.fillRect(0, 0, 1024, 92);
  context.fillRect(0, 548, 1024, 92);
  context.globalAlpha = 1;

  if (isBack) {
    context.fillStyle = dark;
    context.font = '900 156px "Yu Gothic", Meiryo, sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(item.stageLabel ?? item.stage, 512, 320);
  } else {
    context.fillStyle = dark;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.font = '900 58px "Yu Gothic", Meiryo, sans-serif';
    context.fillText(String(index + 1).padStart(2, "0"), 76, 118);
    context.fillStyle = accent;
    context.font = '900 66px "Yu Gothic", Meiryo, sans-serif';
    context.fillText(item.stageLabel ?? item.stage, 196, 118);
    context.fillStyle = dark;
    context.font = '900 112px "Yu Gothic", Meiryo, sans-serif';
    drawWrappedText(context, item.label, 76, 332, 872, 118, 2);
    context.fillStyle = "#1f2933";
    context.globalAlpha = 0.72;
    context.font = '800 54px "Yu Gothic", Meiryo, sans-serif';
    drawWrappedText(context, item.helper, 76, 528, 872, 66, 1);
    context.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  Array.from(text).forEach((char) => {
    const next = `${line}${char}`;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((lineText, lineIndex) => context.fillText(lineText, x, y + lineIndex * lineHeight));
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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

function disposePlate(plate: Plate) {
  plate.geometry.dispose();
  plate.materials.forEach((material) => material.dispose());
  plate.textures.forEach((texture) => texture.dispose());
}

function disposeLoop(loop: ReturnType<typeof createLoopRing>) {
  loop.geometries.forEach((geometry) => geometry.dispose());
  loop.materials.forEach((material) => material.dispose());
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
