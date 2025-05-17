import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { getCamera, getRenderer, getScene } from "./graphics";
import { COORD_SCALE } from "./options";
import { updateOrbitRendering } from "./rendering";
import { getManeuvers, getStateAtTime, recalculateOrbits } from "./mechanics";
import { updateAnnotations } from "./annotation";

const displayTime = {
    minutes: 0,
    hours: 0,
    days: 0,
    years: 0
}
function updateDisplayTime() {
    let scene = getScene();

    const time = displayTime.minutes * 60 + displayTime.hours * 3600 + displayTime.days * 3600 * 24 + displayTime.years * 3600 * 24 * 365;

    scene.traverse((obj) => {
        let orbit = obj.userData?.orbit;
        if (!orbit) {
            return;
        }

        obj.position.copy(orbit.getPositionVelocity({t: time}).position.multiplyScalar(COORD_SCALE));
    });

    return time;
}

function updateOrbits() {
    let states = recalculateOrbits();
    updateOrbitRendering(states);
}

{
    const geometry = new THREE.SphereGeometry(.05, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const rocket = new THREE.Mesh(geometry, material);
    rocket.name = "rocket";
    getScene().add(rocket);
    const state = getStateAtTime(0);
    //getScene().getObjectByName(state.orbit.body)!.attach(rocket);
    rocket.position.copy(state.orbit.getPositionVelocity({ t: 0 }).position.multiplyScalar(COORD_SCALE));
}
const gui = new GUI();
{
    const folder = gui.addFolder("Time").onChange(() => {
        let time = updateDisplayTime();
        updateOrbits();
        updateAnnotations();

        let rocket = getScene().getObjectByName("rocket")!;

        let state = getStateAtTime(time);
        getScene().getObjectByName(state.orbit.body)!.attach(rocket);
        rocket.position.copy(state.orbit.getPositionVelocity({t: time}).position.multiplyScalar(COORD_SCALE));
    });
    
    folder.add(displayTime, "minutes", 0, 60);
    folder.add(displayTime, "hours", 0, 24);
    folder.add(displayTime, "days", 0, 365);
    folder.add(displayTime, "years", 0, 100);
}

gui.add({
    addManeuver: () => {
        const maneuvers = getManeuvers();
        
        maneuvers.push({ time: 100, orbits: 0, prograde: 0, normal: 0, radialout: 0 })
        let maneuver = maneuvers[maneuvers.length - 1];

        const folder = gui.addFolder(`Maneuver ${maneuvers.length}`).onChange(updateOrbits);
        folder.add(maneuver, "time", 1, 10000 /*(currentState.orbit.getEscapeInfo(currentState.tstart)?.escapeTime - currentState.tstart) || currentState.orbit.getPeriod()*/).name("Time to Maneuver");
        folder.add(maneuver, "orbits", 0, 10, 1).name("Number of Orbits");
        folder.add(maneuver, "prograde", -4000, 4000).name("Prograde Velocity Change");
        folder.add(maneuver, "normal", -4000, 4000).name("Normal Velocity Change");
        folder.add(maneuver, "radialout", -4000, 4000).name("Radial Velocity Change");
    }
}, "addManeuver").name("Add Maneuver");

const controls = new OrbitControls(getCamera(), getRenderer().domElement);
export function getCameraControls() {
    return controls;
}

let focusedBodyName = "Earth";
let focusedBodyOldPosition = new THREE.Vector3();
export function updateCamera(newBodyName = "") {
    const camera = getCamera();
    let focusedBody;

    if (newBodyName && newBodyName != focusedBodyName) {
        const oldBody = getScene().getObjectByName(focusedBodyName)!;
        focusedBody = getScene().getObjectByName(newBodyName)!;

        camera.position.copy(focusedBody.position.clone().add(camera.position.clone().sub(oldBody.position)));

        focusedBodyName = newBodyName;
        focusedBodyOldPosition = focusedBody.position.clone();
    } else {
        focusedBody = getScene().getObjectByName(focusedBodyName);

        if (!focusedBodyOldPosition.equals(focusedBody.position)) {
            camera.position.copy(focusedBody.position.clone().add(camera.position.clone().sub(focusedBodyOldPosition)));
        }

        focusedBodyOldPosition = focusedBody.position.clone();
    }
 
    getCameraControls().target.copy(focusedBody.position);
    getCameraControls().update();
}