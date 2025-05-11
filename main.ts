import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'dat.gui'

import * as Orbits from './orbits.ts';
import * as Options from './options.ts';
import * as Rendering from './rendering.ts';

const scene = new THREE.Scene();
Options.globals.scene = scene;  

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10_000_000);
Options.globals.camera = camera;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
Options.globals.renderer = renderer;

const controls = new OrbitControls(camera, renderer.domElement);
//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 0, 10000);
controls.update();

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

scene.add(Rendering.initPlanets());

const rocket = {
    R: new THREE.Vector3(1e7, 0, 0),
    V: new THREE.Vector3(0, 0, 6400) //geostationary
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

    Rendering.renderOrbit({
        params: orbitParams,
        body: "Earth",
        tstart: 0
    }, scene.getObjectByName("Earth").getObjectByName("orbitLine"));
}

controls.target.copy(scene.getObjectByName("Earth").position);

const state = {
    time: 0,
    focusedBody: "Earth"
};

const gui = new GUI();

const posFolder = gui.addFolder("Rocket Position");
posFolder.add(rocket.R, 'x', -1e7, 1e7).onChange(updateOrbitRendering);
posFolder.add(rocket.R, 'y', -1e7, 1e7).onChange(updateOrbitRendering);
posFolder.add(rocket.R, 'z', -1e7, 1e7).onChange(updateOrbitRendering);
posFolder.open();

const velFolder = gui.addFolder("Rocket Velocity");
velFolder.add(rocket.V, 'x', -10000, 10000).onChange(updateOrbitRendering);
velFolder.add(rocket.V, 'y', -10000, 10000).onChange(updateOrbitRendering);
velFolder.add(rocket.V, 'z', -10000, 10000).onChange(updateOrbitRendering);
velFolder.open();

const stateFolder = gui.addFolder("State");
velFolder.add(state, 'time', 0, 3600 * 24 * 365).onChange(() => {
    let camPosRelToFocusedBody = camera.position.clone().sub(scene.getObjectByName(state.focusedBody).position);
    console.log(camera.position);
    console.log(camPosRelToFocusedBody);

    scene.getObjectByName("Planets")?.traverse((body) => {
        if (!body.userData.parentBody || !body.userData.params) {
            return;
        }

        body.position.copy(Orbits.getPositionVelocity(body.userData.params, body.userData.parentBody, { t: state.time }).R.multiplyScalar(Options.COORD_SCALE));
    });

    camera.position.copy(scene.getObjectByName(state.focusedBody).position.clone().add(camPosRelToFocusedBody));
    controls.target.copy(scene.getObjectByName(state.focusedBody).position);
});
stateFolder.open();