import create from "zustand";

type Store = {
    loading: number;
}

export const useStore = create<Store>((set, get) => ({
    loading: 0
}));