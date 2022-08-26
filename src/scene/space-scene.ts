import loadEnvironmentMap from "@utils/env-map";
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
} from "postprocessing";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

import {
    DirectionalLight,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    Scene,
    SphereBufferGeometry,
    TextureLoader,
    Vector2,
    Vector3,
} from "three";
import CameraControls from "camera-controls";
import * as THREE from "three";
import Janitor from "@utils/janitor";
import { createBattleLights, createStarField, distantStars } from "./stars";
import { createBattleCruiser } from "./battlecruiser";
import { createAsteroids } from "./asteroids";
import { createWraithNoise, playRemix, WraithNoise } from "./wraith-noise";
import { createWraiths } from "./wraiths";
import { CameraState, createCamera } from "./camera";

import Surface from "@utils/surface";
import { loadSkybox } from "@utils/skybox";
import { composer, renderer } from "@renderer";

CameraControls.install({ THREE: THREE });

const surface = new Surface(renderer.domElement);
export const getSurface = () => surface;

export const wraithScene = (quality: number) => {
    if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", function (evt) {
            mouse.y = (MathUtils.clamp(evt.beta ?? 0, 40, 80) - 40) / 40 * 2 - 1;
        }, true);
    }
    const camera = createCamera(quality);

    const controls = new CameraControls(camera.get(), document.body);
    controls.maxPolarAngle = Infinity;
    controls.minPolarAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minAzimuthAngle = -Infinity;
    controls.maxDistance = 8;
    controls.minDistance = 2.5

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
    const wraiths = createWraiths(quality);
    const starfield = createStarField();
    const battleLights = createBattleLights();
    let wraithNoise: WraithNoise;


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

        camera.update(delta, controls, mouse);

        wraiths.update(delta, camera.get(), azimuth, rear, camera.cameraState === CameraState.RotateAroundWraiths);
        battleCruiser.update(delta, camera.rotateSpeed, camera.get());
        starfield.update(azimuth, camera.get(), delta);
        battleLights.update(camera.get(), delta, azimuth);

        const camDistance = (1 - (controls.distance - controls.minDistance) / (controls.maxDistance - controls.minDistance));

        wraithNoise.value = camera.cameraState === CameraState.RotateAroundWraiths ? (0.2 + rear * 0.6) * (1 + Math.pow(camDistance, 3) * 0.2) : 0;

        let g = 0;
        if (camera.cameraState !== CameraState.UnderWraiths) {
            g = wraiths.isBoosting() ? Math.max(0.25, rear) : MathUtils.smoothstep(Math.pow(rear, 2) * (1 + Math.pow(camDistance, 3)), 0.25, 1);
        }
        glitchEffect.minStrength = glitchMax.x * g;
        glitchEffect.maxStrength = glitchMax.y * g;
        bloomEffect.intensity = 0.5 + rear * 1;
        starfield.object.position.copy(camera.get().position);

        if (camera.cameraState === CameraState.RotateAroundWraiths) {
            controls.setTarget(wraiths.position.x, wraiths.position.y, wraiths.position.z, true);
        }

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


    const preloadIntro = async () => {
        const fireTexture = quality > 1 ? await new EXRLoader().loadAsync("./FireBall03_8x8.exr") : await new TextureLoader().loadAsync("./FireBall03_8x8.png")

        const envmap = quality > 1 ? await loadEnvironmentMap("./envmap.hdr") : null;

        const models = [
            battleCruiser.load(envmap, fireTexture),
            asteroids.load(envmap),
            wraiths.load(envmap, fireTexture)
        ]
        await Promise.all(models);

        battleLights.load(fireTexture);
        starfield.load();
    };

    let mouse = new Vector3();
    const _mousemove = (ev: MouseEvent) => {
        mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (ev.clientY / window.innerHeight) * 2 - 1;
    };

    const _mousewheel = (evt: WheelEvent) => {
        controls.dolly(-Math.sign(evt.deltaY) * 0.1, true);
    }

    const _touchmove = (evt: TouchEvent) => {
        if (evt.touches[0]) {
            const x = (evt.touches[0].clientX / window.innerWidth) * 2 - 1;
            controls.dolly(-Math.sign(x) * 0.1, true);
        }
    }


    const bloomEffect = new BloomEffect({
        intensity: 1.25,
        blendFunction: BlendFunction.SCREEN,
    })

    async function init() {
        const janitor = new Janitor();

        wraithNoise = janitor.add(createWraithNoise());
        wraithNoise.start();

        janitor.addEventListener(window, "resize", _sceneResizeHandler, {
            passive: true,
        });
        janitor.addEventListener(window, "mousemove", _mousemove, { passive: true });
        janitor.addEventListener(window, "wheel", _mousewheel, { passive: true });
        janitor.addEventListener(window, "touchmove", _touchmove, { passive: true });
        _sceneResizeHandler();

        const scene = new Scene();
        scene.background = await loadSkybox();
        const slight = new DirectionalLight(0xffffff, 5);

        wraiths.init();
        scene.add(wraiths.object);
        janitor.add(wraiths);

        quality > 1 && scene.add(distantStars());
        scene.add(battleCruiser.object);
        scene.add(asteroids.object);
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
            height: quality > 1 ? 480 : 240,
            kernelSize: quality > 1 ? KernelSize.SMALL : KernelSize.VERY_SMALL,
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

        const effects = [];
        effects.push(bloomEffect);
        quality > 1 && effects.push(new SMAAEffect());
        effects.push(godRaysEffect);
        quality > 1 && effects.push(vignet);
        effects.push(tone);

        [
            renderPass,
            new EffectPass(
                camera.get(),
                ...effects
            ),
            glitchPass,
        ].forEach(pass => composer.addPass(pass));

        composer.render(0);

        renderer.setAnimationLoop(INTRO_LOOP);
        janitor.add(() => {
            renderer.setAnimationLoop(null);
            composer.dispose();
        });

        return () => janitor.mopUp();
    }
    return {
        preloadIntro,
        init,
    }
}