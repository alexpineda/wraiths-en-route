import { MathUtils } from 'three';
const mod = (x: number) => MathUtils.euclideanModulo(x, Math.PI * 2);

type Slice = {
    i: number,
    rad: [number, number],
}

export const quadrants = (n: number, phase = 0) => {
    let slices: Slice[] = [];
    const m = (2 * Math.PI) / n;
    for (let i = 0; i < n; i++) {
        slices.push({
            i,
            rad: [m * i, m * (i + 1)],
        });
    }

    let _entered: Slice | null = null;

    return {
        phase,
        slices,
        getSlice(i: number, useRad = false) {
            let a = i;
            if (useRad) {
                a = Math.floor(mod(i - this.phase) / m);
            }
            return slices[a];
        },
        entered(t: number, i: number, useRadT = false, useRadI = true) {
            const a = this.getSlice(t, useRadT);
            const b = this.getSlice(i, useRadI);
            if (a === b) {
                if (a === _entered) {
                    return false;
                }
                _entered = a;
                return true;
            } else {
                _entered = null;
                return false;
            }
        },
    };
};