import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import * as Orbits from './orbit.ts';
import * as Options from './options.ts';
import * as Rendering from './rendering.ts';
import { updateOrbitRendering } from './controls.ts';

const scene = new THREE.Scene();
Options.globals.scene = scene;
{
    const geometry = new THREE.SphereGeometry(.05, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const maneuverNode = new THREE.Mesh(geometry, material);
    maneuverNode.name = "orbitHoverMarker";
    scene.add(maneuverNode);
}

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1_000_000);
Options.globals.camera = camera;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
Options.globals.renderer = renderer;

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// add planets
scene.add(Rendering.initPlanets());

const controls = new OrbitControls(camera, renderer.domElement);
//controls.update() must be called after any manual changes to the camera's transform
camera.position.copy(scene.getObjectByName("Earth")!.position.clone().add(new THREE.Vector3(0, 0, 10)));
controls.target.copy(scene.getObjectByName("Earth")!.position);
controls.update();

//updateOrbitRendering();

function animate() {
    controls.update();

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);