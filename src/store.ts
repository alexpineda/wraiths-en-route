import create from "zustand";

type Store = {
    loading: number;
    assetLoading: number[];
    setAssetLoading(index: number, value: number): void;
    totalAssetLoading: number;
}

export const useStore = create<Store>((set, get) => ({
    loading: 0,
    assetLoading: [],
    totalAssetLoading: 0,
    setAssetLoading: (index: number, value: number) => {
        const assetLoading = get().assetLoading;
        assetLoading[index] = value;
        set({ assetLoading: [...assetLoading], totalAssetLoading: assetLoading.reduce((a, b) => a + b, 0) / 3 });
    },
}));