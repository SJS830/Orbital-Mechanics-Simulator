import * as THREE from 'three';
import * as Orbits from './orbits';
import * as Options from './options';

export function renderOrbit(info: Orbits.OrbitInfo, line?: THREE.Line): THREE.Line {
    const material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });

    const points: THREE.Vector3[] = [];
    let vmin = 0; let vmax = 2 * Math.PI;
    if (info.params.e >= 1) {
        //orbital motion page 84
        vmin = -Math.PI + Math.acos(1 / info.params.e);
        vmax = Math.PI - Math.acos(1 / info.params.e);
    }
    console.log(vmin, vmax);
    for (let v = vmin; v < vmax; v += (vmax - vmin) / 1024) {
        points.push(Orbits.getPositionVelocity(info.params, info.body, { v }).R.multiplyScalar(Options.COORD_SCALE));
    }

    const geometry = line?.geometry || new THREE.BufferGeometry();
    geometry.setFromPoints(points);

    //geometry.update();

    if (!line) {
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        line = new THREE.Line(geometry, material);
        line.name = "orbitLine";
    }

    return line;
}

export function createPlanet(info: {radius: number; texture: string; name: string;}): THREE.Mesh {
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