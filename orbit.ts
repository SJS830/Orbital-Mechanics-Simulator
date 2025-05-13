import * as THREE from 'three';
import { transformWithEsbuild } from "vite";

export const Bodies = {
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
            tau: -3.690328e6
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
            tau: -2.716721e6
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
            tau: 2.167966e5
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
            tau: -3.196961e6
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
            tau: -2.045224e7
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
            tau: 1.100834e8
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
            tau: -1.047917e9
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
            tau: 1.445777e9
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
} as const;

export type BodyInfo = {
    name: string;
    parentBody?: string;
    params?: OrbitParams
    radius: number;
    mu: number;
}

export type OrbitParams = {
    a: number; // semi-major axis
    e: number; // eccentricity
    omega: number; // argument of perihelion
    sigma: number; // longitude of ascending node
    i: number; // inclination
    tau: number; // time of perihelion passage
}

export function getSOI(body: string) {
    let SOI = Infinity;
    
    if (Bodies[body].parentBody) {
        SOI = Math.pow(Bodies[body].mu / Bodies[Bodies[body].parentBody].mu, 2 / 5) * Bodies[body].params.a;
    }

    return SOI;
}

export class Orbit {
    body: string;
    params: OrbitParams;

    constructor(body: string, info: {params: OrbitParams} | {position: THREE.Vector3, velocity: THREE.Vector3, time: number}) {
        this.body = body;

        if ("params" in info) {
            this.params = info.params;
        } else {
            let time = info.time;

            //axes fix
            //threejs: up y
            //here: up z
            let position = new THREE.Vector3(info.position.x, info.position.z, info.position.y);
            let velocity = new THREE.Vector3(info.velocity.x, info.velocity.z, info.velocity.y);

            //make sure inclination isnt 0
            if (velocity.z == 0) {
                velocity.z = 0.00001;
            }

            const mu = Bodies[body].mu;

            // orbital momentum vector
            // negate to preserve orientation
            const H = new THREE.Vector3().crossVectors(position, velocity).negate();

            // eccentricity vector
            const evec = new THREE.Vector3().crossVectors(velocity, H).negate().divideScalar(mu).sub(position.clone().normalize());

            // const vector pointing towards ascending node
            let N = new THREE.Vector3(-H.y, H.x, 0);

            // true anomaly
            let v = evec.angleTo(position);
            if (position.dot(velocity) >= 0) {
                v = 2 * Math.PI - v;
            }
            //console.log({v});

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
            const a = 1 / (2 / position.length() - velocity.lengthSq() / mu);

            // time of perihelion passage
            const tau = time - (M / (Math.sqrt(mu) / Math.sqrt(a * a * a)));

            this.params = { a, e, omega, sigma, i, tau };
        }
    }

    getPositionVelocity(at: {t: number} | {M: number} | {v: number}) {
        const mu = Bodies[this.body].mu;
        let { a, e, omega, sigma, i, tau } = this.params;

        let E, M, v, r;
        if ("v" in at) {
            v = THREE.MathUtils.euclideanModulo(at.v, 2 * Math.PI) - Math.PI;

            if (e < 1) {
                r = a * (1 - e * e) / (1 + e * Math.cos(v));
                E = 2 * Math.atan(Math.tan(v / 2) / Math.sqrt((1 + e) / (1 - e)));
            } else {
                let vmin = -Math.PI + Math.acos(1 / e);
                let vmax = Math.PI - Math.acos(1 / e);
                if (!(vmin < v && v < vmax)) {
                    //console.error("v out of range");
                }

                r = a * (e * e - 1) / (1 + e * Math.cos(v));
                E = 2 * Math.atanh(Math.tan(v / 2) / Math.sqrt((e + 1) / (e - 1)));
            }
            /*if (E == undefined) {
                console.error("E undefined", this, at);
            }*/
        } else {
            // new mean anomaly
            if ("M" in at) {
                M = at.M;
            } else {
                M = (at.t - tau) * Math.sqrt(mu / (a * a * a));
            }
            console.log({M});
            M = THREE.MathUtils.euclideanModulo(M, 2 * Math.PI);

            // eccentric anomaly
            E = M;
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

        const oprime = new THREE.Vector3(-Math.sin(E), Math.sqrt(1 - e * e) * Math.cos(E), 0).multiplyScalar(Math.sqrt(mu * a) / r);

        // transform to inertial frame
        const rotations = [
            new THREE.Euler(0, 0, -omega),
            new THREE.Euler(-i, 0, 0),
            new THREE.Euler(0, 0, -sigma)
        ];

        const Rprime = o.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);
        const Vprime = oprime.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);

        // Threejs has up axis as y instead of z, im too lazy to go back and do everything the right way
        const R = new THREE.Vector3(Rprime.x, Rprime.z, Rprime.y);
        const V = new THREE.Vector3(Vprime.x, Vprime.z, Vprime.y);

        return { position: R, velocity: V, true_anomaly: v };
    }

    getPointsOnOrbit(N: number = 2048, onlyInSphereOfInfluence = true) {
        const positions: THREE.Vector3[] = [];
        const velocities: THREE.Vector3[] = [];
        const true_anomalies: number[] = [];

        let { body, params } = this;

        let vmin = 0; let vmax = 2 * Math.PI;
        if (params.e >= 1) {
            //orbital motion page 84
            vmin = -Math.PI + Math.acos(1 / params.e) + .01;
            vmax = Math.PI - Math.acos(1 / params.e) - .01;
        }

        let SOI = getSOI(body);

        for (let v = vmin; v <= vmax + .0001 /* floating point error */; v += (vmax - vmin) / N) {
            let state = this.getPositionVelocity({ v });

            if (state.position.length() < SOI) {
                positions.push(state.position);
                velocities.push(state.velocity);
                true_anomalies.push(state.true_anomaly);
            }
        }

        return { positions, velocities, true_anomalies, SOI };
    }

    getN() {
        return Math.sqrt(Bodies[this.body].mu / Math.pow(this.params.a, 3));
    }

    getPeriod() {
        return (2 * Math.PI) / this.getN();
    }

    getMaxR() {
        let { e, a } = this.params;
        
        if (e >= 1) {
            return Infinity;
        } else {
            return a * (1 - e * e) / (1 - e);
        }
    }

    getEscapeInfo() {
        let SOI = getSOI(this.body);

        if (this.getMaxR() < SOI) {
            return undefined;
        }

        let { positions, velocities, true_anomalies } = this.getPointsOnOrbit();
        let { e, tau } = this.params;

        let i = 0;
        while (true_anomalies[i] < 0) {
            i++;
        }

        while (i < positions.length && positions[i].length() < SOI) {
            i++;
        }
        i = Math.min(i, positions.length - 1);

        /*let E = 2 * Math.atan(Math.tan(true_anomalies[i] / 2) / Math.sqrt((1 + e) / (1 - e)));
        let M = E - e * Math.sin(E);*/
        // orbital motion page 85
        let F = 2 * Math.atanh(Math.tan(true_anomalies[i] / 2) / Math.sqrt((e + 1) / (e - 1)));
        let M = e * Math.sinh(F) - F;
        let t = tau + M / this.getN();

        console.log({ M, t, v: true_anomalies[i] });

        console.log(velocities);
        return { position: positions[i], velocity: velocities[i], /*mean_anomaly: M,*/ time: t };
    }

    getMeanAnomaly(t: number, mod: boolean = true) {
        let { tau, a } = this.params;
        let n = Math.sqrt(Bodies[this.body].mu / Math.pow(a, 3));

        if (mod) {
            return THREE.MathUtils.euclideanModulo(n * (t - tau), 2 * Math.PI);
        } else {
            return n * (t - tau);
        }
    }
}