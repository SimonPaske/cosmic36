import { loadStore } from "./store.js";
import { getCycle, computeCycleMeta } from "./cycle.js";

export function initCore(state) {
    const store = loadStore();
    const meta = computeCycleMeta(state.dobStr, state.mode);

    if (!meta) {
        console.warn("No DOB set, skipping core init");
        return { store, cycle: null };
    }

    Object.assign(state, meta);
    const cycle = getCycle(store, state.dobStr, state.mode, state.cycleIndex);

    return { store, cycle };
}