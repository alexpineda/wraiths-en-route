import { createSpline } from "../utils/linear-spline";
import { createParticles, defaultUpdate, ParticleSystem } from "../utils/particles";
import { upgradeStandardMaterial } from "../utils/material-utils";
import { Camera, Color, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Texture, Vector3 } from "three";
import loadGlb from "../utils/load-glb";

const BC_START_POS = new Vector3(-900, -250, -500);
const BC_END_POS = new Vector3(-320, -560, -500);
const BC_START_ROT = new Vector3(-Math.PI / 8, Math.PI, Math.PI / 5);
const BC_END_ROT = new Vector3(-Math.PI / 16, Math.PI, Math.PI / 8);

export const createBattleCruiser = () => {

    let battleCruiser: Object3D;
    let burners: ParticleSystem;

    return {
        size: 4,
        life: 100,
        velocity: 0,
        alpha: 0.01,
        color: new Color(1, 1, 1),
        coordMultipler: new Vector3(.1, .1, .1),
        async load(envmap: Texture, particle: Texture) {
            const { model } = await loadGlb(
                "./battlecruiser.glb",
                envmap
            );
            battleCruiser = model;
            model.traverse((o: Object3D) => {
                if (o instanceof Mesh) {
                    o.material = upgradeStandardMaterial(o.material as MeshStandardMaterial);
                    (o.material as MeshPhysicalMaterial).emissiveIntensity = 0;
                    (o.material as MeshPhysicalMaterial).transmission = 0.9;
                    (o.material as MeshPhysicalMaterial).opacity = 0;
                    (o.material as MeshPhysicalMaterial).thickness = 0.5;
                }
            });

            model.scale.setScalar(50);

            model.rotation.x = BC_START_ROT.x;
            model.rotation.y = BC_START_ROT.y;
            model.rotation.z = BC_START_ROT.z;
            model.position.copy(BC_START_POS);

            const alphaSpline = createSpline(
                MathUtils.lerp,
                [0, .15, .33, .45, .66, .8, 1],
                [0, 1, 0, 1, 0, 1, 0],
            );

            burners = createParticles({
                count: 4,
                sortParticles: false,
                sizeAttenuation: true,
                update: defaultUpdate({
                    alpha: t => alphaSpline(t) * this.alpha,
                    size: 10,
                    velocity: new Vector3(0, 0, this.velocity)
                }),
                spriteMap: {
                    tex: particle,
                    width: 8,
                    height: 8,
                    frameCount: 64,
                    loop: 1
                },
                emit: () => {
                    const x = MathUtils.randFloatSpread(1) * this.coordMultipler.x;
                    const y = MathUtils.randFloatSpread(1) * this.coordMultipler.y;
                    const z = MathUtils.randFloatSpread(1) * this.coordMultipler.z;

                    const position = new Vector3(x, y, z);

                    return {
                        position,
                        scale: this.size,
                        color: this.color,
                        maxLife: this.life,
                    };
                }
            });
            burners.object.position.set(0, 2.4, 1.7);
            burners.object.scale.set(1, 0.5, 0.5)

            const burner1 = burners.object.clone();
            const burner2 = burners.object.clone();
            const burner3 = burners.object.clone();
            const burner4 = burners.object.clone();

            burner1.scale.setX(0.5);
            burner1.position.set(-0.4, 2.25, 1.5);

            burner2.scale.setX(0.5);
            burner2.position.set(0.4, 2.25, 1.5);

            burner4.position.setY(0.5);

            model.add(burner1, burner2, burner3);

            return model;
        },
        elapsed: 0,
        update(delta: number, cameraRotateSpeed: number, camera: Camera) {
            this.elapsed += delta / (cameraRotateSpeed * 8);
            const bcv = Math.sin(this.elapsed);
            battleCruiser.rotation.z = MathUtils.lerp(BC_START_ROT.z, BC_END_ROT.z, bcv);
            battleCruiser.rotation.x = MathUtils.lerp(BC_START_ROT.x, BC_END_ROT.x, bcv);
            battleCruiser.position.lerpVectors(BC_START_POS, BC_END_POS, bcv);
            burners.update(camera, delta);
        },
        get object() {
            return battleCruiser;
        },
    }

}