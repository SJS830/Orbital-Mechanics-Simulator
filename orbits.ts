import * as THREE from 'three';

export const Bodies = {
    "Earth": {
        name: "Earth",
        radius: 6378137,
        mu: 3.986004418e14,
        texture: "/public/2k_earth_daymap.jpg"
    }
};

export type OrbitInfo = {
    body: string;
    tstart: number;
    params: OrbitParams;
};

export type OrbitParams = {
    a: number; // semi-major axis
    e: number; // eccentricity
    omega: number; // argument of periapsis
    sigma: number; // longitude of ascending node
    i: number; // inclination
    M: number; // mean anomaly
    tau: number; // time of periapsis passage
}

export function getOrbitalParams(R: THREE.Vector3, V: THREE.Vector3, body: string, t: number): OrbitParams {
    const mu = Bodies[body].mu;
    
    // orbital momentum vector
    const H = new THREE.Vector3().crossVectors(R, V);

    // eccentricity vector
    const evec = new THREE.Vector3().crossVectors(V, H).divideScalar(mu).sub(R.clone().normalize());

    // const vector pointing towards ascending node, and true anomaly
    const N = new THREE.Vector3(-H.y, H.x, 0);
    // in case inclination is 0 (this causes problems)
    if (N.x == 0) {
        N.x = .001;
    }

    let v = evec.angleTo(R);
    if (R.dot(V) >= 0) {
        v = 2 * Math.PI - v;
    }

    // inclination
    const i = Math.acos(H.z / H.length()) || 0;

    // eccentricity, eccentric anomaly
    const e = evec.length();
    const E = 2 * Math.atan(Math.tan(v / 2) / Math.sqrt((1 + e) / (1 - e)));

    // longitude of ascending node
    let sigma = Math.acos(N.x / N.length());
    if (N.y < 0) {
        sigma = 2 * Math.PI - sigma;
    }

    // argument of periapsis
    let omega = N.angleTo(evec);
    if (evec.z < 0) {
        omega = 2 * Math.PI - omega;
    }

    // mean anomaly
    const M = E - e * Math.sin(E);

    // semimajor axis
    const a = 1 / (2 / R.length() - V.lengthSq() / mu);

    // time of periapsis passage
    const tau = t - (M / (Math.sqrt(mu) / Math.sqrt(a * a * a)));

    return {a, e, omega, sigma, i, M, tau};
}

/*
first arg: orbit params
second arg: body name
third arg: calculate at certain time or certain mean anomaly
*/
export function getPositionVelocity({ a, e, omega, sigma, i, tau }: OrbitParams, body: string, at: {t?: number; M?: number; v?: number; }): { R: THREE.Vector3; V: THREE.Vector3 } {
    const mu = Bodies[body].mu;

    let E, M, v, r;
    if (at.v === undefined) {
        // new mean anomaly
        if (at.M !== undefined) {
            M = at.M;
        } else if (at.t !== undefined) {
            M = (at.t - tau) * Math.sqrt(mu / (a * a * a));
        } else {
            throw new Error("getPositionVelocity");
        }
        M = THREE.MathUtils.euclideanModulo(M, 2 * Math.PI);

        // eccentric anomaly
        let E = M;
        for (let i = 0; i < 10; i++) {
            E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        }

        // true anomaly
        v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

        // distance
        r = a * (1 - e * Math.cos(E));
    } else {
        v = at.v;
        r = a * (1 - e * e) / (1 + e * Math.cos(v));
    }

    //1 + e * Math.cos(v) = 0
    //e * Math.cos(v) = -1
    //v = Math.acos(-1 / e)

    // position and velocity in orbital plane
    const o = new THREE.Vector3(Math.cos(v), Math.sin(v), 0).multiplyScalar(r);

    const oprime = new THREE.Vector3(-Math.sin(E), Math.sqrt(1 - e^2) * Math.cos(E), 0).multiplyScalar(Math.sqrt(mu * a) / r);

    // transform to inertial frame
    const rotations = [
        new THREE.Euler(0, 0, -omega),
        new THREE.Euler(-i, 0, 0),
        new THREE.Euler(-sigma)
    ];

    const R = o.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);
    const V = oprime.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);
    
    return { R, V };
}