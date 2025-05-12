import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { Orbit, Bodies } from './orbit.ts';
import { globals, COORD_SCALE } from './options.ts';
import * as Rendering from './rendering.ts';

import GUI from 'lil-gui'; 

const initialState = new Orbit("Earth", { position: new THREE.Vector3(1e7, 0, 0), velocity: new THREE.Vector3(0, 0, 6400), time: 0});

// time: time in orbit before maneuver (max 1 period)
// oribts: + how many full orbits
const maneuvers: { time: number; orbits: number; prograde: number; normal: number; radialout: number; }[] = [];
export let states: Orbit[] = [initialState];

let Z = 0; //kill me now please
export function updateOrbitRendering() {
    if (!globals.scene) {
        return;
    }

    states = [initialState];
    let absTime = 0;

    let j = 0; //state pointer
    for (let i = 0; i < maneuvers.length; i++) {
        let maneuver = maneuvers[i];
        let state = states[j];

        let escapeInfo = state.getEscapeInfo();

        //todo: make orbit time adding impossible if on escape traj
        if (escapeInfo !== undefined) {
            if (escapeInfo.time < absTime + maneuver.time) {
                let planetInfo = globals.scene.getObjectByName(state.body)?.userData.orbit.getPositionVelocity({ t: escapeInfo.time });

                states.push(new Orbit(Bodies[state.body].parentBody, { position: escapeInfo.position.add(planetInfo.position), velocity: escapeInfo.velocity.add(planetInfo.velocity), time: escapeInfo.time }));

                j++;
                continue;
            }
        }

        absTime += maneuver.time + maneuver.orbits * state.getPeriod();

        let { position, velocity } = state.getPositionVelocity({ t: absTime });

        let cartesianManeuver = velocity.clone().normalize().multiplyScalar(maneuver.prograde);
        cartesianManeuver.add(position.clone().normalize().multiplyScalar(maneuver.radialout));
        cartesianManeuver.add(position.clone().cross(velocity).normalize().multiplyScalar(maneuver.normal));

        {
            /*const maneuverNode = new THREE.ArrowHelper(velocity.clone().normalize(), position.clone().multiplyScalar(COORD_SCALE), velocity.clone().length() / 10000, 0xffff00);
            maneuverNode.name = `maneuverNode${Z}`;
            globals.scene.getObjectByName(state.body)?.add(maneuverNode);*/
        }
        {
            const maneuverNode = new THREE.ArrowHelper(cartesianManeuver.clone().normalize(), position.clone().multiplyScalar(COORD_SCALE), cartesianManeuver.clone().length() / 10000, 0xff0000);
            maneuverNode.name = `maneuverNode${Z}`;
            globals.scene.getObjectByName(state.body)?.add(maneuverNode);
        }
        //console.log({cartesianManeuver, position, velocity});

        states.push(new Orbit(state.body, { position, velocity: velocity.add(cartesianManeuver).multiplyScalar(-1) /* no idea why but this makes the orientation right */, time: absTime }));

        j++;
    }

    for (const state of states) {
        console.log("AAAAAAAA");
        
        let escapeInfo = state.getEscapeInfo();

        console.log("escapeInfo", escapeInfo, "maxR", state.getMaxR());
    }

    let rocketOrbit;
    while ((rocketOrbit = globals.scene.getObjectByName("rocketOrbit"))) {
        rocketOrbit.material.dispose();
        rocketOrbit.geometry.dispose();
        rocketOrbit.parent.remove(rocketOrbit);
    }

    let maneuverNode;
    while ((maneuverNode = globals.scene.getObjectByName(`maneuverNode${Z-1}`))) {
        //maneuverNode.dispose();
        maneuverNode.parent.remove(maneuverNode);
    }
    Z += 1;

    for (const state of states) {
        let line = Rendering.renderOrbit(state, undefined, true);
        line.name = "rocketOrbit";
        line.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        globals.scene.getObjectByName(state.body)?.add(line);
    }
}

const gui = new GUI();
gui.add({ addManeuver: () => {
    maneuvers.push({ time: 100, orbits: 0, prograde: 0, normal: 0, radialout: 0 })
    let maneuver = maneuvers[maneuvers.length - 1];
    let currentState = states[maneuvers.length - 1];

    const folder = gui.addFolder(`Maneuver ${maneuvers.length}`).onChange(updateOrbitRendering);
    folder.add(maneuver, "time", 0, currentState.getPeriod()).name("Time to Maneuver");
    folder.add(maneuver, "orbits", 0, 10, 1).name("Number of Orbits");
    folder.add(maneuver, "prograde", -10000, 10000).name("Prograde Velocity Change");
    folder.add(maneuver, "normal", -10000, 10000).name("Normal Velocity Change");
    folder.add(maneuver, "radialout", -10000, 10000).name("Radial Velocity Change");

    updateOrbitRendering();
}}, "addManeuver").name("Add Maneuver");

/*
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
*/
