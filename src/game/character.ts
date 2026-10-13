import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export type CampusCharacter = {
  group: THREE.Group;
  update: (
    delta: number,
    moving: boolean,
    running: boolean,
    celebrate?: boolean,
  ) => void;
  dispose: () => void;
};

type CharacterSource = {
  scene: THREE.Group;
  texture: THREE.Texture;
  clips: Record<"idle" | "walk" | "run" | "celebrate", THREE.AnimationClip>;
};

let sourcePromise: Promise<CharacterSource> | undefined;

/** The source has one 1,355-frame timeline. These are the original game's ranges. */
const animationFrames = {
  idle: [156, 255],
  walk: [3, 27],
  run: [33, 57],
  celebrate: [947, 979],
} as const;

function getSource(): Promise<CharacterSource> {
  if (sourcePromise) return sourcePromise;
  sourcePromise = (async () => {
    const decoder = new DRACOLoader();
    decoder.setDecoderPath("/vendors/draco/");
    decoder.setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(decoder);
    try {
      const [gltf, texture] = await Promise.all([
        loader.loadAsync("/assets/character.glb"),
        new THREE.TextureLoader().loadAsync("/assets/Character_Texture.png"),
      ]);
      if (!gltf.animations[0])
        throw new Error("The original character animation is missing.");
      // This is a packed expression/color atlas, not a regular glTF color map.
      texture.flipY = false;
      texture.premultiplyAlpha = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      const clips = Object.fromEntries(
        Object.entries(animationFrames).map(([name, frames]) => [
          name,
          THREE.AnimationUtils.subclip(
            gltf.animations[0],
            name,
            frames[0],
            frames[1],
            30,
          ),
        ]),
      ) as CharacterSource["clips"];
      return { scene: gltf.scene, texture, clips };
    } finally {
      decoder.dispose();
    }
  })().catch((error: unknown) => {
    sourcePromise = undefined;
    throw error;
  });
  return sourcePromise;
}

/** Preserve Coastal World's UV-expression masks while tinting the campus uniform. */
function makeMaterial(
  texture: THREE.Texture,
  color: string,
  face: THREE.Vector4,
) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.85,
    metalness: 0,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCampusCloth = { value: new THREE.Color(color) };
    shader.uniforms.uCampusSkin = { value: new THREE.Color("#ffd3ab") };
    shader.uniforms.uCampusFace = { value: face };
    shader.fragmentShader = `
      uniform vec3 uCampusCloth;
      uniform vec3 uCampusSkin;
      uniform vec4 uCampusFace;
    ${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #ifdef USE_MAP
        vec2 atlasUv = vMapUv;
        float isFace = 1.0 - step(0.7, vMapUv.x);
        float isCloth = 1.0 - isFace;
        float customCloth = isCloth * (1.0 - step(0.375, vMapUv.y));
        float rightEye = (1.0 - step(0.25, vMapUv.y)) * isFace;
        float leftEye = (1.0 - step(0.632 - rightEye, vMapUv.y)) * isFace;
        float mouth = step(0.66, vMapUv.y) * isFace;
        atlasUv.x += uCampusFace.x * 0.125 * rightEye;
        atlasUv.y -= 0.38461538 * leftEye;
        atlasUv.x += uCampusFace.y * 0.125 * leftEye;
        atlasUv.y += (0.25 * step(4.0, uCampusFace.z) - 0.25) * mouth;
        atlasUv.x += mod(uCampusFace.z, 4.0) * 0.25 * mouth;
        atlasUv.y += (rightEye + leftEye) * uCampusFace.w * 0.25;
        vec3 atlasColor = texture2D(map, atlasUv).rgb;
        vec3 clothColor = mix(atlasColor, uCampusCloth * (0.55 + 0.6 * atlasColor.r), customCloth);
        float expression = smoothstep(0.35, 0.65, atlasColor.g);
        vec3 skinColor = mix(uCampusSkin, vec3(0.028, 0.021, 0.018), expression);
        diffuseColor.rgb *= mix(clothColor, skinColor, isFace);
      #endif
    `,
    );
  };
  material.customProgramCacheKey = () => "coastal-campus-expression-v1";
  return material;
}

/** A separately animated skeleton; source geometry and the atlas are shared safely. */
export async function loadCharacter(color: string): Promise<CampusCharacter> {
  const source = await getSource();
  const model = clone(source.scene) as THREE.Group;
  const group = new THREE.Group();
  group.name = "CoastalCampusCharacter";
  group.add(model);
  model.scale.setScalar(0.89);

  const face = new THREE.Vector4(0, 0, 0, 0);
  const material = makeMaterial(source.texture, color, face);
  const backpackMaterial = makeMaterial(source.texture, "#273647", face);
  const shoeMaterial = makeMaterial(source.texture, "#f3ead5", face);
  const skeletons = new Set<THREE.Skeleton>();
  let leftEye: THREE.Object3D | undefined;
  let rightEye: THREE.Object3D | undefined;
  let mouth: THREE.Object3D | undefined;

  model.traverse((node) => {
    if (node.name.includes("OeilD_ref")) leftEye = node;
    if (node.name.includes("OeilR_ref")) rightEye = node;
    if (node.name.includes("Bouche_Ref")) mouth = node;
    if (!(node instanceof THREE.Mesh)) return;
    node.visible =
      /BODY_01|Head-Cap|Body-UrbanBackpack|Bottom-LowSneakers/.test(node.name);
    node.material = node.name.includes("Body-UrbanBackpack")
      ? backpackMaterial
      : node.name.includes("Bottom-LowSneakers")
        ? shoeMaterial
        : material;
    node.castShadow = node.visible;
    node.receiveShadow = true;
    // The source has a bind-pose bound; animated limbs can exceed it.
    node.frustumCulled = false;
    if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton);
  });

  const mixer = new THREE.AnimationMixer(model);
  const actions = {
    idle: mixer.clipAction(source.clips.idle),
    walk: mixer.clipAction(source.clips.walk),
    run: mixer.clipAction(source.clips.run),
    celebrate: mixer.clipAction(source.clips.celebrate),
  };
  actions.walk.timeScale = 0.9792;
  actions.run.timeScale = 0.9888;
  let current: keyof typeof actions = "idle";
  actions.idle.play();
  // Avoid a line of NPCs making the same movement in perfect synchrony.
  actions.idle.time = Math.random() * source.clips.idle.duration;
  let blinkIn = 1.4 + Math.random() * 2.3;
  let blinkRemaining = 0;
  let disposed = false;

  const update: CampusCharacter["update"] = (
    delta,
    moving,
    running,
    celebrate = false,
  ) => {
    if (disposed) return;
    const dt = Math.min(Math.max(delta, 0), 0.1);
    const next = celebrate
      ? "celebrate"
      : moving
        ? running
          ? "run"
          : "walk"
        : "idle";
    if (next !== current) {
      const previous = actions[current];
      const action = actions[next];
      action.reset().setEffectiveWeight(1).play();
      previous.crossFadeTo(action, 0.2, false);
      current = next;
    }
    mixer.update(dt);
    blinkIn -= dt;
    blinkRemaining = Math.max(0, blinkRemaining - dt);
    if (blinkIn <= 0) {
      blinkRemaining = 0.1;
      blinkIn = 1.6 + Math.random() * 2.4;
    }
    face.set(
      blinkRemaining > 0 ? 1 : Math.round((leftEye?.position.x ?? 0) / 100),
      blinkRemaining > 0 ? 1 : Math.round((rightEye?.position.x ?? 0) / 100),
      Math.round((mouth?.position.x ?? 0) / 100),
      0,
    );
  };
  update(0.001, false, false);

  return {
    group,
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      material.dispose();
      backpackMaterial.dispose();
      shoeMaterial.dispose();
      for (const skeleton of skeletons) skeleton.dispose();
      group.removeFromParent();
      // The cached GLB geometries and atlas may still be used by another actor.
    },
  };
}
