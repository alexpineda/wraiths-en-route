import { createParticles, defaultUpdate, Particle, ParticleSystem, ParticleSystemDefinition } from "@utils/particles";
import { upgradeStandardMaterial } from "@utils/material-utils";
import { Color, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, SphereBufferGeometry, Texture, Vector3 } from "three";
import loadGlb from "@utils/load-glb";

const BC_START_POS = new Vector3(-900, -250, -500);
const BC_END_POS = new Vector3(-320, -560, -500);
const BC_START_ROT = new Vector3(-Math.PI / 8, Math.PI, Math.PI / 5);
const BC_END_ROT = new Vector3(-Math.PI / 16, Math.PI, Math.PI / 8);

export const createBattleCruiser = () => {

    let battleCruiser: Object3D;
    let burners: ParticleSystem;
    let updateBurners = () => { };

    return {
        size: 0.1,
        life: 1,
        velocity: 0,
        alpha: 0.05,
        color: new Color(1, 1, 1),
        coordMultipler: new Vector3(.1, .1, .1),
        async load(envmap: Texture, particle: Texture) {
            const { model } = await loadGlb(
                "./bc2.glb",
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


            const pUpdate = defaultUpdate({
                alpha: t => (1 - t) * this.alpha * 0.1,
                size: 10,
                velocity: new Vector3(0, 0, this.velocity)
            });

            burners = createParticles({
                id: "battlecruiser-burners",
                count: 4,
                sortParticles: false,
                sizeAttenuation: true,
                geometry: new SphereBufferGeometry(0.5, 10, 10),
                update: (t: number, delta: number, p: Particle, opts: ParticleSystemDefinition) => {
                    pUpdate(t, delta, p, opts)
                },
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
            burners.object.position.set(0, 2.5, 1.3);
            burners.object.scale.set(1, 0.5, 0.5)
            burners.object.rotation.y = -Math.PI / 2;
            const burner1 = burners.clone();
            const burner2 = burners.clone();
            const burner3 = burners.clone();
            const burner4 = burners.clone();

            burner1.object.position.set(-0.4, 2.25, 1.2);

            burner2.object.position.set(0.4, 2.25, 1.2);

            burner4.object.position.setY(2);

            model.add(burner1.object, burner2.object, burner3.object, burner4.object);

            updateBurners = () => {
                burner1.update();
                burner2.update();
                burner3.update();
                burner4.update();
            }

            return model;
        },
        elapsed: 0,
        throbbingBurners: 0,
        update(delta: number, cameraRotateSpeed: number, camera: PerspectiveCamera) {
            this.elapsed += delta / (cameraRotateSpeed * 8);
            this.throbbingBurners += delta / 50;

            const bcv = Math.sin(this.elapsed);
            battleCruiser.rotation.z = MathUtils.lerp(BC_START_ROT.z, BC_END_ROT.z, bcv);
            battleCruiser.rotation.x = MathUtils.lerp(BC_START_ROT.x, BC_END_ROT.x, bcv);
            battleCruiser.position.lerpVectors(BC_START_POS, BC_END_POS, bcv);
            burners.update(camera, delta);

            this.alpha = 0.7 + Math.abs(Math.sin(this.throbbingBurners)) * 0.3;
            updateBurners()
        },
        get object() {
            return battleCruiser;
        },
        get particles() {
            return burners;
        }
    }

}