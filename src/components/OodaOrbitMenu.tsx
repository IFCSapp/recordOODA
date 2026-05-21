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
  materials: THREE.Material[];
  textures: THREE.Texture[];
};

const CARD_SPACING = 90;
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
  Act: "返す"
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

    const loop = createLoopRing();
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
      const viewHeight = width < 480 ? 4.15 : 3.45;
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
      const radiusX = isNarrow ? 1.55 : 2.22;
      const radiusZ = isNarrow ? 0.86 : 1.18;

      plates.forEach((plate, index) => {
        const degrees = baseDegrees + index * CARD_SPACING;
        const radians = degreesToRadians(degrees);
        const side = Math.sin(radians);
        const front = Math.cos(radians);
        const depth = (front + 1) / 2;
        const scale = 0.72 + depth * 0.28;
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
      <div className="ooda-loop-caption">
        <span>OODAは一巡して戻る</span>
        <strong>見る → 見立てる → 選ぶ → 反応で戻す</strong>
      </div>
      <div className="ooda-orbit-grid" aria-hidden="true" />
      <div className="ooda-orbit-track">
        <canvas ref={canvasRef} className="ooda-three-canvas" aria-label="OODA loop" />
        <div className="ooda-three-link-list">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={currentPath.startsWith(item.href) ? "page" : undefined}>
              {item.stage}: {item.label}
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
  const geometry = new THREE.BoxGeometry(2.36, 1.34, 0.16, 1, 1, 1);
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

  return { group, geometry, materials, textures: [front, back] };
}

function createLoopRing() {
  const group = new THREE.Group();
  const ringGeometry = new THREE.TorusGeometry(1.72, 0.018, 12, 120);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: "#55745f", opacity: 0.34, transparent: true });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const arrowGeometry = new THREE.ConeGeometry(0.09, 0.24, 24);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: "#376f8f", opacity: 0.74, transparent: true });
  for (let index = 0; index < 4; index += 1) {
    const angle = degreesToRadians(index * 90 + 42);
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial.clone());
    arrow.position.set(Math.sin(angle) * 1.72, 0, Math.cos(angle) * 1.72);
    arrow.rotation.set(Math.PI / 2, 0, -angle);
    group.add(arrow);
  }

  group.position.y = -0.14;
  group.scale.set(1.08, 1.08, 1.08);
  return { group, ringGeometry, ringMaterial, arrowGeometry };
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
    context.fillText(item.stage, 512, 320);
  } else {
    context.fillStyle = dark;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.font = '900 58px "Yu Gothic", Meiryo, sans-serif';
    context.fillText(String(index + 1).padStart(2, "0"), 76, 118);
    context.fillStyle = accent;
    context.font = '900 66px "Yu Gothic", Meiryo, sans-serif';
    context.fillText(item.stage, 196, 118);
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
  loop.ringGeometry.dispose();
  loop.ringMaterial.dispose();
  loop.arrowGeometry.dispose();
  loop.group.traverse((object) => {
    if (object instanceof THREE.Mesh && Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
    } else if (object instanceof THREE.Mesh) {
      object.material.dispose();
    }
  });
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
