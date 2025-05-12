import * as THREE from 'three';
import { Bodies, Orbit } from './orbit';
import * as Options from './options';
import SpriteText from 'three-spritetext';
import { states } from "./controls";

export function renderOrbit(orbit: Orbit, line?: THREE.Line, addLabels: boolean = true): THREE.Line {
    if (!line) {
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const geometry = new THREE.BufferGeometry();
        line = new THREE.Line(geometry, material);
        line.name = "orbitLine";

        if (addLabels) {
            for (const label of ["Ap", "Pe", "AN", "DN"]) {
                const text = new SpriteText(label, 0.05, "white");
                text.material.sizeAttenuation = false;
                text.name = label;

                line.add(text);
            };
        }
    }

    let { positions, SOI } = orbit.getPointsOnOrbit(2048);
    positions.map(x => x.multiplyScalar(Options.COORD_SCALE));

    line.geometry.setFromPoints(positions);
    line.geometry.setDrawRange(0, positions.length);

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
    }

    return line;
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
    let planetsAlreadyAdded: [string] = ["your mom"];
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

window.addEventListener("mousemove", (event) => {
    let camera = Options.globals.camera;
    let renderer = Options.globals.renderer;
    let scene = Options.globals.scene;
    if (!camera || !renderer || !scene) {
        return;
    }

    let mousePos = new THREE.Vector2(event.clientX / renderer.domElement.width, event.clientY / renderer.domElement.height).multiplyScalar(2).subScalar(1).multiply(new THREE.Vector2(1, -1));

    let minIndex = -1;
    let minDistance = Infinity;

    let lastOrbit = states[states.length - 1];
    let {positions, velocities} = lastOrbit.getPointsOnOrbit(2048, true);

    for (let i = 0; i < positions.length; i++) {
        const point3d = positions[i].clone();

        let body = scene.getObjectByName(lastOrbit.body);
        if (body) {
            point3d.add(body.position.clone().divideScalar(Options.COORD_SCALE));
            body.traverseAncestors((obj) => {
                point3d.add(obj.position.clone().divideScalar(Options.COORD_SCALE));
            });
        }
        point3d.multiplyScalar(Options.COORD_SCALE).project(camera);

        const point = new THREE.Vector2(point3d.x, point3d.y);
        const distance = point.distanceTo(mousePos);

        if (distance < minDistance) {
            minIndex = i;
            minDistance = distance
        }
    }

    scene.getObjectByName(lastOrbit.body)?.attach(scene.getObjectByName("orbitHoverMarker")!);
    scene.getObjectByName("orbitHoverMarker")?.position.copy(positions[minIndex].clone().multiplyScalar(Options.COORD_SCALE));
    //console.log(latestOrbitPoints[minIndex]);
    //console.log(scene.getObjectByName("orbitHoverMarker")?.position);
    //console.log(scene.getObjectByName("orbitHoverMarker")?.parent);
    //console.log({ minIndex, minDistance });
});