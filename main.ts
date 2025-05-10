import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'dat.gui'

import * as Orbits from './orbits.ts';
import * as Options from './options.ts';
import * as Rendering from './rendering.ts';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1_000_000_000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 0, 10000);
controls.update();

for (const key of Object.keys(Orbits.Bodies)) {
    const body = Orbits.Bodies[key];

    const mesh = Rendering.createPlanet(body);
    mesh.name = body.name;

    scene.add(mesh);
}

const rocket = {
    R: new THREE.Vector3(),
    V: new THREE.Vector3()
}

{
    const startingOrbit = Orbits.getOrbitalParams(rocket.R, rocket.V, "Earth", 0);
    scene.getObjectByName("Earth").add(Rendering.renderOrbit({
        params: startingOrbit,
        body: "Earth",
        tstart: 0
    })); //orbitLine
}
function updateOrbitRendering() {
    const orbitParams = Orbits.getOrbitalParams(rocket.R, rocket.V, "Earth", 0);
    console.log(orbitParams);
    Rendering.renderOrbit({
        params: orbitParams,
        body: "Earth",
        tstart: 0
    }, scene.getObjectByName("Earth").getObjectByName("orbitLine"));
}

const gui = new GUI();
const posFolder = gui.addFolder("Rocket Position");
const velFolder = gui.addFolder("Rocket Velocity");
posFolder.add(rocket.R, 'x', -1e7, 1e7).onChange(updateOrbitRendering);
posFolder.add(rocket.R, 'y', -1e7, 1e7).onChange(updateOrbitRendering);
posFolder.add(rocket.R, 'z', -1e7, 1e7).onChange(updateOrbitRendering);
velFolder.add(rocket.V, 'x', -10000, 10000).onChange(updateOrbitRendering);
velFolder.add(rocket.V, 'y', -10000, 10000).onChange(updateOrbitRendering);
velFolder.add(rocket.V, 'z', -10000, 10000).onChange(updateOrbitRendering);
posFolder.open();
velFolder.open();

function animate() {
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;

    controls.update();

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});