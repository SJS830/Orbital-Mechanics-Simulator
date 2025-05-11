import * as THREE from 'three';

export const COORD_SCALE = 1 / 1000_000; // 1000 km = 1 unit

export const globals: {
    camera: THREE.PerspectiveCamera | undefined;
    scene: THREE.Scene | undefined;
    renderer: THREE.WebGLRenderer | undefined
} = {
    camera: undefined,
    scene: undefined,
    renderer: undefined
};