import create from "zustand";

export enum SceneStatus {
    Loading,
    Loaded,
    Playing
}

type Store = {
    status: SceneStatus;
    assetLoading: number[];
    setAssetLoading(index: number, value: number): void;
    totalAssetLoading: number;
    setStatus(status: SceneStatus): void;
}

// Log every time state is changed
const log = (config: any) => (set: any, get: any, api: any) =>
    config(
        (...args: any[]) => {
            set(...args)
            console.log('  new state', get())
        },
        get,
        api
    )


export const useStore = create<Store>(log((set, get) => ({
    status: SceneStatus.Loading,
    assetLoading: [],
    totalAssetLoading: 0,
    setAssetLoading: (index: number, value: number) => {
        const assetLoading = get().assetLoading;
        assetLoading[index] = value;
        set({ assetLoading: [...assetLoading], totalAssetLoading: assetLoading.reduce((a, b) => a + b, 0) / 3 });
    },
    setStatus: (status: SceneStatus) => {
        set({ status });
    }
})));