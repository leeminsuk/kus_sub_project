import * as THREE from "three";

export type CampusCollider = {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  height?: number;
};

/** A deliberately handmade, explorable campus. All dimensions are world metres. */
export function buildCampus(scene: THREE.Scene): {
  colliders: CampusCollider[];
  cameraOnlyColliders: THREE.Box3[];
  update: (elapsed: number, festival: boolean) => void;
  updateVisibility: (
    camera: THREE.Vector3,
    player: THREE.Vector3 | null,
    delta: number,
  ) => void;
  dispose: () => void;
} {
  const campus = new THREE.Group();
  campus.name = "고려의 숲 · campus";
  scene.add(campus);
  const colliders: CampusCollider[] = [];
  const cameraOnlyColliders: THREE.Box3[] = [];
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const animatedFlags: {
    mesh: THREE.Mesh;
    phase: number;
    original: Float32Array;
  }[] = [];
  const lanterns: THREE.Mesh[] = [];
  const windLeaves: THREE.Mesh[] = [];
  const canopies: {
    bounds: THREE.Box3;
    opacity: number;
    instances: { attribute: THREE.InstancedBufferAttribute; index: number }[];
  }[] = [];
  let activeCanopy = -1;
  let seed = 1905;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const keepGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const mat = (
    color: THREE.ColorRepresentation,
    extra: THREE.MeshStandardMaterialParameters = {},
  ) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      ...extra,
    });
    materials.add(material);
    return material;
  };
  const stone = mat("#d9d1b9");
  const stoneLight = mat("#ede4cf");
  const stoneShade = mat("#b5ad98");
  const sandstone = mat("#c3b99c");
  const roof = mat("#475b59");
  const roofLight = mat("#617575");
  const crimson = mat("#8d183e");
  const gold = mat("#c8a05a", { metalness: 0.2 });
  const glass = mat("#466e78", { roughness: 0.31, metalness: 0.28 });
  const glassLight = mat("#91b5af", { roughness: 0.3, metalness: 0.14 });
  const glassDark = mat("#254b56");
  const darkMetal = mat("#344d4b", { metalness: 0.25 });
  const wood = mat("#926b44");
  const bark = mat("#776750");
  const grass = mat("#91ae79");
  const lawn = mat("#a4bc84");
  const grassDark = mat("#7d9f6b");
  const green = mat("#698e67", { flatShading: true });
  const greenLight = mat("#8cac71", { flatShading: true });
  const greenPale = mat("#a5ba7c", { flatShading: true });
  const autumn = mat("#dab967", { flatShading: true });
  const autumnLight = mat("#e8ce83", { flatShading: true });
  const pink = mat("#d99c9a");
  const cream = mat("#f4e8c5");
  const flowerRed = mat("#bc5c61");
  const terracotta = mat("#b78065");
  const water = mat("#72acb3", { roughness: 0.26, metalness: 0.32 });
  const luminous = mat("#ffe5aa", {
    emissive: "#ffdc85",
    emissiveIntensity: 0.55,
  });
  const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
  const sphereGeometry = keepGeometry(new THREE.IcosahedronGeometry(1, 1));
  const coarseSphere = keepGeometry(new THREE.IcosahedronGeometry(1, 0));
  const cylinderGeometry = keepGeometry(
    new THREE.CylinderGeometry(1, 1, 1, 12),
  );
  const thinCylinderGeometry = keepGeometry(
    new THREE.CylinderGeometry(1, 1, 1, 8),
  );
  const coneGeometry = keepGeometry(new THREE.ConeGeometry(1, 1, 8));
  const circleGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 64));
  const archShape = new THREE.Shape();
  archShape.moveTo(-0.5, 0);
  archShape.lineTo(0.5, 0);
  archShape.lineTo(0.5, 0.57);
  archShape.quadraticCurveTo(0.5, 0.79, 0, 1);
  archShape.quadraticCurveTo(-0.5, 0.79, -0.5, 0.57);
  archShape.closePath();
  const archGeometry = keepGeometry(new THREE.ShapeGeometry(archShape));
  type Batch = {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    matrices: THREE.Matrix4[];
    shadow: boolean;
    canopyIds: number[];
  };
  const batches = new Map<string, Batch>();
  const transform = new THREE.Object3D();
  function instance(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    ry = 0,
    shadow = true,
    rz = 0,
  ) {
    const key = `${geometry.uuid}/${material.uuid}/${shadow}/${activeCanopy >= 0 ? "foliage" : "solid"}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { geometry, material, matrices: [], shadow, canopyIds: [] };
      batches.set(key, batch);
    }
    transform.position.set(x, y, z);
    transform.rotation.set(0, ry, rz);
    transform.scale.set(sx, sy, sz);
    transform.updateMatrix();
    batch.matrices.push(transform.matrix.clone());
    batch.canopyIds.push(activeCanopy);
    if (activeCanopy >= 0) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      canopies[activeCanopy].bounds.union(
        geometry.boundingBox!.clone().applyMatrix4(transform.matrix),
      );
    }
  }
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    ry = 0,
    shadow = true,
  ) => instance(boxGeometry, material, x, y, z, w, h, d, ry, shadow);
  const ball = (
    x: number,
    y: number,
    z: number,
    r: number,
    material: THREE.Material,
    stretch = 1,
  ) =>
    instance(
      sphereGeometry,
      material,
      x,
      y,
      z,
      r,
      r * stretch,
      r,
      random() * 3,
    );
  const cylinder = (
    x: number,
    y: number,
    z: number,
    radius: number,
    h: number,
    material: THREE.Material,
    shadow = true,
  ) =>
    instance(cylinderGeometry, material, x, y, z, radius, h, radius, 0, shadow);
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    campus.add(item);
    return item;
  }
  function canvasTexture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) draw(context);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.add(texture);
    return texture;
  }
  const cobbleTexture = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#d5d0b8";
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 9; col++) {
        const value = 222 + Math.floor(random() * 9);
        ctx.fillStyle = `rgb(${value},${value - 3},${value - 17})`;
        ctx.fillRect(col * 32 + (row % 2) * 16 + 1, row * 32 + 1, 30, 30);
      }
    }
  });
  cobbleTexture.wrapS = cobbleTexture.wrapT = THREE.RepeatWrapping;
  const paving = mat("#ffffff", {
    map: cobbleTexture,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const pavingEdge = mat("#c2c1a7");
  const plazaEdge = mat("#c2c1a7", {
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const plazaStone = mat("#ede4cf", {
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const plazaInlay = mat("#c3b99c", {
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const plazaInner = mat("#ede4cf", {
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const plazaCentre = mat("#c3b99c", {
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
  });
  const plazaCentreInner = mat("#ede4cf", {
    polygonOffset: true,
    polygonOffsetFactor: -7,
    polygonOffsetUnits: -7,
  });
  function path(x: number, z: number, w: number, d: number) {
    box(x, -0.035, z, w + 0.32, 0.08, d + 0.32, pavingEdge, 0, false);
    const geometry = keepGeometry(new THREE.PlaneGeometry(w, d));
    const uv = geometry.attributes.uv;
    // World-space paving coordinates keep crossing paths perfectly aligned.
    for (let i = 0; i < uv.count; i++)
      uv.setXY(
        i,
        (x - w / 2 + uv.getX(i) * w) / 6,
        (z + d / 2 - uv.getY(i) * d) / 6,
      );
    const p = mesh(geometry, paving, x, 0.014, z);
    p.rotation.x = -Math.PI / 2;
    p.castShadow = false;
  }
  function disc(
    x: number,
    z: number,
    r: number,
    material: THREE.Material,
    y = 0.02,
  ) {
    instance(circleGeometry, material, x, y - 0.025, z, r, 0.05, r, 0, false);
  }
  // A continuous walkable meadow under every path and building.
  box(0, -0.35, 0, 170, 0.7, 170, grass, 0, false);
  box(0, -1.1, 0, 173, 1.3, 173, grassDark, 0, false);
  path(0, 0, 10, 148);
  path(0, -15, 134, 7);
  path(0, 15, 134, 7);
  path(-44, -2, 6, 33);
  path(44, -2, 6, 33);
  path(0, -34, 35, 19);
  path(-12, -36, 32, 4);
  path(-25, -43, 4, 15);
  path(15, 39, 30, 4);
  path(0, 57, 24, 10);
  for (const side of [-1, 1]) {
    path(side * 44, -20, 29, 7);
    path(side * 44, 19, 29, 6);
    path(side * 21, 29, 5, 21);
  }
  disc(0, -3, 19.4, plazaEdge, 0.025);
  disc(0, -3, 19, plazaStone, 0.035);
  disc(0, -3, 14.2, plazaInlay, 0.047);
  disc(0, -3, 13.9, plazaInner, 0.052);
  // Subtle radial inlay gives the central gathering place its own identity.
  for (let n = 0; n < 16; n++) {
    const angle = (n * Math.PI) / 8;
    box(
      Math.sin(angle) * 16.35,
      0.068,
      -3 + Math.cos(angle) * 16.35,
      0.09,
      0.025,
      4.9,
      plazaInlay,
      angle,
      false,
    );
  }
  disc(0, -3, 4.2, plazaCentre, 0.073);
  disc(0, -3, 3.9, plazaCentreInner, 0.08);
  const compassMaterial = mat("#b7ad8d", {
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  });
  for (let n = 0; n < 4; n++) {
    const a = (n * Math.PI) / 2;
    box(
      Math.sin(a) * 1.9,
      0.112,
      -3 + Math.cos(a) * 1.9,
      0.17,
      0.025,
      3.4,
      compassMaterial,
      a,
      false,
    );
  }

  function label(
    text: string,
    subtitle: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    dir = 1,
    background = "#183d3c",
  ) {
    const texture = canvasTexture(1024, 256, (ctx) => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = "#c8ac71";
      ctx.lineWidth = 3;
      ctx.strokeRect(17, 17, 990, 222);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5efd9";
      ctx.font = '600 76px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
      ctx.fillText(text, 512, 117);
      ctx.fillStyle = "#cec7a9";
      ctx.font = "500 30px Arial, sans-serif";
      ctx.fillText(subtitle, 512, 183);
    });
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.add(material);
    const sign = mesh(
      keepGeometry(new THREE.PlaneGeometry(width, height)),
      material,
      x,
      y,
      z,
    );
    sign.rotation.y = dir === -1 ? Math.PI : 0;
    sign.castShadow = false;
    return sign;
  }
  function freestandingSign(
    text: string,
    sub: string,
    x: number,
    z: number,
    dir = 1,
    width = 4.2,
  ) {
    box(x, 1.62, z, width + 0.18, 1.38, 0.25, wood);
    box(x - width * 0.38, 0.9, z, 0.16, 1.8, 0.16, darkMetal);
    box(x + width * 0.38, 0.9, z, 0.16, 1.8, 0.16, darkMetal);
    label(text, sub, x, 1.64, z + dir * 0.14, width, 1.2, dir);
  }
  function lancet(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    dir = 1,
  ) {
    instance(
      archGeometry,
      stoneShade,
      x,
      y - 0.14,
      z,
      w + 0.38,
      h + 0.35,
      1,
      dir === -1 ? Math.PI : 0,
      false,
    );
    instance(
      archGeometry,
      stoneLight,
      x,
      y - 0.05,
      z + dir * 0.035,
      w + 0.18,
      h + 0.16,
      1,
      dir === -1 ? Math.PI : 0,
      false,
    );
    instance(
      archGeometry,
      glass,
      x,
      y,
      z + dir * 0.06,
      w,
      h,
      1,
      dir === -1 ? Math.PI : 0,
      false,
    );
    box(
      x,
      y + h * 0.35,
      z + dir * 0.09,
      0.085,
      h * 0.7,
      0.08,
      stoneLight,
      0,
      false,
    );
    box(x, y + h * 0.4, z + dir * 0.1, w, 0.095, 0.08, stoneLight, 0, false);
    box(x, y - 0.15, z + dir * 0.14, w + 0.5, 0.2, 0.38, stoneLight);
  }
  function roofGable(
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    material = roof,
  ) {
    // A rectangular pitched roof, with a long ridge along the facade.
    const vertices = new Float32Array([
      -w / 2,
      0,
      -d / 2,
      w / 2,
      0,
      -d / 2,
      w / 2,
      h,
      0,
      -w / 2,
      0,
      -d / 2,
      w / 2,
      h,
      0,
      -w / 2,
      h,
      0,
      -w / 2,
      h,
      0,
      w / 2,
      h,
      0,
      w / 2,
      0,
      d / 2,
      -w / 2,
      h,
      0,
      w / 2,
      0,
      d / 2,
      -w / 2,
      0,
      d / 2,
      -w / 2,
      0,
      d / 2,
      -w / 2,
      0,
      -d / 2,
      -w / 2,
      h,
      0,
      w / 2,
      0,
      -d / 2,
      w / 2,
      0,
      d / 2,
      w / 2,
      h,
      0,
    ]);
    // The roof is viewed from outside; wind triangles toward their outer normal.
    for (let i = 0; i < vertices.length; i += 9) {
      for (let axis = 0; axis < 3; axis++) {
        const previous = vertices[i + 3 + axis];
        vertices[i + 3 + axis] = vertices[i + 6 + axis];
        vertices[i + 6 + axis] = previous;
      }
    }
    const geometry = keepGeometry(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    mesh(geometry, material, x, y, z);
    box(x, y + h + 0.06, z, w + 0.25, 0.15, 0.2, roofLight);
    box(x, y, z - d / 2, w + 0.4, 0.16, 0.18, roofLight);
    box(x, y, z + d / 2, w + 0.4, 0.16, 0.18, roofLight);
    for (let n = 1; n < 8; n++) {
      const zz = ((d / 2) * n) / 8;
      box(
        x,
        y + h * (1 - n / 8) + 0.035,
        z + zz,
        w,
        0.055,
        0.085,
        roofLight,
        0,
        false,
      );
      box(
        x,
        y + h * (1 - n / 8) + 0.035,
        z - zz,
        w,
        0.055,
        0.085,
        roofLight,
        0,
        false,
      );
    }
  }
  function flag(x: number, y: number, z: number, phase: number, small = false) {
    cylinder(x, y / 2, z, 0.055, y, darkMetal);
    ball(x, y + 0.06, z, 0.105, gold);
    const width = small ? 1.1 : 1.8;
    const height = small ? 1.65 : 2.7;
    const geometry = keepGeometry(new THREE.PlaneGeometry(width, height, 8, 6));
    geometry.translate(width / 2, -height / 2 - 0.15, 0);
    const texture = canvasTexture(192, 288, (ctx) => {
      ctx.fillStyle = "#8c153b";
      ctx.fillRect(0, 0, 192, 288);
      ctx.strokeStyle = "#deb97d";
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 168, 264);
      ctx.fillStyle = "#fff0cc";
      ctx.textAlign = "center";
      ctx.font = "bold 75px Georgia";
      ctx.fillText("K", 96, 132);
      ctx.font = "23px Georgia";
      ctx.fillText("1905", 96, 184);
      ctx.fillRect(55, 206, 82, 2);
    });
    const material = mat("#ffffff", { map: texture, side: THREE.DoubleSide });
    const cloth = mesh(geometry, material, x, y, z);
    animatedFlags.push({
      mesh: cloth,
      phase,
      original: new Float32Array(geometry.attributes.position.array),
    });
  }
  function facade(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    name: string,
    sub: string,
    dir = 1,
  ) {
    const front = z + dir * (d / 2 + 0.05);
    box(x, h / 2, z, w, h, d, stone);
    box(x, 0.42, z, w + 0.7, 0.84, d + 0.7, stoneShade);
    box(x, h - 0.18, z, w + 0.75, 0.36, d + 0.65, stoneLight);
    box(x, h * 0.49, front, w + 0.35, 0.3, 0.34, stoneLight);
    box(x, h * 0.49 - 0.25, front, w + 0.2, 0.09, 0.15, stoneShade);
    // Thin masonry courses and alternating quoins read as pale cut stone.
    for (let row = 1; row < h / 0.72; row++) {
      box(x, row * 0.72, front, w - 1, 0.018, 0.023, stoneShade, 0, false);
      for (let col = 0; col < w / 2.4 - 1; col++) {
        const sx = x - w / 2 + 1.3 + col * 2.4 + (row % 2) * 1.2;
        box(
          sx,
          row * 0.72 - 0.36,
          front,
          0.017,
          0.7,
          0.023,
          stoneShade,
          0,
          false,
        );
      }
    }
    for (const edge of [-1, 1]) {
      for (let row = 0; row < h / 0.8; row++) {
        box(
          x + edge * (w / 2 - 0.32),
          row * 0.8 + 0.4,
          front,
          row % 2 ? 1 : 0.75,
          0.65,
          0.2,
          stoneLight,
        );
      }
    }
    const bays = Math.floor(w / 3.8);
    for (let n = 0; n < bays; n++) {
      const wx = x + (n - (bays - 1) / 2) * 3.9;
      if (Math.abs(wx - x) > 2.4)
        lancet(wx, 1.65, front + dir * 0.07, 1.5, 3.3, dir);
      lancet(wx, h * 0.54 + 0.35, front + dir * 0.07, 1.55, 3.3, dir);
    }
    // The rear and side elevations stay readable when the player walks around.
    for (let n = 0; n < bays; n++) {
      const wx = x + (n - (bays - 1) / 2) * 3.9;
      lancet(wx, 2, z - dir * (d / 2 + 0.08), 1.5, 3.1, -dir);
      lancet(wx, h * 0.54 + 0.35, z - dir * (d / 2 + 0.08), 1.5, 3.1, -dir);
    }
    for (const side of [-1, 1]) {
      for (let n = -1; n <= 1; n++) {
        box(
          x + side * (w / 2 + 0.045),
          3.6,
          z + n * 4.4,
          0.12,
          3.4,
          1.7,
          glass,
        );
        box(
          x + side * (w / 2 + 0.065),
          h * 0.72,
          z + n * 4.4,
          0.14,
          3.4,
          1.7,
          glass,
        );
        box(
          x + side * (w / 2 + 0.095),
          3.6,
          z + n * 4.4,
          0.15,
          3.4,
          0.11,
          stoneLight,
        );
      }
    }
    instance(
      archGeometry,
      stoneLight,
      x,
      0.55,
      front + dir * 0.12,
      4.8,
      5.3,
      1,
      dir === -1 ? Math.PI : 0,
    );
    instance(
      archGeometry,
      glassDark,
      x,
      0.65,
      front + dir * 0.17,
      3.8,
      4.55,
      1,
      dir === -1 ? Math.PI : 0,
    );
    box(x, 1.9, front + dir * 0.22, 0.09, 2.7, 0.08, gold);
    for (const side of [-1, 1])
      box(x + side * 0.3, 1.8, front + dir * 0.31, 0.06, 0.45, 0.08, gold);
    label(name, sub, x, h * 0.5 + 0.2, front + dir * 0.22, 5, 1.25, dir);
    // Shallow entry steps are intentionally excluded from gameplay collisions.
    for (let n = 0; n < 3; n++)
      box(
        x,
        0.1 + n * 0.13,
        front + dir * (1.2 - n * 0.35),
        6 - n * 0.55,
        0.2 + n * 0.26,
        1.5,
        stoneLight,
      );
    colliders.push({
      x,
      z,
      halfX: w / 2 + 0.2,
      halfZ: d / 2 + 0.2,
      height: h + 4.7,
    });
  }

  // The Gothic sandstone main hall anchors the northern end of the avenue.
  facade(0, -53, 32, 16, 12.7, "고려대학교", "KOREA UNIVERSITY · 1905");
  roofGable(0, 12.8, -53, 33.3, 17, 4);
  for (const side of [-1, 1]) {
    box(side * 13.4, 8.2, -43.95, 3.1, 16.4, 2.5, stone);
    box(side * 13.4, 15.9, -43.95, 3.5, 0.5, 2.9, stoneLight);
    for (let n = -1; n <= 1; n++)
      box(side * 13.4 + n * 1.15, 16.65, -42.8, 0.66, 1, 0.5, stoneLight);
    lancet(side * 13.4, 10.9, -42.67, 1.1, 3.2);
    instance(
      coneGeometry,
      roof,
      side * 13.4,
      17.4,
      -43.95,
      2.15,
      2.8,
      2.15,
      Math.PI / 8,
    );
    cylinder(side * 13.4, 19.2, -43.95, 0.04, 1.15, gold);
  }
  box(0, 10, -44.9, 6.5, 20, 5.3, stone);
  box(0, 18.95, -44.9, 7, 0.7, 5.75, stoneLight);
  box(0, 14.2, -42.17, 6.75, 0.3, 0.3, stoneLight);
  instance(archGeometry, stoneShade, 0, 0.25, -42.19, 5.2, 6.2, 1);
  instance(archGeometry, stoneLight, 0, 0.45, -42.13, 4.6, 5.7, 1);
  instance(archGeometry, glassDark, 0, 0.6, -42.08, 3.65, 4.95, 1);
  box(0, 2.14, -42, 0.1, 3.08, 0.1, gold);
  box(0, 3.56, -42, 3.3, 0.1, 0.1, gold);
  for (const s of [-1, 1]) {
    box(s * 0.24, 2.16, -41.91, 0.065, 0.52, 0.08, gold);
    box(s * 2.94, 8.5, -42.13, 0.44, 17, 0.45, stoneLight);
    box(s * 2.94, 0.75, -42.08, 0.72, 1.5, 0.66, stoneShade);
  }
  label("고려대학교", "KOREA UNIVERSITY · 1905", 0, 7.1, -42.08, 5.1, 1.3);
  for (let step = 0; step < 3; step++)
    box(
      0,
      0.11 + step * 0.12,
      -40.7 - step * 0.36,
      6.2 - step * 0.45,
      0.22 + step * 0.24,
      1.5,
      stoneLight,
    );
  colliders.push({ x: 0, z: -44.9, halfX: 3.35, halfZ: 2.75, height: 26.34 });
  for (const s of [-1, 1])
    colliders.push({
      x: s * 13.4,
      z: -43.95,
      halfX: 1.65,
      halfZ: 1.35,
      height: 19.77,
    });
  lancet(-1.4, 14.65, -42.17, 1.05, 2.85);
  lancet(1.4, 14.65, -42.17, 1.05, 2.85);
  for (const xx of [-2.6, -0.87, 0.87, 2.6])
    box(xx, 20.2, -42.2, 0.9, 1.2, 0.7, stoneLight);
  for (const xx of [-2.6, 2.6]) {
    for (const zz of [-46.95, -44.7])
      box(xx, 20.2, zz, 0.9, 1.2, 0.7, stoneLight);
  }
  instance(coneGeometry, roof, 0, 22.6, -44.9, 4.55, 5.3, 3.7, Math.PI / 4);
  cylinder(0, 25.5, -44.9, 0.06, 1.2, gold);
  ball(0, 26.2, -44.9, 0.14, gold);
  // A real clock face rather than an unreadable texture at the top of the tower.
  const clockTexture = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#eee7cc";
    ctx.beginPath();
    ctx.arc(128, 128, 119, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#876e43";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.save();
    ctx.translate(128, 128);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = "#454e48";
      ctx.fillRect(-3, -104, 6, 16);
    }
    ctx.strokeStyle = "#324741";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-35, -42);
    ctx.moveTo(0, 0);
    ctx.lineTo(51, -64);
    ctx.stroke();
    ctx.restore();
  });
  const clockMaterial = new THREE.MeshBasicMaterial({
    map: clockTexture,
    transparent: true,
    toneMapped: false,
  });
  materials.add(clockMaterial);
  mesh(
    keepGeometry(new THREE.CircleGeometry(1.12, 40)),
    clockMaterial,
    0,
    11.75,
    -42.16,
  );
  for (const side of [-1, 1]) flag(side * 18.5, 7, -36.8, side);

  facade(-46, -33, 26, 18, 10.2, "중앙도서관", "THE ARCHIVE · FIND YOUR STORY");
  roofGable(-46, 10.35, -33, 27, 19, 3.1);
  // The library's reading-room bay and rooftop lantern.
  box(-46, 10.9, -33, 5, 2.4, 5, stoneLight);
  for (let i = -1; i <= 1; i++)
    box(-46 + i * 1.1, 11, -30.46, 0.7, 1.3, 0.06, glass);
  instance(coneGeometry, roof, -46, 13.4, -33, 4, 2.8, 4, Math.PI / 4);
  box(-46, 4.9, -23.4, 7.5, 0.3, 1.7, stoneLight);
  for (const side of [-1, 1]) {
    box(-46 + side * 3.4, 2.4, -22.7, 0.48, 4.8, 0.48, stoneLight);
    cylinder(-46 + side * 3.4, 4.5, -22.7, 0.4, 0.25, stoneShade);
  }

  facade(
    46,
    -33,
    26,
    18,
    10.2,
    "생명과학관",
    "LIFE SCIENCES · KEEP IT GROWING",
  );
  roofGable(46, 10.3, -33, 27, 19, 2.8);
  // A small observatory on the science wing.
  cylinder(53, 13, -34, 3, 3, stoneLight);
  const dome = keepGeometry(
    new THREE.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  );
  mesh(dome, roofLight, 53, 14.5, -34);
  box(53, 15.55, -32.6, 0.55, 2.4, 2.4, glassDark);
  for (let i = 0; i < 5; i++)
    box(36 + i * 1.7, 12.25, -31, 1.5, 0.12, 3.8, glass, 0, false);

  facade(
    -46,
    30,
    26,
    18,
    8.5,
    "학생회관",
    "STUDENT UNION · BETTER TOGETHER",
    -1,
  );
  roofGable(-46, 8.6, 30, 27, 19, 2.7);
  // Crimson striped canopy and outdoor community tables.
  for (let i = 0; i < 12; i++)
    box(
      -46 + (i - 5.5) * 0.65,
      3.95,
      19.6,
      0.64,
      0.18,
      2.7,
      i % 2 ? cream : crimson,
    );
  for (const side of [-1, 1])
    cylinder(-46 + side * 3.9, 1.95, 18.3, 0.07, 3.9, darkMetal);
  for (let n = 0; n < 3; n++) {
    const tx = -60 + n * 5;
    cylinder(tx, 0.75, 44, 1.45, 0.18, wood);
    cylinder(tx, 0.35, 44, 0.12, 0.7, darkMetal);
    for (const side of [-1, 1])
      box(tx, 0.43, 44 + side * 1.8, 2.6, 0.18, 0.55, wood);
    cylinder(tx, 2, 44, 0.05, 4, darkMetal);
    instance(
      coneGeometry,
      n % 2 ? cream : crimson,
      tx,
      3.5,
      44,
      2.5,
      0.8,
      2.5,
      Math.PI / 8,
    );
  }

  // The future lab deliberately adds a contemporary chapter to the old campus.
  const cyberConcrete = mat("#dbe0d1");
  box(46, 5.8, 30, 26, 11.6, 18, cyberConcrete);
  box(46, 0.36, 30, 26.6, 0.72, 18.6, stoneShade);
  box(46, 11.8, 30, 27.4, 0.4, 19.4, stoneLight);
  box(47, 6, 20.88, 18.2, 9.4, 0.18, glass);
  for (let i = 0; i < 9; i++)
    box(38.8 + i * 2.04, 6, 20.73, 0.12, 9.55, 0.23, stoneLight);
  for (let i = 0; i < 3; i++)
    box(47, 3 + i * 3, 20.71, 18.4, 0.17, 0.28, stoneLight);
  for (let i = 0; i < 4; i++) {
    box(59.04, 6.3, 23.8 + i * 4, 0.12, 8.7, 2.7, glassLight);
    box(32.95, 6.3, 23.8 + i * 4, 0.12, 8.7, 2.7, glass);
  }
  for (let i = 0; i < 7; i++)
    box(36 + i * 3.3, 5.9, 39.05, 1.6, 7.5, 0.13, glass);
  box(35.5, 6, 20.52, 3.4, 12, 0.65, crimson);
  label(
    "미래정보관",
    "FUTURE LAB · MAKE A CONNECTION",
    46.6,
    10.8,
    20.49,
    8.7,
    1.3,
    -1,
  );
  box(46, 3, 19.5, 7.5, 0.3, 3, darkMetal);
  for (const s of [-1, 1])
    cylinder(46 + s * 3.4, 1.4, 18.1, 0.07, 2.8, darkMetal);
  for (let i = 0; i < 6; i++) {
    box(38 + i * 3.3, 12.3, 31, 2.8, 0.25, 5, glassDark);
    box(38 + i * 3.3, 12.42, 31, 0.05, 0.02, 5, glassLight, 0, false);
    box(38 + i * 3.3, 12.42, 31, 2.8, 0.02, 0.05, glassLight, 0, false);
  }
  colliders.push({ x: 46, z: 30, halfX: 13.2, halfZ: 9.2, height: 12.43 });

  // A tucked-away glasshouse west of the main hall.
  box(-25, 0.26, -55.5, 11.8, 0.52, 10.8, stoneShade);
  const greenhouseGlass = mat("#b6cec0", {
    roughness: 0.2,
    metalness: 0.14,
    transparent: true,
    opacity: 0.61,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  box(-25, 2.8, -55.5, 11.2, 5, 10.2, greenhouseGlass, 0, false);
  roofGable(-25, 5.3, -55.5, 11.4, 10.4, 2.8, greenhouseGlass);
  for (let i = 0; i <= 6; i++) {
    const xx = -30.6 + i * 1.867;
    box(xx, 2.8, -50.35, 0.11, 5.2, 0.11, stoneLight);
    box(xx, 2.8, -60.65, 0.11, 5.2, 0.11, stoneLight);
    // Roof ribs follow the same ridge as the glass panes.
    const angle = Math.atan2(2.8, 5.2);
    const length = Math.hypot(5.2, 2.8);
    const ribA = mesh(
      keepGeometry(new THREE.BoxGeometry(0.1, 0.1, length)),
      stoneLight,
      xx,
      6.7,
      -52.9,
    );
    ribA.rotation.x = angle;
    const ribB = mesh(
      keepGeometry(new THREE.BoxGeometry(0.1, 0.1, length)),
      stoneLight,
      xx,
      6.7,
      -58.1,
    );
    ribB.rotation.x = -angle;
  }
  box(-25, 3, -50.28, 11.3, 0.12, 0.14, stoneLight);
  box(-25, 5.25, -50.28, 11.3, 0.12, 0.14, stoneLight);
  for (let i = 0; i < 10; i++) {
    const px = -29.8 + (i % 5) * 2.4;
    const pz = -57.5 + Math.floor(i / 5) * 3.8;
    cylinder(px, 0.7, pz, 0.65, 1.4, terracotta);
    ball(px, 1.9, pz, 1, i % 2 ? greenPale : green, 1.5);
  }
  label("은행 온실", "GROW SOMETHING GOOD", -25, 4.25, -50.17, 4, 1.02);
  colliders.push({ x: -25, z: -55.5, halfX: 5.9, halfZ: 5.4, height: 8.1 });

  function bench(x: number, z: number, ry = 0) {
    const p = (dx: number, dz: number) => ({
      x: x + dx * Math.cos(ry) + dz * Math.sin(ry),
      z: z - dx * Math.sin(ry) + dz * Math.cos(ry),
    });
    for (let slat = 0; slat < 4; slat++) {
      const a = p(0, -0.38 + slat * 0.23);
      box(a.x, 0.55, a.z, 3, 0.12, 0.18, wood, ry);
    }
    for (let slat = 0; slat < 3; slat++) {
      const a = p(0, -0.55);
      box(a.x, 0.93 + slat * 0.22, a.z, 3, 0.16, 0.1, wood, ry);
    }
    for (const s of [-1, 1]) {
      const a = p(s * 1.13, 0);
      box(a.x, 0.29, a.z, 0.11, 0.55, 0.9, darkMetal, ry);
      const b = p(s * 1.13, -0.53);
      box(b.x, 0.81, b.z, 0.09, 1.25, 0.1, darkMetal, ry);
    }
  }
  function lamp(x: number, z: number, height = 4.2) {
    cylinder(x, height / 2, z, 0.07, height, darkMetal);
    cylinder(x, 0.2, z, 0.21, 0.4, darkMetal);
    box(x, height, z, 0.43, 0.7, 0.43, luminous);
    box(x, height - 0.38, z, 0.6, 0.1, 0.6, darkMetal);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(
          x + sx * 0.24,
          height,
          z + sz * 0.24,
          0.045,
          0.77,
          0.045,
          darkMetal,
        );
    instance(
      coneGeometry,
      darkMetal,
      x,
      height + 0.53,
      z,
      0.48,
      0.35,
      0.48,
      Math.PI / 4,
    );
  }
  function tree(
    x: number,
    z: number,
    size = 1,
    isGolden = false,
    isPine = false,
  ) {
    const h = (5.3 + random() * 2) * size;
    // Only the narrow trunk blocks walking. The camera may look through foliage.
    colliders.push({ x, z, halfX: 0.25 * size, halfZ: 0.25 * size, height: 0 });
    instance(
      thinCylinderGeometry,
      bark,
      x,
      h * 0.4,
      z,
      0.22 * size,
      h * 0.8,
      0.22 * size,
    );
    activeCanopy = canopies.length;
    canopies.push({ bounds: new THREE.Box3(), opacity: 1, instances: [] });
    if (isPine) {
      for (let tier = 0; tier < 3; tier++) {
        const radius = (2.65 - tier * 0.53) * size;
        instance(
          coneGeometry,
          tier % 2 ? green : greenLight,
          x,
          h * 0.55 + tier * size * 1.45,
          z,
          radius,
          3.9 * size,
          radius,
          random(),
        );
      }
    } else {
      const leaf1 = isGolden ? autumn : greenLight;
      const leaf2 = isGolden ? autumnLight : green;
      ball(x, h, z, 2.65 * size, leaf1, 0.94);
      ball(x - 1.45 * size, h - 0.9 * size, z + 0.4 * size, 1.9 * size, leaf2);
      ball(x + 1.45 * size, h - 0.6 * size, z - 0.4 * size, 1.95 * size, leaf1);
      ball(x + 0.2 * size, h - 0.4 * size, z + 1.4 * size, 1.85 * size, leaf2);
      ball(x - 0.4 * size, h + 1.65 * size, z - 0.2 * size, 1.65 * size, leaf1);
    }
    activeCanopy = -1;
    disc(x, z, 1.25 * size, grassDark, 0.035);
  }
  function shrub(x: number, z: number, size = 1, light = false) {
    instance(
      coarseSphere,
      light ? greenPale : green,
      x,
      size * 0.57,
      z,
      size,
      size * 0.8,
      size * 0.85,
      random() * 4,
    );
  }
  function flowerbed(x: number, z: number, w: number, d: number, count = 14) {
    box(x, 0.08, z, w, 0.16, d, stoneShade, 0, false);
    box(x, 0.17, z, w - 0.2, 0.12, d - 0.2, grassDark, 0, false);
    for (let i = 0; i < count; i++) {
      const fx = x + (random() - 0.5) * (w - 0.6);
      const fz = z + (random() - 0.5) * (d - 0.5);
      const h = 0.25 + random() * 0.2;
      instance(
        thinCylinderGeometry,
        green,
        fx,
        0.25 + h / 2,
        fz,
        0.025,
        h,
        0.025,
        0,
        false,
      );
      instance(
        coarseSphere,
        i % 3 === 0 ? cream : i % 3 === 1 ? pink : flowerRed,
        fx,
        0.25 + h,
        fz,
        0.17,
        0.1,
        0.17,
        random(),
        false,
      );
    }
  }
  // Symmetrical approach gardens; the deliberately open lawns support free roaming.
  for (const s of [-1, 1]) {
    for (const zz of [-26, -9, 8, 29, 45, 58]) lamp(s * 6.8, zz);
    for (const zz of [-25, 24]) {
      flowerbed(s * 13, zz, 5.8, 2, 28);
      bench(s * 13, zz + (zz < 0 ? 2.6 : -2.6), zz < 0 ? 0 : Math.PI);
    }
    for (const xx of [25, 36, 58]) {
      lamp(s * xx, -10.3);
      lamp(s * xx, 10.3);
    }
    for (const zz of [-6, 5]) {
      disc(s * 28, zz, 6, lawn, 0.024);
      tree(s * 28, zz, 0.93, zz > 0);
    }
    tree(s * 13, 36, 0.85, true);
    tree(s * 12, 53, 1.04, true);
    tree(s * 25, 24, 0.72, false);
    for (const zz of [-36, -31]) shrub(s * 20, zz, 0.75, true);
    for (const zz of [26, 31, 36]) shrub(s * 17, zz, 0.8, true);
    for (const xx of [33, 39, 51, 57]) flowerbed(s * xx, -20.9, 3.8, 1.25, 14);
  }
  for (const [x, z, size, golden] of [
    [-67, -49, 1.2, 0],
    [-65, -30, 1.05, 1],
    [-67, -6, 1.3, 0],
    [-63, 9, 0.95, 1],
    [-63, 33, 1, 0],
    [-63, 52, 1.15, 1],
    [-48, 56, 1.1, 0],
    [-35, 49, 1.3, 1],
    [-29, 60, 0.9, 0],
    [-20, 66, 1.05, 1],
    [64, -47, 1.15, 1],
    [65, -30, 1.1, 0],
    [65, -4, 1.3, 0],
    [64, 10, 1.1, 1],
    [66, 34, 1.1, 0],
    [63, 50, 1.3, 1],
    [49, 56, 1.2, 0],
    [39, 62, 1, 1],
    [18, 62, 0.86, 0],
    [-40, -58, 0.8, 1],
    [26, -56, 0.85, 1],
    [31, -62, 1.1, 0],
    [-57, -55, 1.1, 1],
    [-23, -30, 1.18, 1],
    [23, -30, 1.18, 1],
  ])
    tree(x, z, size, Boolean(golden));
  for (let n = 0; n < 40; n++) {
    const side = n % 4;
    const p = -72 + Math.floor(n / 4) * 16 + random() * 2;
    if (side === 0)
      tree(
        -75 - random() * 3,
        p,
        0.9 + random() * 0.4,
        n % 3 === 0,
        n % 2 === 0,
      );
    if (side === 1)
      tree(
        75 + random() * 3,
        p,
        0.9 + random() * 0.4,
        n % 3 === 0,
        n % 2 === 0,
      );
    if (side === 2)
      tree(
        p,
        -74 - random() * 4,
        1.05 + random() * 0.4,
        n % 3 === 0,
        n % 2 === 0,
      );
    if (side === 3 && Math.abs(p) > 13)
      tree(p, 75 + random() * 3, 0.8 + random() * 0.5, n % 3 === 0);
  }
  // Low distant hills soften the horizon without enclosing the explorable grounds.
  const hill = mat("#9cac86", { flatShading: true });
  const hillFar = mat("#b0bea0", { flatShading: true });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    instance(
      sphereGeometry,
      i % 2 ? hill : hillFar,
      Math.cos(a) * 125,
      -3,
      Math.sin(a) * 125,
      32 + random() * 15,
      10 + random() * 9,
      30 + random() * 13,
      a,
      false,
    );
  }

  // Reflecting pond with lily pads, rocks and a timber overlook.
  disc(25, 49, 9.6, stoneShade, 0.1);
  disc(25, 49, 9.2, grassDark, 0.14);
  disc(25, 49, 8.75, water, 0.19);
  colliders.push({ x: 25, z: 49.4, halfX: 7.5, halfZ: 7.8, height: 0.25 });
  const rippleMaterial = mat("#a6d0cc", {
    transparent: true,
    opacity: 0.43,
    roughness: 0.35,
  });
  const ripple = mesh(
    keepGeometry(new THREE.RingGeometry(2.9, 2.98, 64)),
    rippleMaterial,
    25,
    0.227,
    49,
  );
  ripple.rotation.x = -Math.PI / 2;
  ripple.castShadow = false;
  const ripple2 = mesh(
    keepGeometry(new THREE.RingGeometry(4.8, 4.86, 64)),
    rippleMaterial,
    25,
    0.226,
    49,
  );
  ripple2.rotation.x = -Math.PI / 2;
  ripple2.castShadow = false;
  for (let i = 0; i < 11; i++) {
    const a = (i * Math.PI * 2) / 11;
    const xx = 25 + Math.cos(a) * 9.3;
    const zz = 49 + Math.sin(a) * 9.3;
    ball(
      xx,
      0.4,
      zz,
      0.65 + random() * 0.45,
      i % 2 ? stoneShade : sandstone,
      0.65,
    );
    if (i % 2) shrub(xx + Math.cos(a), zz + Math.sin(a), 0.7, true);
  }
  for (let i = 0; i < 9; i++) {
    const xx = 23 + random() * 7;
    const zz = 47 + random() * 7;
    disc(xx, zz, 0.35 + random() * 0.22, green, 0.25);
    if (i % 3 === 0)
      instance(coarseSphere, pink, xx, 0.4, zz, 0.25, 0.25, 0.25, 0, false);
  }
  for (let i = 0; i < 11; i++)
    box(25, 0.22, 38.1 + i * 0.25, 5.4, 0.12, 0.21, wood);
  for (const s of [-1, 1]) {
    cylinder(25 + s * 2.8, 0.85, 38.3, 0.09, 1.7, darkMetal);
    cylinder(25 + s * 2.8, 0.85, 40.5, 0.09, 1.7, darkMetal);
    box(25 + s * 2.8, 1.55, 39.4, 0.1, 0.1, 2.3, wood);
  }
  bench(38, 46, -Math.PI / 2);
  bench(26, 61, Math.PI);
  lamp(34, 38);
  freestandingSign("생태 연못", "A MOMENT TO LISTEN", 34, 41, 1, 3.8);

  // A friendly, sculptural tiger, standing beside (never across) the main avenue.
  const bronze = mat("#b59a61", { roughness: 0.58, metalness: 0.3 });
  const bronzeDark = mat("#665d43", { roughness: 0.6, metalness: 0.2 });
  box(-11, 0.4, 43, 4.7, 0.8, 3.5, stoneShade);
  colliders.push({ x: -11, z: 43, halfX: 2.35, halfZ: 1.75, height: 3.55 });
  box(-11, 0.86, 43, 4.3, 0.16, 3.1, stoneLight);
  instance(sphereGeometry, bronze, -11, 2.15, 43, 1.45, 0.88, 0.68, 0);
  ball(-12.1, 2.75, 43, 0.75, bronze);
  ball(-12.63, 2.6, 43, 0.42, bronze);
  for (const s of [-1, 1]) {
    ball(-12.08, 3.3, 43 + s * 0.42, 0.23, bronze);
    ball(-12.56, 2.98, 43 + s * 0.39, 0.065, bronzeDark);
    for (const xx of [-11.9, -10.1]) {
      cylinder(xx, 1.4, 43 + s * 0.44, 0.22, 1.2, bronze);
      ball(xx - 0.1, 0.98, 43 + s * 0.44, 0.28, bronze, 0.5);
    }
    for (let i = 0; i < 4; i++)
      box(
        -11.75 + i * 0.6,
        2.36,
        43 + s * 0.61,
        0.11,
        0.6,
        0.07,
        bronzeDark,
        0,
        false,
      );
  }
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-9.7, 2.1, 43),
    new THREE.Vector3(-9.05, 2.7, 43),
    new THREE.Vector3(-9.1, 3.2, 43),
    new THREE.Vector3(-9.5, 3.35, 43),
  ]);
  mesh(
    keepGeometry(new THREE.TubeGeometry(tailCurve, 12, 0.13, 6, false)),
    bronze,
    0,
    0,
    0,
  );
  label(
    "자유 · 정의 · 진리",
    "LIBERTAS · JUSTITIA · VERITAS",
    -11,
    0.47,
    44.78,
    3.65,
    0.53,
  );
  flowerbed(-16, 43, 3, 5, 28);

  // Campus gate: the centre stays wide open for the arrival and final departure.
  for (const side of [-1, 1]) {
    box(side * 9, 3.35, 65, 3.7, 6.7, 4.1, stone);
    box(side * 9, 6.75, 65, 4.1, 0.35, 4.5, stoneLight);
    instance(coneGeometry, roof, side * 9, 7.6, 65, 3, 1.5, 3, Math.PI / 4);
    ball(side * 9, 8.5, 65, 0.25, gold);
    box(side * 9, 3.8, 67.08, 1.8, 3, 0.08, crimson);
    label("KU", "1905", side * 9, 3.85, 67.14, 1.4, 1.7, 1, "#8c153b");
    colliders.push({
      x: side * 9,
      z: 65,
      halfX: 1.9,
      halfZ: 2.1,
      height: 8.75,
    });
    for (let j = 0; j < 10; j++) {
      const x = side * (12 + j * 1.1);
      cylinder(x, 1.8, 65, 0.045, 3.2, darkMetal);
      instance(coneGeometry, gold, x, 3.5, 65, 0.11, 0.3, 0.11);
    }
    box(side * 17, 0.4, 65, 12, 0.8, 1.1, stoneShade);
    box(side * 17, 1.25, 65, 12, 0.08, 0.12, darkMetal);
    box(side * 17, 2.85, 65, 12, 0.08, 0.12, darkMetal);
  }
  // The entrance remains walkable underneath; only the camera avoids the sign.
  cameraOnlyColliders.push(
    new THREE.Box3(
      new THREE.Vector3(-7.3, 6.3, 64.55),
      new THREE.Vector3(7.3, 8.1, 65.45),
    ),
  );
  box(0, 6.65, 65, 14.3, 0.42, 0.55, darkMetal);
  label("고려대학교", "A CAMPUS OF POSSIBILITIES", 0, 7.25, 65.3, 10.8, 1.4);
  label(
    "고려대학교",
    "A CAMPUS OF POSSIBILITIES",
    0,
    7.25,
    64.7,
    10.8,
    1.4,
    -1,
  );
  flag(-6.7, 6.3, 57.4, 0.5, true);
  flag(6.7, 6.3, 57.4, 2.3, true);
  freestandingSign(
    "캠퍼스 안내",
    "EXPLORE · CONNECT · DISCOVER",
    -6.9,
    51.5,
    1,
    4.3,
  );
  freestandingSign(
    "오늘, 나의 가능성",
    "YOUR STORY STARTS HERE",
    8.3,
    50.7,
    1,
    4.8,
  );

  // Notice board, bicycle parking and small wayfinding details reward wandering.
  box(-36, 1.9, 17, 4.6, 2.7, 0.3, wood);
  box(-36, 1.9, 16.82, 4.2, 2.3, 0.08, cream);
  for (const s of [-1, 1])
    box(-36 + s * 1.8, 0.75, 17, 0.16, 1.5, 0.16, darkMetal);
  label(
    "함께 만드는 캠퍼스",
    "CLUBS · MUSIC · COMMUNITY",
    -36,
    2.7,
    16.72,
    3.8,
    0.8,
    -1,
    "#8c153b",
  );
  for (let i = 0; i < 4; i++)
    box(
      -37.4 + i * 0.95,
      1.6,
      16.73,
      0.7,
      0.95,
      0.06,
      i % 2 ? pink : autumnLight,
    );
  const wheelGeometry = keepGeometry(
    new THREE.TorusGeometry(0.48, 0.055, 5, 14),
  );
  for (let i = 0; i < 4; i++) {
    const xx = 35.5 + i * 1.15;
    // Side-on bicycle silhouettes beside the future lab.
    instance(wheelGeometry, darkMetal, xx, 0.5, 42, 1, 1, 1, Math.PI / 2);
    instance(wheelGeometry, darkMetal, xx, 0.5, 43.7, 1, 1, 1, Math.PI / 2);
    box(xx, 0.95, 42.75, 0.07, 0.07, 1.5, i % 2 ? crimson : gold);
    box(xx, 1.1, 43.4, 0.07, 1.1, 0.07, darkMetal);
    box(xx, 1.6, 43.4, 0.55, 0.08, 0.08, darkMetal);
    box(xx, 1.15, 42.5, 0.08, 0.9, 0.08, darkMetal);
    box(xx, 1.5, 42.5, 0.35, 0.1, 0.4, wood);
  }
  for (const s of [-1, 1]) {
    bench(s * 35, -7, (s * Math.PI) / 2);
    bench(s * 35, 6, (s * Math.PI) / 2);
    flowerbed(s * 20, -8, 1.4, 4, 17);
    flowerbed(s * 20, 5, 1.4, 4, 17);
  }
  // Grass tufts sit away from the paths, and cost only one instanced draw call.
  for (let i = 0; i < 260; i++) {
    const x = (random() - 0.5) * 139;
    const z = (random() - 0.5) * 139;
    if (
      Math.abs(x) < 9 ||
      Math.abs(z - 15) < 6 ||
      Math.abs(z + 15) < 6 ||
      Math.hypot(x, z + 3) < 22
    )
      continue;
    if (
      colliders.some(
        (c) =>
          Math.abs(c.x - x) < c.halfX + 2 && Math.abs(c.z - z) < c.halfZ + 2,
      )
    )
      continue;
    instance(
      coneGeometry,
      greenPale,
      x,
      0.16,
      z,
      0.14,
      0.32,
      0.14,
      random() * 6,
      false,
    );
  }

  // Warm bunting frames the plaza. Festival mode lights it and releases confetti.
  const festivalGroup = new THREE.Group();
  festivalGroup.visible = false;
  festivalGroup.name = "A campus celebration";
  campus.add(festivalGroup);
  for (const s of [-1, 1]) {
    cylinder(s * 17, 3.8, -12, 0.075, 7.6, darkMetal);
    cylinder(s * 17, 3.8, 10, 0.075, 7.6, darkMetal);
  }
  const wireMaterial = new THREE.LineBasicMaterial({ color: "#6c7561" });
  materials.add(wireMaterial);
  for (const zz of [-12, 10]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 30; i++)
      points.push(
        new THREE.Vector3(
          -17 + (i / 30) * 34,
          7.6 - Math.sin((i / 30) * Math.PI) * 1.5,
          zz,
        ),
      );
    const curve = keepGeometry(
      new THREE.BufferGeometry().setFromPoints(points),
    );
    campus.add(new THREE.Line(curve, wireMaterial));
    for (let i = 1; i < 18; i++) {
      const fraction = i / 18;
      const x = -17 + fraction * 34;
      const y = 7.6 - Math.sin(fraction * Math.PI) * 1.5;
      const triangle = new THREE.Shape();
      triangle.moveTo(-0.43, 0);
      triangle.lineTo(0.43, 0);
      triangle.lineTo(0, -0.68);
      triangle.closePath();
      const buntingMaterial = i % 3 === 0 ? gold : i % 2 ? crimson : cream;
      const pennant = mesh(
        keepGeometry(new THREE.ShapeGeometry(triangle)),
        buntingMaterial,
        x,
        y - 0.05,
        zz,
      );
      pennant.material = buntingMaterial;
      // Small lights are visible in daytime, with more glow in the final scene.
      const bulb = mesh(
        keepGeometry(new THREE.SphereGeometry(0.095, 6, 4)),
        luminous,
        x + 0.65,
        y - 0.02,
        zz,
      );
      lanterns.push(bulb);
    }
  }
  const confettiCount = 180;
  const confettiPositions = new Float32Array(confettiCount * 3);
  const confettiColors = new Float32Array(confettiCount * 3);
  const confettiSeeds: { x: number; z: number; h: number; speed: number }[] =
    [];
  const colors = [
    new THREE.Color("#ab3154"),
    new THREE.Color("#e6b960"),
    new THREE.Color("#fff0ce"),
    new THREE.Color("#90b6ac"),
  ];
  for (let i = 0; i < confettiCount; i++) {
    const p = {
      x: (random() - 0.5) * 32,
      z: -3 + (random() - 0.5) * 28,
      h: random() * 15,
      speed: 0.7 + random() * 0.9,
    };
    confettiSeeds.push(p);
    confettiPositions.set([p.x, p.h, p.z], i * 3);
    colors[i % colors.length].toArray(confettiColors, i * 3);
  }
  const confettiGeometry = keepGeometry(new THREE.BufferGeometry());
  confettiGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(confettiPositions, 3),
  );
  confettiGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(confettiColors, 3),
  );
  const confettiMaterial = new THREE.PointsMaterial({
    size: 0.16,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });
  materials.add(confettiMaterial);
  festivalGroup.add(new THREE.Points(confettiGeometry, confettiMaterial));
  const leafGeometry = keepGeometry(new THREE.PlaneGeometry(0.19, 0.1));
  const leafMaterial = mat("#d9b471", { side: THREE.DoubleSide });
  for (let i = 0; i < 16; i++) {
    const leaf = mesh(
      leafGeometry,
      leafMaterial,
      (random() - 0.5) * 55,
      random() * 7 + 1,
      (random() - 0.5) * 100,
    );
    leaf.userData.origin = leaf.position.clone();
    leaf.castShadow = false;
    windLeaves.push(leaf);
  }

  for (const batch of batches.values()) {
    let geometry = batch.geometry;
    let material = batch.material;
    if (batch.canopyIds[0] >= 0) {
      // Alpha hashing preserves depth and batching while fading individual trees.
      geometry = keepGeometry(batch.geometry.clone());
      const opacity = new THREE.InstancedBufferAttribute(
        new Float32Array(batch.matrices.length).fill(1),
        1,
      );
      opacity.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("instanceFoliageOpacity", opacity);
      const foliageMaterial = (
        batch.material as THREE.MeshStandardMaterial
      ).clone();
      foliageMaterial.alphaHash = true;
      foliageMaterial.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "attribute float instanceFoliageOpacity;\nvarying float vFoliageOpacity;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvFoliageOpacity = instanceFoliageOpacity;",
        );
        shader.fragmentShader =
          "varying float vFoliageOpacity;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <alphahash_fragment>",
          "diffuseColor.a *= vFoliageOpacity;\n#include <alphahash_fragment>",
        );
      };
      foliageMaterial.customProgramCacheKey = () =>
        "campus-foliage-visibility-v1";
      materials.add(foliageMaterial);
      material = foliageMaterial;
      batch.canopyIds.forEach((id, index) =>
        canopies[id].instances.push({ attribute: opacity, index }),
      );
    }
    const instanced = new THREE.InstancedMesh(
      geometry,
      material,
      batch.matrices.length,
    );
    batch.matrices.forEach((matrix, index) =>
      instanced.setMatrixAt(index, matrix),
    );
    instanced.instanceMatrix.needsUpdate = true;
    instanced.castShadow = batch.shadow;
    instanced.receiveShadow = true;
    instanced.computeBoundingSphere();
    campus.add(instanced);
  }
  batches.clear();
  const sightline = new THREE.Ray();
  const sightOrigin = new THREE.Vector3();
  const sightHit = new THREE.Vector3();
  const sightBounds = new THREE.Box3();

  return {
    colliders,
    cameraOnlyColliders,
    updateVisibility(camera, player, delta) {
      let distance = 0;
      if (player) {
        sightOrigin.copy(player);
        sightOrigin.y += 1.4;
        sightline.origin.copy(sightOrigin);
        sightline.direction.copy(camera).sub(sightOrigin);
        distance = sightline.direction.length();
        sightline.direction.normalize();
      }
      for (const canopy of canopies) {
        // Expand by the character silhouette, not only a pencil-thin centre ray.
        sightBounds.copy(canopy.bounds).expandByScalar(0.8);
        const occludes =
          !!player &&
          (sightBounds.containsPoint(sightOrigin) ||
            (sightline.intersectBox(sightBounds, sightHit) !== null &&
              sightOrigin.distanceTo(sightHit) < distance));
        const target = occludes ? 0 : 1;
        const damped = THREE.MathUtils.damp(
          canopy.opacity,
          target,
          15,
          Math.min(delta, 0.05),
        );
        const next = Math.abs(damped - target) < 0.003 ? target : damped;
        if (Math.abs(next - canopy.opacity) < 0.0005) continue;
        canopy.opacity = next;
        for (const item of canopy.instances) {
          item.attribute.setX(item.index, next);
          item.attribute.needsUpdate = true;
        }
      }
    },
    update(elapsed, festival) {
      for (const f of animatedFlags) {
        const position = f.mesh.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          const x = f.original[i * 3];
          const y = f.original[i * 3 + 1];
          position.setZ(
            i,
            Math.sin(elapsed * 2.25 - x * 2.7 + y * 0.6 + f.phase) * 0.17 * x,
          );
        }
        position.needsUpdate = true;
      }
      ripple.scale.setScalar(1 + Math.sin(elapsed * 0.55) * 0.14);
      ripple2.scale.setScalar(1 + Math.sin(elapsed * 0.55 + 1.8) * 0.11);
      water.color.setHSL(0.52, 0.25, 0.56 + Math.sin(elapsed * 0.4) * 0.015);
      windLeaves.forEach((leaf, i) => {
        const origin = leaf.userData.origin as THREE.Vector3;
        leaf.position.set(
          origin.x + Math.sin(elapsed * 0.2 + i) * 3,
          0.4 + ((((origin.y - elapsed * 0.35) % 7) + 7) % 7),
          origin.z + Math.cos(elapsed * 0.17 + i) * 2,
        );
        leaf.rotation.set(elapsed * 0.4 + i, elapsed * 0.7, elapsed * 0.3 + i);
      });
      festivalGroup.visible = festival;
      luminous.emissiveIntensity = festival ? 1.8 : 0.55;
      if (festival) {
        const positions = confettiGeometry.attributes.position;
        confettiSeeds.forEach((p, i) =>
          positions.setXYZ(
            i,
            p.x + Math.sin(elapsed + i) * 0.65,
            1 + ((((p.h - elapsed * p.speed) % 15) + 15) % 15),
            p.z + Math.cos(elapsed * 0.8 + i) * 0.6,
          ),
        );
        positions.needsUpdate = true;
        lanterns.forEach((light, i) =>
          light.scale.setScalar(1.25 + Math.sin(elapsed * 2 + i) * 0.2),
        );
      }
    },
    dispose() {
      scene.remove(campus);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      campus.clear();
    },
  };
}
