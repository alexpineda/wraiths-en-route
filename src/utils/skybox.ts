import { CubeTexture } from "three/src/textures/CubeTexture";
import { CubeTextureLoader } from "three/src/loaders/CubeTextureLoader";

export const loadSkybox = async () => {
    const loader = new CubeTextureLoader();
    loader.setPath("./skybox/sparse/");

    return await new Promise(res => loader.load([
        "right.png",
        "left.png",
        "top.png",
        "bot.png",
        "front.png",
        "back.png",
    ], res)) as CubeTexture;
}
