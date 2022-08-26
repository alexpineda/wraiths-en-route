import { useStore } from "../store";
import {
  AnimationClip,
  Color,
  Group,
  Mesh,
  Object3D,
  sRGBEncoding,
  Texture,
  WebGLRenderer
} from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { MeshoptDecoder } from "./mesh-opt-decoder";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";
import { renderer } from "@renderer";

let assetIndex = 0;

var ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('./basis/');
ktx2Loader.detectSupport(renderer);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2Loader);

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
  return new Promise((resolve, reject) => {
    const index = assetIndex;


    loader.load(
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
