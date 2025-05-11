import * as THREE from 'three';
import * as Orbits from './orbits';
import * as Options from './options';
import SpriteText from 'three-spritetext';

let latestOrbitPoints: THREE.Vector3[] = [];
let latestOrbitingBody: string;
export function getPointsOnOrbit(orbit: Orbits.OrbitInfo, N: number = 1024): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    let vmin = 0; let vmax = 2 * Math.PI;
    if (orbit.params.e >= 1) {
        //orbital motion page 84
        vmin = -Math.PI + Math.acos(1 / orbit.params.e) + .0001;
        vmax = Math.PI - Math.acos(1 / orbit.params.e) - .0001;
    }

    for (let v = vmin; v <= vmax; v += (vmax - vmin) / 1024) {
        points.push(Orbits.getPositionVelocity(orbit.params, orbit.body, { v }).R);
    }

    latestOrbitPoints = points;
    latestOrbitingBody = orbit.body;
    return points;
}

export function renderOrbit(orbit: Orbits.OrbitInfo, line?: THREE.Line, addLabels: boolean = true): THREE.Line {
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

    const points = getPointsOnOrbit(orbit, 1024).map(x => x.clone().multiplyScalar(Options.COORD_SCALE));
    line.geometry.setFromPoints(points);

    if (addLabels) {
        let vmin = 0; let vmax = 2 * Math.PI;
        if (orbit.params.e >= 1) {
            //orbital motion page 84
            vmin = -Math.PI + Math.acos(1 / orbit.params.e) + .0001;
            vmax = Math.PI - Math.acos(1 / orbit.params.e) - .0001;
        }
        vmin = THREE.MathUtils.euclideanModulo(vmin, 2 * Math.PI);
        vmax = THREE.MathUtils.euclideanModulo(vmax, 2 * Math.PI) + 2 * Math.PI;

        let label; // i hate typescript

        // perihelion: f = 0
        if ((label = line.getObjectByName("Pe"))) {
            label.position.copy(Orbits.getPositionVelocity(orbit.params, orbit.body, { v: 0 }).R.multiplyScalar(Options.COORD_SCALE));
        }

        // aphelion: f = pi
        if ((label = line.getObjectByName("Ap"))) {
            if (vmin < Math.PI && Math.PI < vmax) {
                label.position.copy(Orbits.getPositionVelocity(orbit.params, orbit.body, { v: Math.PI }).R.multiplyScalar(Options.COORD_SCALE));
                label.visible = true;
            } else {
                label.visible = false;
            }
        }
        // ascending node: f = omega
        let v = THREE.MathUtils.euclideanModulo(orbit.params.omega, 2 * Math.PI);
        if ((label = line.getObjectByName("AN"))) {
            if (vmin < v && v < vmax) {
                label.position.copy(Orbits.getPositionVelocity(orbit.params, orbit.body, { v }).R.multiplyScalar(Options.COORD_SCALE));
                label.visible = true;
            } else {
                label.visible = false;
            }
        }

        // descending node: f = omega + pi
        v = THREE.MathUtils.euclideanModulo(orbit.params.omega + Math.PI, 2 * Math.PI);
        if ((label = line.getObjectByName("DN"))) {
            if (vmin < v && v < vmax) {
                label.position.copy(Orbits.getPositionVelocity(orbit.params, orbit.body, { v }).R.multiplyScalar(Options.COORD_SCALE));
                label.visible = true;
            } else {
                label.visible = false;
            }
        }
    }

    return line;
}

function createPlanetMesh(info: {radius: number; texture: string; name: string;}): THREE.Mesh {
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
        for (const bodyIndex in Orbits.Bodies) {
            let body = Orbits.Bodies[bodyIndex];
            if (body.parentBody && !planetsAlreadyAdded.includes(body.parentBody)) {
                continue;
            }
            if (planetsAlreadyAdded.includes(body.name)) {
                continue;
            }

            let mesh = createPlanetMesh(body);
            mesh.name = body.name;
            mesh.userData = body;

            const text = new SpriteText(body.name, 0.05, "white");
            text.material.sizeAttenuation = false;
            text.name = "label";
            mesh.add(text);

            if (body.parentBody) {
                const parent = planets.getObjectByName(body.parentBody);
                if (parent) {
                    parent.add(mesh);

                    let orbitLine = renderOrbit({
                        body: body.parentBody,
                        params: body.params
                    }, undefined, false);
                    orbitLine.name = body.name + "OrbitLine";
                    parent.add(orbitLine);
                } else {
                    throw new Error("???")
                }
            } else {
                planets.add(mesh);
            }

            if (body.parentBody) {
                mesh.position.copy(Orbits.getPositionVelocity(body.params, body.parentBody, { t: 0 }).R.multiplyScalar(Options.COORD_SCALE));
            }

            planetsAlreadyAdded.push(body.name);
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

    let mousePos = new THREE.Vector2(event.clientX / renderer.domElement.width, event.clientY / renderer.domElement.height).multiplyScalar(2).subScalar(1);

    let minIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < latestOrbitPoints.length; i++) {
        const point3d = latestOrbitPoints[i].clone();
        
        let body = scene.getObjectByName(latestOrbitingBody);
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

    //console.log({ minIndex, minDistance });
});