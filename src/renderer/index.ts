import { EffectComposer } from "postprocessing";
import { HalfFloatType, PCFSoftShadowMap, sRGBEncoding, WebGLRenderer } from "three";

export const renderer = new WebGLRenderer({
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    antialias: false,
    stencil: false,
    depth: true,
});
renderer.outputEncoding = sRGBEncoding;
renderer.debug.checkShaderErrors = false;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;
renderer.autoClear = false;

export const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 0
});