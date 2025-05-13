import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { Orbit, Bodies, BodiesOrbits, getBodyPositions } from './orbit.ts';
import { globals, COORD_SCALE } from './options.ts';
import * as Rendering from './rendering.ts';

import GUI from 'lil-gui';

const initialState = new Orbit("Earth", { position: new THREE.Vector3(1e7, 0, 0), velocity: new THREE.Vector3(0, 0, 6400), time: 0 });

// time: time in orbit before maneuver (max 1 period)
// oribts: + how many full orbits
const maneuvers: { time: number; orbits: number; prograde: number; normal: number; radialout: number; }[] = [];
export let states: { tstart: number, orbit: Orbit }[] = [{ tstart: 0, state: initialState }];

window["getStates"] = () => {return states};

export function recalculateOrbits() {
    states = [{ tstart: 0, orbit: initialState }];

    function calculateProgression() {
        for (let k = 0; k < 3; k++) {
            let state = states[states.length - 1]
            let escapeInfo = state.orbit.getEscapeInfo(state.tstart);

            //todo: make orbit time adding impossible if on escape traj
            if (escapeInfo !== undefined) {
                //globals.DEBUG_PRINT = true;
                let stateAtEscape = state.orbit.getPositionVelocity({ t: escapeInfo.escapeTime });
                console.log({ stateAtEscape, escapeInfo });
                //globals.DEBUG_PRINT = false;
                let oldbody = state.orbit.body;
                let newbody = escapeInfo.newBody;

                let bodyPositions = getBodyPositions(escapeInfo.escapeTime);

                let relativePositionPlanets = bodyPositions[oldbody].position.clone().sub(bodyPositions[newbody].position);

                states.push({
                    tstart: escapeInfo.escapeTime,
                    orbit: new Orbit(
                        escapeInfo.newBody, {
                        position: stateAtEscape.position.clone().add(relativePositionPlanets),
                        velocity: /*stateAtEscape.velocity.add(oldbodystate.velocity).sub(newbodystate.velocity*/ new THREE.Vector3(1000, 1000, 1000), time: escapeInfo.escapeTime
                    })
                });

                continue;
            } else {
                break;
            }
        }
    }

    calculateProgression();

    for (let i = 0; i < maneuvers.length; i++) {
        let maneuver = maneuvers[i];
        let maneuverTimeAbs = 0;

        for (let j = 0; j <= i; j++) {
            maneuverTimeAbs += maneuvers[j].time; /* + orbits whatever*/;
        }

        states = states.filter(({tstart, orbit}) => tstart < maneuverTimeAbs);
        let state = states[states.length - 1];

        let { tstart, orbit } = state;

        let { position, velocity } = orbit.getPositionVelocity({ t: maneuverTimeAbs });

        let cartesianManeuver = velocity.clone().normalize().multiplyScalar(maneuver.prograde);
        cartesianManeuver.add(position.clone().normalize().multiplyScalar(maneuver.radialout));
        cartesianManeuver.add(position.clone().cross(velocity).normalize().multiplyScalar(maneuver.normal));

        states.push({
            tstart: maneuverTimeAbs,
            orbit: new Orbit(orbit.body, {
                position, velocity: velocity.add(cartesianManeuver).negate(), /* no idea why but this makes the orientation right */
                time: maneuverTimeAbs
            }
        )});

        calculateProgression();
    }

    console.log(states);

    /*let j = 0;
    for (let i = 0; i < maneuvers.length; i++) {
        let maneuver = maneuvers[i];
        let state = states[j];

        console.log({ absTime });
        let escapeInfo = state.getEscapeInfo(absTime);
        console.log({ escapeInfo });

        //todo: make orbit time adding impossible if on escape traj
        if (escapeInfo !== undefined) {
            if (escapeInfo.escapeTime < absTime + maneuver.time) {
                states.push(new Orbit(escapeInfo.newBody, { position: escapeInfo.escapePositionNew, velocity: escapeInfo.escapeVelocityNew, time: escapeInfo.escapeTime }));

                i--;
                continue;
            }
        }

        absTime += maneuver.time //+ maneuver.orbits * state.getPeriod();

        let { position, velocity } = state.getPositionVelocity({ t: absTime });

        let cartesianManeuver = velocity.clone().normalize().multiplyScalar(maneuver.prograde);
        cartesianManeuver.add(position.clone().normalize().multiplyScalar(maneuver.radialout));
        cartesianManeuver.add(position.clone().cross(velocity).normalize().multiplyScalar(maneuver.normal));

        //console.log({cartesianManeuver, position, velocity});

        states.push(new Orbit(state.body, { position, velocity: velocity.add(cartesianManeuver).negate() /* no idea why but this makes the orientation right *//*, time: absTime }));
    }
    */
}

let Z = 0; //kill me now please
export function updateOrbitRendering() {
    if (!globals.scene) {
        return;
    }

    let rocketOrbit;
    while ((rocketOrbit = globals.scene.getObjectByName("rocketOrbit"))) {
        rocketOrbit.material.dispose();
        rocketOrbit.geometry.dispose();
        rocketOrbit.parent.remove(rocketOrbit);
    }

    let maneuverNode;
    while ((maneuverNode = globals.scene.getObjectByName(`maneuverNode${Z - 1}`))) {
        //maneuverNode.dispose();
        maneuverNode.parent.remove(maneuverNode);
    }
    Z += 1;

    for (const { orbit } of states) {
        let line = Rendering.renderOrbit(orbit, undefined, true);
        line.name = "rocketOrbit";
        line.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        globals.scene.getObjectByName(orbit.body)?.add(line);
    }
}

const gui = new GUI();
gui.add({
    addManeuver: () => {
        maneuvers.push({ time: 100, orbits: 0, prograde: 0, normal: 0, radialout: 0 })
        let maneuver = maneuvers[maneuvers.length - 1];
        let currentState = states[maneuvers.length - 1] || states[0];

        const folder = gui.addFolder(`Maneuver ${maneuvers.length}`).onChange(() => { recalculateOrbits(); updateOrbitRendering()});
        folder.add(maneuver, "time", 1, 10000 /*(currentState.orbit.getEscapeInfo(currentState.tstart)?.escapeTime - currentState.tstart) || currentState.orbit.getPeriod()*/).name("Time to Maneuver");
        folder.add(maneuver, "orbits", 0, 10, 1).name("Number of Orbits");
        folder.add(maneuver, "prograde", -10000, 10000).name("Prograde Velocity Change");
        folder.add(maneuver, "normal", -10000, 10000).name("Normal Velocity Change");
        folder.add(maneuver, "radialout", -10000, 10000).name("Radial Velocity Change");
    }
}, "addManeuver").name("Add Maneuver");

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
