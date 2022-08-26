import { Color, Group, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PointLight, Texture, Vector3 } from "three";
import { createSpline } from "@utils/linear-spline";
import { upgradeStandardMaterial } from "@utils/material-utils";
import { ParticleSystem, Particle, createParticles, defaultUpdate, ParticleSystemDefinition } from "@utils/particles";
import loadGlb from "@utils/load-glb";
import { playWraithComms } from "./wraith-noise";
import { quadrants } from "@utils/quadrants";
import Janitor from "@utils/janitor";

export type Wraith = Object3D & {
    init: () => void;
    update: (delta: number) => void;
    dispose: () => void;
    swerveMin: number;
    swerveMax: number;
    swerveRateDamp: number;
    swerveDamp: number;
    boostMode: boolean;
    [key: string]: any;
};

const wraithRed = 0xff0000;
const wraithBlue = 0x0033ff;

const createWraith = (og: Object3D, originalPosition: Vector3, particles: ParticleSystem, i: number, quality: number) => {
    let swerveRate = 1000;
    let nextSwerveRate = 1000;
    let _nextSwerveAngle = Math.PI / 3.5;

    let [wx, wy, wz] = [
        MathUtils.randInt(1000, 4000),
        MathUtils.randInt(1000, 4000),
        MathUtils.randInt(1000, 4000),
    ];

    const wraith = og.clone(true) as Wraith;
    const boostPosition = (new Vector3).copy(originalPosition).add(new Vector3(0, 0, 10));
    let targetZ = originalPosition.z;

    const burnerLight = new PointLight(0xff5500, 20, 1.5, 10);
    burnerLight.position.set(0, 0.1, -0.3);
    wraith.add(burnerLight);
    const baseBurnerIntensity = 20;

    const rightBlinker = new PointLight(i ? wraithRed : wraithBlue, 2, 1, 7);
    rightBlinker.position.set(-0.2, -0.2, -0.05);
    quality > 1 && wraith.add(rightBlinker);

    const leftBlinker = new PointLight(i ? wraithRed : wraithBlue, 2, 1, 7);
    leftBlinker.position.set(0.2, -0.2, -0.05);
    quality > 1 && wraith.add(leftBlinker);

    let _a = 0;
    let _b = 0;
    let _interval0: number;
    let _interval1: number;

    particles.object.position.set(0, 0, -0.2);
    const { object: burners, update: updateBurners } = particles.clone();
    wraith.add(burners);

    const elapsed = [0, 0, 0, 0];
    let boostDamp = 0.001;

    return Object.assign(wraith, {
        boostMode: false,
        init() {
            this.position.copy(originalPosition);

            _a = 0;
            _interval0 = setInterval(() => {
                rightBlinker.intensity = _a % 3 === 0 ? 1 : 0;
                _a++;
            }, 1000 + Math.random() * 1000);

            _b = 0;
            _interval1 = setInterval(() => {
                leftBlinker.intensity = _b % 4 === 0 ? 1 : 0;
                _b++;
            }, 1000 + Math.random() * 1000);
        },
        swerveMax: 15000,
        swerveMin: 2000,
        swerveRateDamp: 0.001,
        swerveDamp: 0.001,
        update(delta: number) {
            if (this.boostMode === true) {
                _nextSwerveAngle = Math.PI * 2;
                burners.scale.setScalar(1.4);
                this.swerveDamp = 0.0001;
                boostDamp = 0.0001;
                burnerLight.distance = 2.5;
                burnerLight.intensity = baseBurnerIntensity * 1.5;
            } else {
                _nextSwerveAngle = Math.PI / 3.5;
                burners.scale.setScalar(1);
                this.swerveDamp = 0.001;
                boostDamp = 0.00001;
                burnerLight.distance = 1.5;
                burnerLight.intensity = baseBurnerIntensity;
            }

            swerveRate = MathUtils.damp(swerveRate, nextSwerveRate, this.swerveRateDamp, delta);
            if (Math.abs(swerveRate - nextSwerveRate) < 1) {
                nextSwerveRate = MathUtils.randInt(this.swerveMin, this.swerveMax);
            }

            elapsed[0] += delta / swerveRate
            elapsed[1] += delta / wx
            elapsed[2] += delta / wy
            elapsed[3] += delta / wz

            this.rotation.z = MathUtils.damp(
                this.rotation.z,
                Math.sin(elapsed[0]) * _nextSwerveAngle,
                this.swerveDamp,
                delta
            );
            targetZ = MathUtils.damp(targetZ, this.boostMode ? boostPosition.z : originalPosition.z, boostDamp, delta);

            this.position.x = originalPosition.x + Math.sin(elapsed[0]) * 0.3;
            this.position.y = originalPosition.y + Math.sin(elapsed[1]) * 0.3;
            this.position.z = targetZ + Math.sin(elapsed[2]) * 0.3;
            updateBurners()
        },
        dispose() {
            clearInterval(_interval0);
            clearInterval(_interval1);
        },
    } as Wraith);
};


export const createWraiths = (quality: number) => {

    const wraiths: Wraith[] = [];
    const wraithGroup = new Group;
    let burners: ParticleSystem;

    const quadrant = quadrants(4, Math.PI / 4);
    const janitor = new Janitor;

    return {
        po: {
            get count() {
                return burners.opts.count
            }, set count(v) {
                burners.opts.count = v;
            },
            life: 1,
            scale: 0.5,
            color: new Color(1, 0.5, 0.1),
            velocity: new Vector3(0, 0, -700),
        },
        position: new Vector3,
        isBoosting() {
            return wraiths.some(w => w.boostMode);
        },
        async load(envmap: Texture | null, particle: Texture) {

            const filename = window.location.search ? "./wraith.glb" : "./wraith-compressed.glb";
            const { model } = await loadGlb(filename, envmap);

            model.traverse((o: Object3D) => {
                if (o instanceof Mesh) {
                    o.material = upgradeStandardMaterial(o.material as MeshStandardMaterial);
                    (o.material as MeshPhysicalMaterial).emissiveIntensity = 0;
                    (o.material as MeshPhysicalMaterial).transmission = 0.9;
                    (o.material as MeshPhysicalMaterial).opacity = 0;
                    (o.material as MeshPhysicalMaterial).thickness = 0.5;
                }
            });

            const particleUpdate = defaultUpdate(
                {
                    size: createSpline(
                        MathUtils.lerp,
                        [0, .12, .24, 0.36, 0.48, 1],
                        [2, 2, .5, .35, 0.3, 0.2],
                        0.05
                    ),
                    alpha: createSpline(
                        MathUtils.lerp,
                        [0, .12, .24, 0.36, 0.48, 0.86, 1],
                        [0.3, 0.3, 0.5, 1, 0.5, 0.2, 0.05],
                    ),
                    velocity: new Vector3(0, 0, -800)
                }
            )

            burners = createParticles({
                id: "wraith-burners",
                count: 2000 + quality * 3000,
                sizeAttenuation: true,
                lookAt: true,
                sortParticles: false,
                update: (t: number, delta: number, p: Particle, opts: ParticleSystemDefinition) => {
                    particleUpdate(t, delta, p, opts);
                },
                spriteMap: {
                    tex: particle,
                    width: 8,
                    height: 8,
                    frameCount: 64,
                    loop: 1
                },
                emit: () => {
                    const x = MathUtils.randFloatSpread(0.02);
                    const y = MathUtils.randFloatSpread(0.02);
                    const z = MathUtils.randFloatSpread(0.02);

                    const position = new Vector3(x, y, z);

                    return {
                        position,
                        scale: this.po.scale,
                        color: this.po.color,
                        maxLife: this.po.life,
                    };
                }
            });

            const w1 = createWraith(model, new Vector3(0, 0, 0), burners, 0, quality);
            const w2 = createWraith(model, new Vector3(4, 0.2, 0), burners, 1, quality);
            const w3 = createWraith(model, new Vector3(-2, -0.1, -1.2), burners, 2, quality);

            wraiths.push(w1, w2, w3);
            wraithGroup.add(w1, w2, w3);

        },
        init() {
            for (const wraith of wraiths) {
                wraith.init();
                janitor.add(wraith);
            }
            janitor.addEventListener(window, "click", _ => {
                const i = MathUtils.randInt(0, 2);
                if (wraiths[i].boostMode === true) return;

                wraiths[i].boostMode = true;
                setTimeout(() => {
                    wraiths[i].boostMode = false;
                }, 10000);
            })
        },
        update(delta: number, camera: PerspectiveCamera, azimuth: number, rear: number, playComms: boolean) {
            this.position.set(0, 0, 0);
            for (const wraith of wraiths) {
                wraith.update(delta);
                this.position.add(wraith.position);
            }
            this.position.divideScalar(3);
            burners.update(camera, delta);

            if (playComms && quadrant.entered(0, azimuth)) {
                playWraithComms(rear);
            }

        },
        dispose() {
            janitor.mopUp();
        },
        get wraiths() {
            return wraiths;
        },
        get object() {
            return wraithGroup;
        },
        get particles() {
            return burners;
        }
    }
}