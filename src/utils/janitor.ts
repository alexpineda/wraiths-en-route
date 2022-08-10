import { Object3D } from "three/src/core/Object3D";
import { disposeObject3D } from "./dispose";

interface Disposable {
    dispose: () => void;
}

type EmptyFn = () => void;

type SupportedJanitorTypes = Object3D | Disposable | EmptyFn;
export default class Janitor {
    private _objects = new Set<Object3D>();
    private _disposable = new Set<Disposable>();
    private _callbacks = new Set<EmptyFn>();

    constructor(dispose?: SupportedJanitorTypes) {
        if (dispose) {
            this.add(dispose);
        }
    }

    addEventListener(element: { addEventListener: Function, removeEventListener: Function }, event: string, callback: Function, options?: AddEventListenerOptions) {
        element.addEventListener(event, callback, options);
        this.add(() => element.removeEventListener(event, callback));
        return this;
    }

    setInterval(callback: EmptyFn, interval: number): number {
        const _i = setInterval(callback, interval);
        this.add(() => clearInterval(_i));
        return _i;
    }

    add<T extends SupportedJanitorTypes>(obj: T): T {
        if (obj instanceof Object3D) {
            this.object3d(obj);
        } else if ("dispose" in obj) {
            this.disposable(obj);
        } else if (typeof obj === "function") {
            this.callback(obj);
        } else {
            throw new Error("Unsupported type");
        }
        return obj;
    }

    callback(callback: EmptyFn) {
        this._callbacks.add(callback);
    }

    disposable(obj: Disposable) {
        this._disposable.add(obj);
    }

    object3d(obj: THREE.Object3D) {
        this._objects.add(obj);
    }

    mopUp() {

        if (this._objects.size) {
            for (const obj of this._objects) {
                disposeObject3D(obj);
                obj.removeFromParent();
            }
            this._objects.clear();
        }

        if (this._callbacks.size) {
            for (const cb of this._callbacks) {
                cb();
            }
            this._callbacks.clear();
        }

        if (this._disposable.size) {
            for (const disposable of this._disposable) {
                disposable.dispose();
            }

            this._disposable.clear();
        }

    }

}
