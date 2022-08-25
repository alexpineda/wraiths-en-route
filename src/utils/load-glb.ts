import { useStore } from "../store";
import {
  AnimationClip,
  Color,
  Group,
  Mesh,
  Object3D,
  sRGBEncoding,
  Texture
} from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

let assetIndex = 0;

export type GlbResponse = {
  model: Group;
  animations: AnimationClip[];
};
export function loadGlb(
  file: string,
  envMap: Texture | null,
  name = "",
  meshCb: (mesh: Mesh) => void = () => { }
): Promise<GlbResponse> {
  assetIndex++;
  console.log(assetIndex)
  return new Promise((resolve, reject) => {
    const index = assetIndex;
    new GLTFLoader().load(
      file,
      (glb: any) => {
        const { scene: model, animations } = glb;
        model.traverse((o: Object3D) => {
          if (o instanceof Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material.encoding = sRGBEncoding;
            o.material.envMap = envMap;
            o.material.emissive = new Color(0xffffff);
            model.userData.mesh = o;
            if (meshCb) {
              meshCb(o);
            }
          }
        });

        Object.assign(model, { name });

        resolve({ model, animations });
      },
      (xhr) => {
        useStore.getState().setAssetLoading(index - 1, xhr.loaded / xhr.total);
      },
      (error: any) => {
        console.error(error);
        reject(error);
      }
    );
  });
}
export default loadGlb;
