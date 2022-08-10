import { Euler, InstancedMesh, MathUtils, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Quaternion, Texture, Vector3 } from "three";
import loadGlb from "../utils/load-glb";
import { upgradeStandardMaterial } from "../utils/material-utils";
import range from "../utils/range";

export const createAsteroids = () => {

    let asteroids: InstancedMesh;

    return {
        async load(envmap: Texture) {

            const { model: asteroid } = await loadGlb("./asteroid.glb", envmap);

            asteroid.traverse((o: Object3D) => {
                if (o instanceof Mesh) {
                    o.material = upgradeStandardMaterial(o.material as MeshStandardMaterial);
                    (o.material as MeshPhysicalMaterial).emissiveIntensity = 0;
                    (o.material as MeshPhysicalMaterial).transmission = 0.9;
                    (o.material as MeshPhysicalMaterial).opacity = 0;
                    (o.material as MeshPhysicalMaterial).thickness = 0.5;
                }
            });

            asteroids = new InstancedMesh(
                (asteroid.children[0] as Mesh).geometry,
                (asteroid.children[0] as Mesh).material,
                20
            );

            range(0, 5).forEach((i: number) => {
                const pos = new Vector3(
                    MathUtils.randInt(60, 80),
                    MathUtils.randInt(0, 30),
                    MathUtils.randInt(-50, -100)
                );
                const m = new Matrix4();
                const q = new Quaternion();

                q.setFromEuler(
                    new Euler(
                        MathUtils.randInt(0, 360),
                        MathUtils.randInt(0, 360),
                        MathUtils.randInt(0, 360)
                    )
                );
                const s = Math.random() + 0.5;

                m.compose(pos, q, new Vector3(1, 1, 1).setScalar(Math.min(5, s * s * s)));
                asteroids.setMatrixAt(i, m);
            });
        },
        get object() {
            return asteroids;
        }
    }
}