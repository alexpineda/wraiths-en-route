import loadEnvironmentMap from "../utils/env-map";
import {
    BlendFunction,
    BloomEffect,
    ChromaticAberrationEffect,
    EffectPass,
    GlitchEffect,
    GodRaysEffect,
    KernelSize,
    RenderPass,
    SMAAEffect,
    ToneMappingEffect,
    VignetteEffect,
    EffectComposer
} from "postprocessing";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

import {
    DirectionalLight,
    HalfFloatType,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    PCFSoftShadowMap,
    Scene,
    SphereBufferGeometry,
    sRGBEncoding,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import CameraControls from "camera-controls";
import * as THREE from "three";
import Janitor from "../utils/janitor";
import { createBattleLights, createStarField, distantStars } from "./stars";
import { createBattleCruiser } from "./battlecruiser";
import { createAsteroids } from "./asteroids";
import { createWraithNoise, playRemix, WraithNoise } from "./wraith-noise";
import { createWraiths } from "./wraiths";
import { CameraState, CAMERA_ROTATE_SPEED, createCamera } from "./camera";
import { useStore } from "../store";

import Surface from "../utils/surface";
import { loadSkybox } from "../utils/skybox";

CameraControls.install({ THREE: THREE });

const camera = createCamera();
window.camera = camera.get();

const controls = new CameraControls(camera.get(), document.body);
controls.maxPolarAngle = Infinity;
controls.minPolarAngle = -Infinity;
controls.maxAzimuthAngle = Infinity;
controls.minAzimuthAngle = -Infinity;

const chromaticAberrationEffect = new ChromaticAberrationEffect();
const glitchMax = new Vector2(0.05, 0.08);

const glitchEffect = new GlitchEffect({
    chromaticAberrationOffset: chromaticAberrationEffect.offset,
    columns: 0,
    delay: new Vector2(1.5, 3.5),
    strength: new Vector2().copy(glitchMax),
    duration: new Vector2(6, 10),
    blendFunction: BlendFunction.OVERLAY,
});

let _lastElapsed = 0;

const battleCruiser = createBattleCruiser();
const asteroids = createAsteroids();
const wraiths = createWraiths();
const starfield = createStarField();
const battleLights = createBattleLights();
let wraithNoise: WraithNoise;


const renderer = new WebGLRenderer({
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    antialias: false,
    stencil: false,
    depth: true,
    precision: "highp",
});
renderer.outputEncoding = sRGBEncoding;
renderer.debug.checkShaderErrors = true;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;
renderer.autoClear = false;

const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 0
});

const surface = new Surface(renderer.domElement);

const INTRO_LOOP = async (elapsed: number) => {
    const delta = elapsed - _lastElapsed;
    _lastElapsed = elapsed;

    controls.update(delta / 1000);

    const azimuth = THREE.MathUtils.euclideanModulo(
        controls.azimuthAngle,
        Math.PI * 2
    );
    const rear =
        azimuth < Math.PI
            ? azimuth / Math.PI
            : 2 - azimuth / Math.PI;

    camera.update(delta, controls, azimuth, mouse);

    wraiths.update(delta, camera.get(), azimuth, rear, camera.cameraState === CameraState.RotateAroundWraiths);
    battleCruiser.update(delta, CAMERA_ROTATE_SPEED, camera.get());
    starfield.update(azimuth, camera.get(), delta);
    battleLights.update(camera.get(), delta, azimuth);

    wraithNoise.value = camera.cameraState === CameraState.RotateAroundWraiths ? rear : 0;
    const g = camera.cameraState !== CameraState.UnderWraiths ? MathUtils.smoothstep(Math.pow(rear, 2.5), 0.25, 1) : 0;
    glitchEffect.minStrength = glitchMax.x * g;
    glitchEffect.maxStrength = glitchMax.y * g;
    bloomEffect.intensity = 0.5 + rear * 1;
    starfield.object.position.copy(camera.get().position);

    composer.render(delta);
};

const _sceneResizeHandler = () => {
    surface.setDimensions(
        window.innerWidth,
        window.innerHeight,
        devicePixelRatio
    );
    composer.setSize(surface.bufferWidth, surface.bufferHeight, false);
    camera.get().aspect = surface.width / surface.height;
    camera.get().updateProjectionMatrix();
};


export const preloadIntro = async () => {
    let value = 0;
    const increment = (amount = 1) => {
        value += amount;
        useStore.setState({ loading: value });
    }

    const fireTexture = await new EXRLoader().loadAsync("./FireBall03_8x8.exr");

    const envmap = await loadEnvironmentMap("./envmap.hdr");
    increment();

    await battleCruiser.load(envmap, fireTexture);
    increment();

    await asteroids.load(envmap);
    increment();

    await wraiths.load(envmap, fireTexture);

    battleLights.load(fireTexture);
    starfield.load();
    increment();

    return increment;
};

let mouse = new Vector3();
const _mousemove = (ev: MouseEvent) => {
    mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (ev.clientY / window.innerHeight) * 2 - 1;
};

export const getSurface = () => surface;
const bloomEffect = new BloomEffect({
    intensity: 1.25,
    blendFunction: BlendFunction.SCREEN,
})

export async function createWraithScene(increment: () => void) {
    const janitor = new Janitor();

    wraithNoise = janitor.add(createWraithNoise());
    wraithNoise.start();
    increment();

    janitor.addEventListener(window, "resize", _sceneResizeHandler, {
        passive: true,
    });
    janitor.addEventListener(window, "mousemove", _mousemove, { passive: true });

    _sceneResizeHandler();

    const scene = new Scene();
    scene.background = await loadSkybox();
    const slight = new DirectionalLight(0xffffff, 5);

    wraiths.init();
    scene.add(wraiths.object);
    janitor.add(wraiths);

    scene.add(distantStars());
    scene.add(battleCruiser.object);
    scene.add(asteroids.object);
    scene.add(starfield.object);
    scene.add(battleLights.object);
    window.scene = scene;
    scene.userData = {
        battleLights,
        wraiths,
        battleCruiser,
        asteroids,
        controls
    }

    setInterval(() => {
        playRemix();
    }, 60000 * 3 + Math.random() * 60000 * 10);
    increment();

    scene.add(slight);

    surface.setDimensions(
        window.innerWidth,
        window.innerHeight,
        1
    );
    composer.setSize(surface.bufferWidth, surface.bufferHeight, false);


    camera.get().aspect = surface.width / surface.height;
    camera.get().updateProjectionMatrix();

    controls.setLookAt(-3.15, 1.1, -0.7, 0, 0, 0, false);
    controls.zoomTo(1.75, false);
    controls.enabled = false;

    janitor.add(camera.init(controls, battleCruiser.object));

    const renderPass = new RenderPass(scene, camera.get());
    const sunMaterial = new MeshBasicMaterial({
        color: 0xffddaa,
        transparent: true,
        fog: false,
    });

    const sunGeometry = new SphereBufferGeometry(0.75, 32, 32);
    const sun = new Mesh(sunGeometry, sunMaterial);
    sun.frustumCulled = false;

    const godRaysEffect = new GodRaysEffect(camera.get(), sun, {
        height: 480,
        kernelSize: KernelSize.SMALL,
        density: 1,
        decay: 0.94,
        weight: 1,
        exposure: 1,
        samples: 60,
        clampMax: 1.0,
        blendFunction: BlendFunction.SCREEN,
    });

    slight.position.set(5, 5, 4);
    slight.position.multiplyScalar(10);
    slight.lookAt(0, 0, 0);
    sun.position.copy(slight.position).setY(0);
    sun.updateMatrix();
    sun.updateMatrixWorld();

    glitchEffect.blendMode.setOpacity(0.5);
    const glitchPass = new EffectPass(camera.get(), glitchEffect);
    const tone = new ToneMappingEffect();

    const vignet = new VignetteEffect({
        darkness: 0.55,
    });

    [
        renderPass,
        new EffectPass(
            camera.get(),
            bloomEffect,
            new SMAAEffect(),
            tone,
            godRaysEffect,
            vignet
        ),
        glitchPass,
    ].forEach(pass => composer.addPass(pass));
    increment();

    renderer.compile(scene, camera.get());
    composer.render(0);

    renderer.setAnimationLoop(INTRO_LOOP);
    janitor.add(() => {
        renderer.setAnimationLoop(null);
        composer.dispose();
    });

    return () => janitor.mopUp();
}
