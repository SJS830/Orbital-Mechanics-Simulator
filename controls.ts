import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { getCamera, getRenderer, getScene } from "./graphics";
import { COORD_SCALE } from "./options";
import { updateOrbitRendering } from "./rendering";
import { getManeuvers, getStateAtTime, getStatesList, recalculateOrbits } from "./mechanics";
import { updateAnnotations } from "./annotation";

const displayTime = {
    minutes: 0,
    hours: 0,
    days: 0,
    years: 0,
    playSpeed: 0
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

function updateOrbits(recalculate = false) {
    let states;
    if (!recalculate) {
        states = getStatesList();
    } else {
        states = recalculateOrbits();
        updateOrbitRendering(states);
    }
}

{
    const geometry = new THREE.SphereGeometry(.1, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const rocket = new THREE.Mesh(geometry, material);
    rocket.name = "rocket";
    getScene().add(rocket);
    const state = getStateAtTime(0);
    
    // earth isnt added right away for some reason
    let interval = setInterval(() => {
        let obj = getScene().getObjectByName("Earth");

        if (obj) {
            obj.attach(rocket);
            rocket.position.copy(state.orbit.getPositionVelocity({ t: 0 }).position.multiplyScalar(COORD_SCALE));

            clearInterval(interval);
        }
    }, 10);
}

function onTimeChange() {
    let time = updateDisplayTime();
    let rocket = getScene().getObjectByName("rocket")!;
    let state = getStateAtTime(time);

    getScene().getObjectByName(state.orbit.body)!.attach(rocket);
    rocket.position.copy(state.orbit.getPositionVelocity({ t: time }).position.multiplyScalar(COORD_SCALE));

    //updateOrbits();
    updateAnnotations();
}

const gui = new GUI();
{
    const folder = gui.addFolder("Time").onChange(onTimeChange);
    
    folder.add(displayTime, "minutes", 0, 60);
    folder.add(displayTime, "hours", 0, 24);
    folder.add(displayTime, "days", 0, 365);
    folder.add(displayTime, "years", 0, 100);

    folder.add(displayTime, "playSpeed", 0, 10);

    let playing = false;
    folder.add({togglePlay: () => {
        playing = !playing;
    }}, "togglePlay");

    setInterval(() => {
        if (!playing) {
            return;
        }

        let time = displayTime.minutes * 60 + displayTime.hours * 3600 + displayTime.days * 3600 * 24 + displayTime.years * 3600 * 24 * 365;

        time += 60 * Math.exp(displayTime.playSpeed);

        displayTime.years = Math.floor(time / (3600 * 24 * 365));
        time -= displayTime.years * (3600 * 24 * 365);

        displayTime.days = Math.floor(time / (3600 * 24));
        time -= displayTime.days * (3600 * 24);

        displayTime.hours = Math.floor(time / 3600);
        time -= displayTime.hours * 3600;

        displayTime.minutes = Math.floor(time / 60);
        time -= displayTime.minutes * 60;

        folder.controllers.forEach(x => x.updateDisplay());

        //console.log({time});
        
        onTimeChange();
    }, 1000 / 60);
}

gui.add({
    addManeuver: () => {
        const maneuvers = getManeuvers();
        
        maneuvers.push({ time: 100, orbits: 0, prograde: 0, normal: 0, radialout: 0 })
        let maneuver = maneuvers[maneuvers.length - 1];

        const folder = gui.addFolder(`Maneuver ${maneuvers.length}`).onChange(() => {updateOrbits(true)});
        folder.add(maneuver, "time", 1, 10000 /*(currentState.orbit.getEscapeInfo(currentState.tstart)?.escapeTime - currentState.tstart) || currentState.orbit.getPeriod()*/).name("Time to Maneuver");
        //folder.add(maneuver, "orbits", 0, 10, 1).name("Number of Orbits");
        folder.add(maneuver, "prograde", -4000, 4000).name("Prograde Velocity Change");
        folder.add(maneuver, "normal", -4000, 4000).name("Normal Velocity Change");
        folder.add(maneuver, "radialout", -4000, 4000).name("Radial Velocity Change");

        updateOrbits(true);
        updateOrbitRendering(getStatesList());
    }
}, "addManeuver").name("Add Maneuver");

const controls = new OrbitControls(getCamera(), getRenderer().domElement);
export function getCameraControls() {
    return controls;
}

let focusedBodyName = "Earth";
let focusedBodyOldPosition;
export function updateCamera(newBodyName = "") {
    /*console.log("[updateCamera] Start", {
        newBodyName,
        current: focusedBodyName,
        hasOldPos: !!focusedBodyOldPosition
    });*/

    if (!focusedBodyOldPosition) {
        focusedBodyOldPosition = getScene().getObjectByName("Earth")!.position.clone();
    }

    const camera = getCamera();
    let focusedBody: THREE.Object3D;

    if (newBodyName && newBodyName != focusedBodyName) {
        const oldBody = getScene().getObjectByName(focusedBodyName)!;
        focusedBody = getScene().getObjectByName(newBodyName)!;

        console.log("[updateCamera] Switching focus", {
            from: focusedBodyName,
            to: newBodyName,
            oldBodyPos: oldBody.position.toArray(),
            newBodyPos: focusedBody.position.toArray(),
            cameraPos: camera.position.toArray()
        });

        camera.position.copy(focusedBody.getWorldPosition(new THREE.Vector3()).add(camera.position.clone().sub(oldBody.getWorldPosition(new THREE.Vector3()))));

        focusedBodyName = newBodyName;
        focusedBodyOldPosition = focusedBody.getWorldPosition(new THREE.Vector3()).clone();
    } else {
        focusedBody = getScene().getObjectByName(focusedBodyName)!;

        if (!focusedBodyOldPosition.equals(focusedBody.getWorldPosition(new THREE.Vector3()))) {
            /*console.log("[updateCamera] Position changed", {
                body: focusedBodyName,
                oldPos: focusedBodyOldPosition.toArray(),
                newPos: focusedBody.getWorldPosition(new THREE.Vector3()).toArray(),
                cameraPos: camera.position.toArray()
            });*/
            camera.position.copy(focusedBody.getWorldPosition(new THREE.Vector3()).clone().add(camera.position.clone().sub(focusedBodyOldPosition)));
        }

        focusedBodyOldPosition = focusedBody.getWorldPosition(new THREE.Vector3()).clone();
    }
 
    getCameraControls().target.copy(focusedBody.getWorldPosition(new THREE.Vector3()));
    getCameraControls().update();
}

window.addEventListener("keydown", (event) => {
    //console.log(event);

    if (event.key === "Tab") {
        event.preventDefault();

        if (focusedBodyName == "Earth") {
            updateCamera("rocket");
        } else if (focusedBodyName == "rocket") {
            updateCamera("Earth");
        }
    }
});

setTimeout(() => {
    updateCamera("rocket");
}, 100);