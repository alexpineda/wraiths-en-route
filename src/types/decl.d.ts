import type { BufferGeometry, InstancedMesh } from 'three';

declare module 'three-instanced-uniforms-mesh' {
    export class InstancedUniformsMesh<T extends Material> extends InstancedMesh<BufferGeometry, T> {
        constructor(geometry: BufferGeometry, material: T, count: number);
    }

    export function createInstancedUniformsDerivedMaterial<T extends Material>(material: T): T;
}