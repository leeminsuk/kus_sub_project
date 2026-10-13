import * as THREE from "three";
import { buildCampus } from "./world";
import { loadCharacter } from "./character";
import {
  QUESTS,
  GUIDE_POSITION,
  FINALE_POSITION,
  SPAWN_POSITION,
  type Position,
  type QuestId,
} from "./content";
import { DISCOVERIES, type DiscoveryId } from "./discoveries";

export type Nearby =
  QuestId | "guide" | "finale" | `discovery:${DiscoveryId}` | null;
export interface FrameInfo {
  position: Position;
  nearby: Nearby;
  fps: number;
  moving: boolean;
}
export interface EngineOptions {
  onFrame: (info: FrameInfo) => void;
  onInteract: (id: NonNullable<Nearby>) => void;
  onReady: () => void;
  onError: (message: string) => void;
}
type Actor = Awaited<ReturnType<typeof loadCharacter>>;
type DiscoveryNode = {
  id: DiscoveryId;
  position: Position;
  object: THREE.Group;
  halo: THREE.Mesh;
  label: THREE.Sprite;
  material: THREE.MeshStandardMaterial;
};

export class CampusEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, 0.1, 360);
  private renderer: THREE.WebGLRenderer;
  private world: ReturnType<typeof buildCampus>;
  private cameraObstacles: THREE.Box3[] = [];
  private player: Actor | null = null;
  private npcs: {
    actor: Actor;
    id: NonNullable<Nearby>;
    position: Position;
    marker: THREE.Group;
  }[] = [];
  private discoveries: DiscoveryNode[] = [];
  private discovered = new Set<DiscoveryId>();
  private position = new THREE.Vector3(SPAWN_POSITION.x, 0, SPAWN_POSITION.z);
  private velocity = new THREE.Vector2();
  private keys = new Set<string>();
  private touch = new THREE.Vector2();
  private target: THREE.Vector3 | null = null;
  private marker: THREE.Mesh;
  private trail: THREE.Mesh[] = [];
  private tracked: Position | null = null;
  private completed = new Set<QuestId>();
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private nextNotify = 0;
  private started = false;
  private paused = true;
  private photoMode = false;
  private festival = false;
  private disposed = false;
  private nearby: Nearby = null;
  private yaw = 0;
  private zoom = 17;
  private dragging = false;
  private pointerDown = false;
  private pointer = new THREE.Vector2();
  private touchPointers = new Map<number, THREE.Vector2>();
  private pinchDistance = 0;
  private pinchMidpoint = 0;
  private stuckFor = 0;
  private cleanup: (() => void)[] = [];
  private jumpVelocity = 0;
  private height = 0;
  private disposeTextures: THREE.Texture[] = [];

  constructor(
    private container: HTMLElement,
    private options: EngineOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "자유롭게 탐험하는 3D 캠퍼스",
    );
    this.renderer.domElement.setAttribute("tabindex", "0");
    this.container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#b8d8da");
    this.scene.fog = new THREE.Fog("#b8d8da", 115, 245);
    this.scene.add(new THREE.HemisphereLight("#fff9e9", "#759c8c", 2.1));
    const sun = new THREE.DirectionalLight("#fff1ce", 3.2);
    sun.position.set(-45, 75, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -90,
      right: 90,
      top: 90,
      bottom: -90,
      near: 1,
      far: 190,
    });
    sun.shadow.bias = -0.0007;
    sun.shadow.normalBias = 0.08;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight("#e8f0f5", 0.25));
    this.world = buildCampus(this.scene);
    this.cameraObstacles = this.world.colliders
      .filter((c) => (c.height ?? 0) > 1)
      .map(
        (c) =>
          new THREE.Box3(
            new THREE.Vector3(c.x - c.halfX - 0.15, 0, c.z - c.halfZ - 0.15),
            new THREE.Vector3(
              c.x + c.halfX + 0.15,
              c.height,
              c.z + c.halfZ + 0.15,
            ),
          ),
      );
    this.cameraObstacles.push(...this.world.cameraOnlyColliders);
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.75, 32),
      new THREE.MeshBasicMaterial({
        color: "#e6bd70",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.16;
    this.marker.visible = false;
    this.scene.add(this.marker);
    for (let i = 0; i < 10; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 6, 4),
        new THREE.MeshBasicMaterial({
          color: "#fff2b2",
          transparent: true,
          opacity: 0.75,
        }),
      );
      dot.visible = false;
      this.trail.push(dot);
      this.scene.add(dot);
    }
    this.createDiscoveries();
    this.camera.position.set(91, 86, 111);
    this.camera.lookAt(0, 0, -7);
    this.bindInput();
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(container);
    this.cleanup.push(() => observer.disconnect());
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
    this.loadActors().catch((error) => {
      if (!this.disposed)
        this.options.onError(
          `캐릭터를 불러오지 못했습니다. 새로고침해 주세요. ${error instanceof Error ? error.message : ""}`,
        );
    });
  }

  private async loadActors() {
    const player = await loadCharacter("#9b2747");
    if (this.disposed) {
      player.dispose();
      return;
    }
    this.player = player;
    player.group.scale.setScalar(1.12);
    player.group.position.copy(this.position);
    this.scene.add(player.group);
    const entries = [
      {
        id: "guide" as const,
        position: GUIDE_POSITION,
        name: "호연 · 캠퍼스 안내",
        color: "#d29d42",
      },
      ...QUESTS.map((q) => ({
        id: q.id,
        position: q.position,
        name: `${q.npc} · ${q.location}`,
        color: q.department === "bio" ? "#538d67" : "#517dbe",
      })),
      {
        id: "finale" as const,
        position: FINALE_POSITION,
        name: "캠퍼스의 신호",
        color: "#ad3d60",
      },
    ];
    for (const item of entries) {
      const actor = await loadCharacter(item.color);
      if (this.disposed) {
        actor.dispose();
        return;
      }
      actor.group.position.set(item.position.x, 0, item.position.z);
      actor.group.rotation.y = Math.PI;
      actor.group.scale.setScalar(1.03);
      this.scene.add(actor.group);
      const marker = new THREE.Group();
      marker.position.set(item.position.x, 4.2, item.position.z);
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42),
        new THREE.MeshStandardMaterial({
          color: item.color,
          emissive: item.color,
          emissiveIntensity: 0.25,
        }),
      );
      marker.add(gem);
      const label = this.label(item.name);
      label.position.y = 1.15;
      marker.add(label);
      this.scene.add(marker);
      this.npcs.push({ actor, id: item.id, position: item.position, marker });
    }
    this.options.onReady();
  }

  private label(text: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(28,48,43,.90)";
    ctx.beginPath();
    ctx.roundRect(0, 0, 640, 96, 36);
    ctx.fill();
    ctx.font = "bold 31px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff8ea";
    ctx.fillText(text, 320, 49);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.disposeTextures.push(texture);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        transparent: true,
      }),
    );
    sprite.scale.set(6.4, 0.96, 1);
    return sprite;
  }

  private createDiscoveries() {
    for (const item of DISCOVERIES) {
      const object = new THREE.Group();
      object.position.set(item.position.x, 1.75, item.position.z);
      const material = new THREE.MeshStandardMaterial({
        color: "#e8bf62",
        emissive: "#ad782a",
        emissiveIntensity: 0.28,
        roughness: 0.35,
        metalness: 0.6,
      });
      const add = (
        geometry: THREE.BufferGeometry,
        x: number,
        y: number,
        z: number,
      ) => {
        const part = new THREE.Mesh(geometry, material);
        part.position.set(x, y, z);
        part.castShadow = true;
        object.add(part);
        return part;
      };
      if (item.id === "tiger") {
        add(new THREE.SphereGeometry(0.32, 12, 8), 0, -0.06, 0).scale.set(
          1.15,
          0.85,
          0.5,
        );
        for (const [x, y] of [
          [-0.34, 0.22],
          [-0.13, 0.4],
          [0.13, 0.4],
          [0.34, 0.22],
        ])
          add(new THREE.SphereGeometry(0.14, 10, 7), x, y, 0).scale.z = 0.65;
      } else if (item.id === "book") {
        add(new THREE.BoxGeometry(0.82, 0.1, 0.6), 0, -0.14, 0);
        add(new THREE.BoxGeometry(0.82, 0.1, 0.6), 0, 0.14, 0);
        add(new THREE.BoxGeometry(0.09, 0.3, 0.6), -0.38, 0, 0);
        const pages = new THREE.Mesh(
          new THREE.BoxGeometry(0.69, 0.17, 0.53),
          new THREE.MeshStandardMaterial({ color: "#fff3d5", roughness: 0.8 }),
        );
        pages.position.x = 0.035;
        object.add(pages);
        object.rotation.z = -0.16;
      } else if (item.id === "bench") {
        const leaf = new THREE.Shape();
        leaf.moveTo(0, -0.42);
        leaf.bezierCurveTo(-0.85, 0.16, -0.57, 0.67, 0, 0.32);
        leaf.bezierCurveTo(0.57, 0.67, 0.85, 0.16, 0, -0.42);
        add(
          new THREE.ExtrudeGeometry(leaf, {
            depth: 0.06,
            bevelEnabled: true,
            bevelSize: 0.025,
            bevelThickness: 0.025,
            bevelSegments: 1,
            steps: 1,
          }),
          0,
          0,
          0,
        );
        add(
          new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6),
          0,
          -0.43,
          0,
        ).rotation.z = -0.25;
      } else {
        add(new THREE.TorusGeometry(0.4, 0.07, 8, 22), 0, 0.5, 0).rotation.x =
          Math.PI / 2;
        for (let n = 0; n < 3; n++)
          add(
            new THREE.CylinderGeometry(0.07, 0.07, 0.65 + n * 0.13, 8),
            (n - 1) * 0.26,
            -0.03 - n * 0.065,
            0,
          );
        add(new THREE.SphereGeometry(0.11, 8, 6), 0, 0.21, 0);
      }
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 0.83, 40),
        new THREE.MeshBasicMaterial({
          color: "#d9b56c",
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
      );
      halo.position.set(item.position.x, 0.16, item.position.z);
      halo.rotation.x = -Math.PI / 2;
      const label = this.label(`✦ ${item.title}`);
      label.position.set(item.position.x, 3.3, item.position.z);
      label.scale.set(5.5, 0.825, 1);
      label.visible = false;
      this.scene.add(object, halo, label);
      this.discoveries.push({
        id: item.id,
        position: item.position,
        object,
        halo,
        label,
        material,
      });
    }
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  private listen<K extends keyof WindowEventMap>(
    type: K,
    fn: (event: WindowEventMap[K]) => void,
  ) {
    window.addEventListener(type, fn);
    this.cleanup.push(() => window.removeEventListener(type, fn));
  }

  private bindInput() {
    this.listen("keydown", (e) => {
      if (
        e.target instanceof HTMLElement &&
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      if (
        (e.code === "Enter" || e.code === "Space") &&
        e.target instanceof HTMLElement &&
        e.target.closest('button, a, [role="button"]')
      )
        return;
      if (
        (!this.paused || this.photoMode) &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (this.photoMode) {
        if (e.code === "ArrowLeft") this.yaw -= 0.08;
        if (e.code === "ArrowRight") this.yaw += 0.08;
        if (e.code === "ArrowUp") this.zoom = Math.max(10, this.zoom - 1.5);
        if (e.code === "ArrowDown") this.zoom = Math.min(56, this.zoom + 1.5);
        return;
      }
      if (e.code === "KeyE" || e.code === "Enter") {
        if (!e.repeat && !this.paused && this.nearby) {
          e.preventDefault();
          this.options.onInteract(this.nearby);
        }
        return;
      }
      if (this.paused) return;
      this.keys.add(e.code);
      this.clearTarget();
      if (e.code === "Space" && this.height === 0) this.jumpVelocity = 7;
    });
    this.listen("keyup", (e) => this.keys.delete(e.code));
    this.listen("blur", () => this.clearInput());
    const canvas = this.renderer.domElement;
    const down = (e: PointerEvent) => {
      if (this.paused && !this.photoMode) return;
      e.preventDefault();
      canvas.focus();
      canvas.setPointerCapture(e.pointerId);
      this.pointer.set(e.clientX, e.clientY);
      if (e.pointerType === "touch") {
        this.touchPointers.set(
          e.pointerId,
          new THREE.Vector2(e.clientX, e.clientY),
        );
        if (this.touchPointers.size > 1) {
          this.clearTarget();
          this.velocity.set(0, 0);
          this.pointerDown = false;
          this.pinchDistance = 0;
          return;
        }
      }
      if (e.button === 2 || this.photoMode) this.dragging = true;
      else if (e.button === 0) {
        this.pointerDown = true;
        this.setTarget(e.clientX, e.clientY);
      }
    };
    const move = (e: PointerEvent) => {
      if (this.paused && !this.photoMode) return;
      if (e.pointerType === "touch" && this.touchPointers.has(e.pointerId)) {
        this.touchPointers.set(
          e.pointerId,
          new THREE.Vector2(e.clientX, e.clientY),
        );
        if (this.touchPointers.size > 1) {
          const [a, b] = [...this.touchPointers.values()];
          const distance = a.distanceTo(b);
          const midpoint = (a.x + b.x) / 2;
          if (this.pinchDistance > 0) {
            this.zoom = THREE.MathUtils.clamp(
              (this.zoom * this.pinchDistance) / Math.max(1, distance),
              10,
              56,
            );
            this.yaw -= (midpoint - this.pinchMidpoint) * 0.007;
          }
          this.pinchDistance = distance;
          this.pinchMidpoint = midpoint;
          return;
        }
      }
      if (this.dragging) {
        this.yaw -= (e.clientX - this.pointer.x) * 0.007;
        this.pointer.set(e.clientX, e.clientY);
      } else if (this.pointerDown) this.setTarget(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      this.touchPointers.delete(e.pointerId);
      this.pinchDistance = 0;
      this.dragging = false;
      this.pointerDown = false;
    };
    const wheel = (e: WheelEvent) => {
      if (this.paused && !this.photoMode) return;
      e.preventDefault();
      this.zoom = THREE.MathUtils.clamp(this.zoom + e.deltaY * 0.025, 10, 56);
    };
    const context = (e: Event) => e.preventDefault();
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("contextmenu", context);
    this.cleanup.push(() => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("contextmenu", context);
    });
  }

  private setTarget(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = new THREE.Vector3();
    if (
      !ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        hit,
      )
    )
      return;
    hit.x = THREE.MathUtils.clamp(hit.x, -73, 73);
    hit.z = THREE.MathUtils.clamp(hit.z, -73, 73);
    // A click can reach the near side of a wall, never send the player endlessly into it.
    const start = this.position.clone();
    start.y = 0;
    const length = start.distanceTo(hit);
    const steps = Math.max(1, Math.ceil(length / 0.35));
    const candidate = new THREE.Vector3();
    let previous = start.clone();
    for (let i = 1; i <= steps; i++) {
      candidate.lerpVectors(start, hit, i / steps);
      if (this.blocked(candidate.x, candidate.z)) {
        hit.copy(previous);
        break;
      }
      previous.copy(candidate);
    }
    if (start.distanceTo(hit) < 0.65) {
      this.clearTarget();
      return;
    }
    this.target = hit;
    this.stuckFor = 0;
    this.marker.position.set(hit.x, 0.16, hit.z);
    this.marker.visible = true;
  }

  private blocked(x: number, z: number) {
    return this.world.colliders.some(
      (c) =>
        Math.abs(x - c.x) < c.halfX + 0.68 &&
        Math.abs(z - c.z) < c.halfZ + 0.68,
    );
  }
  private clearTarget() {
    this.target = null;
    this.marker.visible = false;
    this.stuckFor = 0;
  }
  private clearInput() {
    this.keys.clear();
    this.touch.set(0, 0);
    this.velocity.set(0, 0);
    this.pointerDown = false;
    this.dragging = false;
    this.touchPointers.clear();
    this.pinchDistance = 0;
    this.clearTarget();
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.clearInput();
  }
  setStarted(started: boolean) {
    this.started = started;
  }
  setPhotoMode(on: boolean) {
    this.photoMode = on;
    this.clearInput();
  }
  setPosition(position: Position) {
    this.clearInput();
    this.height = 0;
    this.jumpVelocity = 0;
    const x = THREE.MathUtils.clamp(position.x, -73, 73);
    const z = THREE.MathUtils.clamp(position.z, -73, 73);
    this.position.set(
      this.blocked(x, z) ? SPAWN_POSITION.x : x,
      0,
      this.blocked(x, z) ? SPAWN_POSITION.z : z,
    );
    this.player?.group.position.copy(this.position);
  }
  setTouchInput(x: number, y: number) {
    if (this.photoMode || this.paused) return;
    this.touch.set(x, y);
    this.clearTarget();
  }
  setProgress(completed: QuestId[], festival: boolean) {
    this.completed = new Set(completed);
    this.festival = festival;
  }
  setDiscoveries(ids: DiscoveryId[]) {
    this.discovered = new Set(ids);
  }
  setTracked(position: Position | null) {
    this.tracked = position;
  }
  getPosition(): Position {
    return { x: this.position.x, z: this.position.z };
  }
  interact() {
    if (this.nearby && !this.paused && !this.photoMode)
      this.options.onInteract(this.nearby);
  }
  capture() {
    return this.renderer.domElement.toDataURL("image/png");
  }

  private unobstructedCamera(
    origin: THREE.Vector3,
    destination: THREE.Vector3,
  ) {
    const direction = destination.clone().sub(origin);
    const length = direction.length();
    if (length < 0.01) return destination.clone();
    direction.divideScalar(length);
    const ray = new THREE.Ray(origin, direction);
    const hit = new THREE.Vector3();
    let safeDistance = length;
    for (const bounds of this.cameraObstacles) {
      if (ray.intersectBox(bounds, hit))
        safeDistance = Math.min(
          safeDistance,
          Math.max(0.55, origin.distanceTo(hit) - 0.6),
        );
    }
    return origin.clone().addScaledVector(direction, safeDistance);
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);
    this.lastTime = now;
    this.elapsed += dt;
    let moving = false,
      running = false;
    if (this.player && this.started && !this.paused && !this.photoMode) {
      const x =
        (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
        (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0) +
        this.touch.x;
      const z =
        (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) -
        (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) +
        this.touch.y;
      const input = new THREE.Vector2(x, z);
      if (input.length() > 1) input.normalize();
      input.rotateAround(new THREE.Vector2(), -this.yaw);
      if (this.target && input.lengthSq() === 0) {
        input.set(
          this.target.x - this.position.x,
          this.target.z - this.position.z,
        );
        if (input.length() < 0.6) {
          this.clearTarget();
          input.set(0, 0);
        } else input.normalize();
      }
      const speed =
        this.keys.has("AltLeft") || this.keys.has("AltRight")
          ? 4
          : this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")
            ? 10.5
            : 7.2;
      this.velocity.lerp(input.multiplyScalar(speed), 1 - Math.exp(-11 * dt));
      const nextX = THREE.MathUtils.clamp(
        this.position.x + this.velocity.x * dt,
        -73,
        73,
      );
      const nextZ = THREE.MathUtils.clamp(
        this.position.z + this.velocity.y * dt,
        -73,
        73,
      );
      const old = this.position.clone();
      if (!this.blocked(nextX, this.position.z)) this.position.x = nextX;
      if (!this.blocked(this.position.x, nextZ)) this.position.z = nextZ;
      moving = old.distanceTo(this.position) > 0.002;
      running = this.velocity.length() > 6;
      if (this.target && !moving) {
        this.stuckFor += dt;
        if (this.stuckFor > 0.3) {
          this.clearTarget();
          this.velocity.set(0, 0);
        }
      } else this.stuckFor = 0;
      if (moving) {
        const desired = Math.atan2(this.velocity.x, this.velocity.y);
        let diff = desired - this.player.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.player.group.rotation.y += diff * (1 - Math.exp(-12 * dt));
      }
      if (this.height > 0 || this.jumpVelocity > 0) {
        this.jumpVelocity -= 20 * dt;
        this.height = Math.max(0, this.height + this.jumpVelocity * dt);
        if (!this.height) this.jumpVelocity = 0;
      }
      this.player.group.position.set(
        this.position.x,
        this.height,
        this.position.z,
      );
    }
    this.player?.update(dt, moving, running, this.festival && this.paused);
    let closest = 5.3;
    this.nearby = null;
    for (const npc of this.npcs) {
      const distance = Math.hypot(
        npc.position.x - this.position.x,
        npc.position.z - this.position.z,
      );
      if (distance < closest) {
        closest = distance;
        this.nearby = npc.id;
      }
      npc.actor.update(dt, false, false, this.festival);
      if (distance < 12)
        npc.actor.group.rotation.y = Math.atan2(
          this.position.x - npc.position.x,
          this.position.z - npc.position.z,
        );
      npc.marker.position.y =
        4.15 + Math.sin(this.elapsed * 2 + npc.position.x) * 0.15;
      npc.marker.children[0].rotation.y = this.elapsed;
      npc.marker.children[1].visible = distance < 17 && !this.photoMode;
      const done = this.completed.has(npc.id as QuestId);
      npc.marker.children[0].visible = !done && !this.photoMode;
    }
    for (const [index, item] of this.discoveries.entries()) {
      const distance = Math.hypot(
        item.position.x - this.position.x,
        item.position.z - this.position.z,
      );
      if (distance < Math.min(closest, 3.6)) {
        closest = distance;
        this.nearby = `discovery:${item.id}`;
      }
      const found = this.discovered.has(item.id);
      item.object.position.y =
        (found ? 1.2 : 1.75) + Math.sin(this.elapsed * 1.7 + index) * 0.16;
      item.object.rotation.y = this.elapsed * 0.55 + index;
      item.object.scale.setScalar(found ? 0.74 : 1);
      item.material.color.set(found ? "#91a58a" : "#e8bf62");
      item.material.emissiveIntensity = found ? 0.02 : 0.28;
      item.label.visible = this.started && distance < 12 && !this.photoMode;
      (item.halo.material as THREE.MeshBasicMaterial).opacity = this.photoMode
        ? 0
        : found
          ? 0.2
          : 0.7 + Math.sin(this.elapsed * 2) * 0.12;
    }
    if (this.started) {
      const lookAt = new THREE.Vector3(
        this.position.x,
        1.3 + this.height * 0.25,
        this.position.z,
      );
      const desired = new THREE.Vector3(
        this.position.x + Math.sin(this.yaw) * this.zoom,
        this.zoom * 0.5 + 2,
        this.position.z + Math.cos(this.yaw) * this.zoom,
      );
      this.camera.position.lerp(
        this.unobstructedCamera(lookAt, desired),
        1 - Math.exp(-4 * dt),
      );
      // Also constrain the smoothed position so an orbit never interpolates through a wall.
      this.camera.position.copy(
        this.unobstructedCamera(lookAt, this.camera.position),
      );
      this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z - 2);
    } else {
      const angle = 0.63 + Math.sin(this.elapsed * 0.035) * 0.13;
      this.camera.position.set(
        Math.sin(angle) * 139,
        92,
        Math.cos(angle) * 139,
      );
      this.camera.lookAt(0, 0, -5);
    }
    this.trail.forEach((dot, i) => {
      dot.visible = !!this.tracked && this.started && !this.photoMode;
      if (dot.visible && this.tracked) {
        const direction = new THREE.Vector2(
          this.tracked.x - this.position.x,
          this.tracked.z - this.position.z,
        );
        const distance = direction.length();
        direction.normalize();
        const step = (i + 1) * 1.5;
        dot.visible = step < distance;
        dot.position.set(
          this.position.x + direction.x * step,
          0.2 + Math.sin(this.elapsed * 3 - i * 0.6) * 0.07,
          this.position.z + direction.y * step,
        );
      }
    });
    this.world.updateVisibility(
      this.camera.position,
      this.started ? this.position : null,
      dt,
    );
    this.world.update(this.elapsed, this.festival);
    this.renderer.render(this.scene, this.camera);
    if (this.elapsed >= this.nextNotify) {
      this.nextNotify = this.elapsed + 0.12;
      this.options.onFrame({
        position: this.getPosition(),
        nearby: this.started && !this.photoMode ? this.nearby : null,
        fps: Math.round(1 / (dt || 0.016)),
        moving,
      });
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.cleanup.forEach((fn) => fn());
    this.player?.dispose();
    this.npcs.forEach((n) => n.actor.dispose());
    this.world.dispose();
    this.disposeTextures.forEach((t) => t.dispose());
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        mats.forEach((m) => m.dispose());
      } else if (obj instanceof THREE.Sprite) obj.material.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
