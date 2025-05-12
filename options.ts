import * as THREE from 'three';

export const COORD_SCALE = 1 / 10_000_000; // 10000 km = 1 unit

export const globals: {
    camera: THREE.PerspectiveCamera | undefined;
    scene: THREE.Scene | undefined;
    renderer: THREE.WebGLRenderer | undefined
} = {
    camera: undefined,
    scene: undefined,
    renderer: undefined
};

window["globals"] = globals;