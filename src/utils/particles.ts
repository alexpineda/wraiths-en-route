import { AdditiveBlending, DoubleSide, DynamicDrawUsage } from 'three/src/constants';
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import { Box3, BufferGeometry, Color, InstancedMesh, Matrix4, Object3D, PlaneBufferGeometry, Quaternion } from 'three';
import { InstancedUniformsMesh } from 'three-instanced-uniforms-mesh';


const fragmentShader = `
#ifdef USE_SPRITEMAP

uniform sampler2D diffuseTexture;
uniform vec2 uFrameDimensions;
varying vec2 vFrame;
varying vec2 vUv;

#endif

// troika
uniform vec3 uColor;
uniform float uAlpha;

void main() {

    gl_FragColor = vec4(uColor, uAlpha);

    #ifdef USE_SPRITEMAP

    vec2 coords = vUv / uFrameDimensions + vFrame;
    gl_FragColor *= texture2D(diffuseTexture, coords);

    #endif
}

`;

const vertexShader = `
#ifdef USE_SPRITEMAP

uniform vec2 uFrameDimensions;
varying vec2 vFrame;
varying vec2 vUv;

// troika
uniform float uFrame;

#endif

uniform float uSize;
uniform mat4 uMatrix;

void main() {
    mat4 mv = viewMatrix * modelMatrix * uMatrix;

    #ifdef ALWAYS_FACE_CAMERA
        float xx = mv[0][0];
        float yy = mv[0][1];
        float zz = mv[0][2];

        float d = sqrt( xx*xx + yy*yy + zz*zz );

        mv[0][0] = d;
        mv[0][1] = 0.;
        mv[0][2] = 0.;
        mv[1][0] = 0.;
        mv[1][1] = d;
        mv[1][2] = 0.;
        mv[2][0] = 0.;
        mv[2][1] = 0.;
        mv[2][2] = d;
    #endif

    gl_Position = projectionMatrix * mv * vec4(position, 1.);
    

    #ifdef USE_SPRITEMAP

    vFrame = vec2(mod(uFrame, uFrameDimensions.x) / uFrameDimensions.x, floor(uFrame / uFrameDimensions.y) / uFrameDimensions.y);
    vUv = uv;

    #endif

}
`;

export interface ParticleDefinition {
    position: THREE.Vector3;
    scale: number;
    color: THREE.Color;
    maxLife: number;
};

export interface Particle extends ParticleDefinition {
    currentSize: number;
    life: number;
    alpha: number;
    frame: number;
    oldPosition: THREE.Vector3;
    index: number;
};

export interface ParticleSystemDefinition {
    id: string;
    count: number;
    sortParticles: boolean;
    sizeAttenuation: boolean;
    geometry?: BufferGeometry;
    alwaysFaceCamera?: boolean,
    update: (t: number, delta: number, particle: Particle, opts: ParticleSystemDefinition) => void;
    spriteMap?: {
        tex: THREE.Texture;
        frameCount: number;
        width: number;
        height: number;
        loop: number;
    },
    emit: (opts: ParticleSystemDefinition) => ParticleDefinition;
    [key: string]: any;
}

export interface ParticleSystemState extends ParticleSystemDefinition {
    boundingBox: Box3;
}

type FnOrValue<T> = ((t: number, delta: number, particle: Particle) => T) | T;

const apply = (fnOrValue: FnOrValue<number>, t: number, delta: number, particle: Particle) => {
    if (typeof fnOrValue === 'function') {
        return fnOrValue(t, delta, particle);
    } else {
        return fnOrValue;
    }
}

const _velocityAdd = new Vector3;

export const defaultUpdate = ({ alpha, size, velocity }: { alpha: FnOrValue<number>, size: FnOrValue<number>, velocity: Vector3 }) =>
    (t: number, delta: number, p: Particle, opts: ParticleSystemDefinition) => {
        p.alpha = apply(alpha, t, delta, p);
        p.currentSize = p.scale * apply(size, t, delta, p);
        p.position.add(_velocityAdd.copy(velocity).multiplyScalar(delta / 1000));
        if (opts.spriteMap) {
            p.frame = Math.floor(opts.spriteMap.loop * t * opts.spriteMap.frameCount) % opts.spriteMap.frameCount;
        }
    }

export function createParticles<T extends ParticleSystemDefinition>(_opts: T) {
    const opts = _opts;

    const prefabGeometry = opts.geometry ?? new PlaneBufferGeometry(1, 1, 1, 1);

    const material = new ShaderMaterial({
        blending: AdditiveBlending,
        transparent: true,
        vertexColors: false,
        depthTest: true,
        depthWrite: false,
        fragmentShader,
        vertexShader,
        side: DoubleSide,
        uniforms: {
            diffuseTexture: { value: opts.spriteMap?.tex },
            uFrameDimensions: { value: new Vector2(opts.spriteMap?.width ?? 1, opts.spriteMap?.height ?? 1) },
            uTime: { value: 0 },
            // instanced attributes (via troika-instanced-uniforms-mesh)
            uSize: { value: 1 },
            uColor: { value: new Color(0xffffff) },
            uAlpha: { value: 1 },
            uFrame: { value: 0 },
            uMatrix: { value: new Matrix4 },
        }
    });

    if (opts.spriteMap) {
        material.defines.USE_SPRITEMAP = 1;
    }

    if (opts.alwaysFaceCamera) {
        material.defines.ALWAYS_FACE_CAMERA = 1;
    }


    const mesh = new InstancedUniformsMesh(
        prefabGeometry,
        material,
        opts.count
    );
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage); // will be updated every frame

    // initialize troika, allowing us to copy the entire particle system in clone()
    mesh.setUniformAt('uMatrix', 0, new Matrix4);
    mesh.setUniformAt('uSize', 0, 1);
    mesh.setUniformAt('uColor', 0, new Color);
    mesh.setUniformAt('uAlpha', 0, 1);
    mesh.setUniformAt('uFrame', 0, 0);

    const onEmit = (particle: ParticleDefinition, index: number) => {
        const out = particle as Particle;
        out.life = particle.maxLife;
        out.frame = 0;
        out.oldPosition = (new Vector3()).copy(out.position);
        out.index = index;
        opts.update(0, 0, out, opts);
        return out;
    }

    let particles = new Array<Particle>();
    for (let i = 0; i < opts.count; i++) {
        particles[i] = onEmit(opts.emit(opts), i)
    }

    let gdfsghk = 0;

    const dummy = new Object3D;

    const updateGeometry = () => {
        let particle: Particle;
        for (let i = 0; i < opts.count; i++) {
            particle = particles[i];

            dummy.position.copy(particle.position);
            dummy.scale.setScalar(particle.currentSize);
            dummy.updateMatrix();

            mesh.setUniformAt('uMatrix', i, dummy.matrix);
            mesh.setUniformAt('uSize', i, particle.currentSize);
            mesh.setUniformAt('uColor', i, particle.color);
            mesh.setUniformAt('uAlpha', i, particle.alpha);
            if (opts.spriteMap) {
                mesh.setUniformAt('uFrame', i, particle.frame!);
            }
        }
        // mesh.instanceMatrix.needsUpdate = true;

    };

    const updateParticles = (camera: THREE.Camera, delta: number) => {
        gdfsghk += delta;
        let numParticlesToAdd = Math.floor(gdfsghk * opts.count);
        gdfsghk -= numParticlesToAdd / opts.count;

        for (let p of particles) {
            p.life -= delta;
            if (p.life >= 0) {
                const t = 1.0 - p.life / p.maxLife;
                p.oldPosition.copy(p.position);
                opts.update(t, delta, p, opts);
            } else if (numParticlesToAdd) {
                onEmit(Object.assign(p, opts.emit(opts)), p.index);
                numParticlesToAdd--;
            }
        }

        if (opts.sortParticles) {
            particles.sort((a, b) => {
                const d1 = camera.position.distanceTo(a.position);
                const d2 = camera.position.distanceTo(b.position);
                return d2 - d1;
            });
        }

    }

    return {
        get opts() {
            return opts;
        },
        get object(): InstancedMesh {
            return mesh;
        },
        update(camera: THREE.PerspectiveCamera, delta: number) {
            const d = delta / 1000;
            material.uniforms.uTime.value += delta;
            updateParticles(camera, d);
            updateGeometry();
        },
        clone() {
            const cloned = new InstancedMesh(mesh.geometry, mesh.material, opts.count);
            cloned.position.copy(mesh.position);
            cloned.rotation.copy(mesh.rotation);
            cloned.scale.copy(mesh.scale);
            const attrs = Object.keys(mesh.geometry.attributes);
            const update = () => {
                for (const attr of attrs) {
                    cloned.geometry.attributes[attr].needsUpdate = true;
                }
            }
            return { object: cloned, update };
        }
    };
};

export type ParticleSystem = ReturnType<typeof createParticles>;