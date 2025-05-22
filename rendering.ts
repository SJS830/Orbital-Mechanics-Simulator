import * as THREE from 'three';
import { Bodies, getBodyPositions, Orbit, getSOI } from './orbit';
import * as Options from './options';
import SpriteText from 'three-spritetext';
import { getCamera, getRenderer, getScene } from "./graphics";
import { Annotation } from "./annotation";
import { COORD_SCALE } from "./options";
import { getManeuvers, getStatesList } from "./mechanics";

function numPointsOnOrbit(orbit: Orbit) {
    let numPoints;
    if (orbit.params.e < 1) {
        numPoints = orbit.params.a / 20000 /* calculated so that initial orbit has 256 points */
    } else {
        let soi = getSOI(orbit.body);
        if (soi == Infinity) {
            numPoints = 10000;
        } else {
            numPoints = soi / 20000;
        }
    }

    return Math.ceil(Math.max(Math.min(numPoints, 16384 * 2), 512));
}

export function renderOrbit(orbit: Orbit, line?: THREE.Line, addLabels: boolean = true, timerange?: { min: number; max: number; }): THREE.Line {
    if (!line) {
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const geometry = new THREE.BufferGeometry();
        line = new THREE.Line(geometry, material);
        line.name = "orbitLine";

        if (addLabels) {
            for (const label of ["Ap", "Pe"/*, "AN", "DN"*/]) {
                const text = new SpriteText(label, 0.05, "white");
                text.material.sizeAttenuation = false;
                text.name = label;

                line.add(text);
            };
        }
    }

    let { positions, SOI } = orbit.getPointsOnOrbit(Math.min(numPointsOnOrbit(orbit), 8192), true, timerange);

    line.geometry.setDrawRange(0, positions.length);
    line.geometry.setFromPoints(positions.map(x => x.clone().multiplyScalar(Options.COORD_SCALE)));

    if (addLabels) {
        let vmin = 0; let vmax = 2 * Math.PI;
        if (orbit.params.e >= 1) {
            //orbital motion page 84
            vmin = -Math.PI + Math.acos(1 / orbit.params.e) + .0001;
            vmax = Math.PI - Math.acos(1 / orbit.params.e) - .0001;
        }
        vmin = THREE.MathUtils.euclideanModulo(vmin, 2 * Math.PI);
        vmax = THREE.MathUtils.euclideanModulo(vmax, 2 * Math.PI) + 2 * Math.PI;

        // perihelion: f = 0
        let label = line.getObjectByName("Pe")!;
        label.position.copy(orbit.getPositionVelocity({ v: 0 }).position.multiplyScalar(Options.COORD_SCALE));

        // aphelion: f = pi
        label = line.getObjectByName("Ap")!;
        if (vmin < Math.PI && Math.PI < vmax) {
            label.position.copy(orbit.getPositionVelocity({ v: Math.PI }).position.multiplyScalar(Options.COORD_SCALE));

            label.visible = (label.position.length() < SOI);
        } else {
            label.visible = false;
        }

        /*
        // ascending node: f = omega
        let v = THREE.MathUtils.euclideanModulo(orbit.params.omega, 2 * Math.PI);
        label = line.getObjectByName("AN")!;
        if (vmin < v && v < vmax) {
            label.position.copy(orbit.getPositionVelocity({ v }).position.multiplyScalar(Options.COORD_SCALE));

            label.visible = (label.position.length() < SOI);
        } else {
            label.visible = false;
        }

        // descending node: f = omega + pi
        v = THREE.MathUtils.euclideanModulo(orbit.params.omega + Math.PI, 2 * Math.PI);
        label = line.getObjectByName("DN")!;
        if (vmin < v && v < vmax) {
            label.position.copy(orbit.getPositionVelocity({ v }).position.multiplyScalar(Options.COORD_SCALE));

            label.visible = (label.position.length() < SOI);
        } else {
            label.visible = false;
        }
        */
    }

    return line;
}

let Z = 0; //kill me now please
export const annotations: { annotations: Annotation[] } = { annotations: [] };
export function updateOrbitRendering(statesList: { tstart: number, orbit: Orbit, cause?: { type: "maneuver"; maneuverNumber: number; maneuverPosition: THREE.Vector3 } | { type: "escape"; escapeInfo: { escapeTime: number; newBody: string; oldBody: string; escapePosition: THREE.Vector3 } } }[]) {
    console.log({statesList});
    let renderedLines: THREE.Object3D[] = [];

    const scene = getScene();

    let rocketOrbit;
    while ((rocketOrbit = scene.getObjectByName("rocketOrbit"))) {
        rocketOrbit.removeFromParent();
    }

    let maneuverNode;
    while ((maneuverNode = scene.getObjectByName(`maneuverNode${Z - 1}`))) {
        //maneuverNode.dispose();
        maneuverNode.removeFromParent();
    }
    Z += 1;

    for (let i = 0; i < statesList.length; i++) {
        const { orbit } = statesList[i]

        let timerange;
        if (i + 1 < statesList.length) {
            //timerange = { min: statesList[i].tstart, max: statesList[i + 1].tstart };
        }

        let line = renderOrbit(orbit, undefined, true, timerange);
        line.name = "rocketOrbit";
        line.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        scene.getObjectByName(orbit.body)!.add(line);

        renderedLines.push(line);
    }

    for (const annotation of annotations.annotations) {
        annotation.destroy();
    }

    annotations.annotations = [];

    for (let i = 0; i < statesList.length; i++) {
        let state = statesList[i];

        if (!state.cause) {
            continue;
        }

        if (state.cause.type == "maneuver") {
            let maneuver = getManeuvers()[state.cause.maneuverNumber];
            
            let ele = document.createElement("span");
            ele.innerHTML = `<p style='color: white; white-space: pre-line'>Maneuver \n Prograde: ${maneuver.prograde.toFixed(2)}m/s \n Radial: ${maneuver.radialout.toFixed(2)}m/s \n Normal: ${maneuver.normal.toFixed(2)}m/s</p>`;

            annotations.annotations.push(new Annotation(state.cause.maneuverPosition.clone().multiplyScalar(COORD_SCALE), ele, getScene().getObjectByName(state.orbit.body)));
        } else if (state.cause.type == "escape") {
            let ele = document.createElement("span");
            ele.innerHTML = `<p style='color: white'>Escape from ${statesList[i - 1].orbit.body} to ${state.orbit.body}</p>`;

            annotations.annotations.push(new Annotation(state.cause.escapeInfo.escapePosition.clone().multiplyScalar(COORD_SCALE), ele, getScene().getObjectByName(statesList[i - 1].orbit.body)));
        }
    }

    console.log({renderedLines});
}

function createPlanetMesh(info: { radius: number; texture: string; name: string; }): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(info.radius * Options.COORD_SCALE, 64, 32);
    const material = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(
            info.texture
        )
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = info.name;

    return mesh;
}

export function initPlanets(): THREE.Group {
    const planets = new THREE.Group();
    planets.name = "Planets";

    // too lazy to think of a smarter way to have different levels of recursion for orbiting bodies
    let planetsAlreadyAdded: [string] = [""];
    for (let i = 0; i < 10; i++) {
        for (const bodyIndex in Bodies) {
            let body = Bodies[bodyIndex];
            if (body.parentBody && !planetsAlreadyAdded.includes(body.parentBody)) {
                continue;
            }
            if (planetsAlreadyAdded.includes(body.name)) {
                continue;
            }

            let mesh = createPlanetMesh(body);
            mesh.name = body.name;
            mesh.userData = body;
            if (body.parentBody) {
                mesh.userData.orbit = new Orbit(body.parentBody, { params: body.params });
            }

            const text = new SpriteText(body.name, 0.05, "white");
            text.material.sizeAttenuation = false;
            text.name = "label";
            mesh.add(text);

            if (body.parentBody) {
                const parent = planets.getObjectByName(body.parentBody);

                if (parent) {
                    parent.add(mesh);

                    let orbitLine = renderOrbit(mesh.userData.orbit, undefined, false);
                    orbitLine.name = body.name + "OrbitLine";
                    parent.add(orbitLine);
                }
            } else {
                planets.add(mesh);
            }

            if (body.parentBody) {
                mesh.position.copy(mesh.userData.orbit.getPositionVelocity({ t: 0 }).position.multiplyScalar(Options.COORD_SCALE));
            }

            planetsAlreadyAdded.push(body.name);
            //Orbits.Bodies[body.name].mesh = mesh;
        }
    }

    return planets;
}

{
    const geometry = new THREE.SphereGeometry(.05, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const maneuverNode = new THREE.Mesh(geometry, material);
    maneuverNode.name = "orbitHoverMarker";
    getScene().add(maneuverNode);
}
window.addEventListener("mousemovee", (event) => {
    let camera = getCamera();
    let renderer = getRenderer();
    let scene = getScene();

    const states = getStatesList();

    let mousePos = new THREE.Vector2(event.clientX / renderer.domElement.width, event.clientY / renderer.domElement.height).multiplyScalar(2).subScalar(1).multiply(new THREE.Vector2(1, -1));

    //console.log("checkpount -0.5");

    let minIndex = -1;
    let minDistance = Infinity;
    let minBody, minPosition;

    let validStates;
    if (states.length == 1) {
        validStates = [states[0]];
    } else {
        let i = states.length - 1;
        while (states[i] && states[i].cause && states[i].cause!.type != "maneuver") {
            i--;
        }

        validStates = states.slice(Math.max(0, i - 1));
    }

    //console.log("checkpount -0.25");
    //console.log({validStates});

    function tryy(positions, state, i) {
        let point3d = positions[i].clone().multiplyScalar(Options.COORD_SCALE);

        let body = scene!.getObjectByName(state.orbit.body);
        if (body) {
            point3d.add(body.position);
            body.traverseAncestors((obj) => {
                point3d.add(obj.position);
            });
        }

        let point3dProjected = point3d.clone().project(camera);

        const point = new THREE.Vector2(point3dProjected.x, point3dProjected.y);
        const distance = point.distanceTo(mousePos);

        if (distance < minDistance) {
            minIndex = i;
            minDistance = distance;
            minPosition = positions[i];
            minBody = state.orbit.body;
            point3dMin = point3d.clone();
        }

        return distance;
    }

    //console.log("checkpoint 0");

    let point3dMin;
    for (let i = 0; i < validStates.length; i++) {
        const state = validStates[i];

        let numPoints = 2048;//numPointsOnOrbit(state.orbit);

        let timerange;
        if (i + 1 < validStates.length) {
            timerange = { min: validStates[i].tstart, max: validStates[i + 1].tstart };
        }
        let { positions, velocities } = state.orbit.getPointsOnOrbit(numPoints + 1, true, timerange);

        //console.log("checkpoint 1");
        let jump = Math.ceil(positions.length / 2048);

        let minDistLocal = Infinity;
        let minIlocal = -1;
        
        for (let i = 0; i < positions.length; i += jump) {
            let dist = tryy(positions, state, i);

            if (dist < minDistLocal) {
                minDistLocal = dist;
                minIlocal = i;
            }
        }
        //console.log("checkpoint 2");

        for (let i = minIlocal - jump; i < minIlocal + jump; i++) {
            let j = THREE.MathUtils.euclideanModulo(i, positions.length);
            tryy(positions, state, j);
        }
        //console.log("checkpoint 3");
    }
    //console.log("checkpoint 4");

    let scale = point3dMin.clone().sub(camera.position).length() / 5;
    scene.getObjectByName(minBody)?.attach(scene.getObjectByName("orbitHoverMarker")!);
    scene.getObjectByName("orbitHoverMarker")?.position.copy(minPosition.clone().multiplyScalar(Options.COORD_SCALE));
    scene.getObjectByName("orbitHoverMarker")?.scale.copy(new THREE.Vector3(scale, scale, scale));
    //console.log("checkpoint 5");
    ////console.log(latestOrbitPoints[minIndex]);
    ////console.log(scene.getObjectByName("orbitHoverMarker")?.position);
    ////console.log(scene.getObjectByName("orbitHoverMarker")?.parent);
    ////console.log({ minIndex, minDistance });
});