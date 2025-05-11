import * as THREE from 'three';

export const Bodies: {
    [key: string]: {
        name: string;
        parentBody?: string;
        radius: number;     // equatorial radius [m]
        mu: number;         // GM [m^3/s^2]
        texture: string;
        params: OrbitParams;
    };
} = {
    "Sun": {
        name: "Sun",
        radius: 696340000,
        mu: 1.32712440018e20,
        texture: "/2k_sun.jpg",
        params: {
            a: 0,
            e: 0,
            omega: 0,
            sigma: 0,
            i: 0,
            tau: 0
        }
    },
    "Mercury": {
        name: "Mercury",
        parentBody: "Sun",
        radius: 2439700,
        mu: 2.2032e13,
        texture: "/2k_mercury.jpg",
        params: {
            a: 57909175678,
            e: 0.20563069,
            omega: 0.5083233049,
            sigma: 0.8435467745,
            i: 0.1222580452,
            tau: -9058704649
        }
    },
    "Venus": {
        name: "Venus",
        parentBody: "Sun",
        radius: 6051800,
        mu: 3.24859e14,
        texture: "/2k_venus_surface.jpg",
        params: {
            a: 108208925513,
            e: 0.00677323,
            omega: 0.9573530628,
            sigma: 1.338330513,
            i: 0.05924886665,
            tau: -1738352492
        }
    },
    "Earth": {
        name: "Earth",
        parentBody: "Sun",
        radius: 6378137,
        mu: 3.986004418e14,
        texture: "/2k_earth_daymap.jpg",
        params: {
            a: 149597887156,
            e: 0.01671022,
            omega: 1.993302665,
            sigma: -0.1965352439,
            i: 0.000000872664626,
            tau: 125610013.8
        }
    },
    "Mars": {
        name: "Mars",
        parentBody: "Sun",
        radius: 3389500,
        mu: 4.282837e13,
        texture: "/2k_mars.jpg",
        params: {
            a: 227936637242,
            e: 0.09341233,
            omega: 4.999710318,
            sigma: 0.8653087613,
            i: 0.03229923767,
            tau: -5632603987
        }
    },
    "Jupiter": {
        name: "Jupiter",
        parentBody: "Sun",
        radius: 69911000,
        mu: 1.26686534e17,
        texture: "/2k_jupiter.jpg",
        params: {
            a: 778412026775,
            e: 0.04839266,
            omega: -1.497532641,
            sigma: 1.755035901,
            i: 0.02278178273,
            tau: -661782039
        }
    },
    "Saturn": {
        name: "Saturn",
        parentBody: "Sun",
        radius: 58232000,
        mu: 3.7931187e16,
        texture: "/2k_saturn.jpg",
        params: {
            a: 1426725412588,
            e: 0.0541506,
            omega: -0.37146017,
            sigma: 1.984701857,
            i: 0.04336200713,
            tau: 6490428013
        }
    },
    "Uranus": {
        name: "Uranus",
        parentBody: "Sun",
        radius: 25362000,
        mu: 5.793939e15,
        texture: "/2k_uranus.jpg",
        params: {
            a: 2870972219970,
            e: 0.04716771,
            omega: 1.688333082,
            sigma: 1.295555809,
            i: 0.01343659178,
            tau: -158695704478
        }
    },
    "Neptune": {
        name: "Neptune",
        parentBody: "Sun",
        radius: 24622000,
        mu: 6.836529e15,
        texture: "/2k_neptune.jpg",
        params: {
            a: 4498252910764,
            e: 0.00858587,
            omega: -1.51407906,
            sigma: 2.298977187,
            i: 0.03087784153,
            tau: -524518738405
        }
    },
    "Pluto": {
        name: "Pluto",
        parentBody: "Sun",
        radius: 1188300,
        mu: 8.71e11,
        texture: "/2k_pluto.jpg",
        params: {
            a: 5906376272436,
            e: 0.24880766,
            omega: 1.985543978,
            sigma: 1.925158728,
            i: 0.2991799771,
            tau: -3997267511407
        }
    }
};

export type OrbitInfo = {
    body: string;
    params: OrbitParams;
    tstart?: number;
};

export type OrbitParams = {
    a: number; // semi-major axis
    e: number; // eccentricity
    omega: number; // argument of perihelion
    sigma: number; // longitude of ascending node
    i: number; // inclination
    tau: number; // time of perihelion passage
}

export function getOrbitalParams(R: THREE.Vector3, V: THREE.Vector3, body: string, t: number): OrbitParams {
    const mu = Bodies[body].mu;
    
    // orbital momentum vector
    const H = new THREE.Vector3().crossVectors(R, V);

    // eccentricity vector
    const evec = new THREE.Vector3().crossVectors(V, H).divideScalar(mu).sub(R.clone().normalize());

    // const vector pointing towards ascending node
    let N = new THREE.Vector3(-H.y, H.x, 0);
    // in case inclination is 0 (this causes problems)
    if (N.length() == 0) {
        N.set(1, 0, 0);
    }

    // true anomaly
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

    // argument of perihelion
    let omega = N.angleTo(evec);
    if (evec.z < 0) {
        omega = 2 * Math.PI - omega;
    }

    // mean anomaly
    const M = E - e * Math.sin(E);

    // semimajor axis
    const a = 1 / (2 / R.length() - V.lengthSq() / mu);

    // time of perihelion passage
    const tau = t - (M / (Math.sqrt(mu) / Math.sqrt(a * a * a)));

    return {a, e, omega, sigma, i, tau};
}

/*
first arg: orbit params
second arg: body name
third arg: calculate at certain time or certain mean anomaly
*/
export function getPositionVelocity(
    { a, e, omega, sigma, i, tau }: OrbitParams,
    parentBody: string,
    at: { t?: number; M?: number; v?: number; }
): { R: THREE.Vector3; V: THREE.Vector3, v: number } {
    const mu = Bodies[parentBody].mu;

    let E, M, v, r;
    if (at.v !== undefined) {
        v = at.v;
        r = a * (1 - e * e) / (1 + e * Math.cos(v));
    } else {
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
        new THREE.Euler(0, 0, -sigma)
    ];

    const R = o.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);
    const V = oprime.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);
    
    return { R, V, v };
}