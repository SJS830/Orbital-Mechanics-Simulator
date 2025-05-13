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
            AOP: 0,
            LAN: 0,
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
            AOP: 0.5083233049,
            LAN: 0.8435467745,
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
            AOP: 0.9573530628,
            LAN: 1.338330513,
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
            AOP: 1.993302665,
            LAN: -0.1965352439,
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
            AOP: 4.999710318,
            LAN: 0.8653087613,
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
            AOP: -1.497532641,
            LAN: 1.755035901,
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
            AOP: -0.37146017,
            LAN: 1.984701857,
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
            AOP: 1.688333082,
            LAN: 1.295555809,
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
            AOP: -1.51407906,
            LAN: 2.298977187,
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
            AOP: 1.985543978,
            LAN: 1.925158728,
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
    AOP: number; // argument of periapsis
    LAN: number; // longitude of ascending node
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

export function getMU(body: string): number {
    return Bodies[body].mu;
}

export class Orbit {
    body: string;
    params: OrbitParams;

    constructor(body: string, info: {params: OrbitParams} | {position: THREE.Vector3, velocity: THREE.Vector3, time: number}) {
        this.body = body;

        // since we're swapping y and z axes, we have to negate all cross products to preserve orientation

        if ("params" in info) {
            this.params = info.params;
        } else {
            let { time } = info;
            const position = new THREE.Vector3(info.position.x, info.position.z, info.position.y);
            const velocity = new THREE.Vector3(info.velocity.x, info.velocity.z, info.velocity.y);

            const mu = getMU(body);

            const r = position.length();
            const V2 = velocity.lengthSq();

            // angular momentum vector
            const h = new THREE.Vector3().crossVectors(position, velocity).negate();

            const p = h.lengthSq() / mu; //(4.118)

            // total energy of rocket
            // < 0 = elipse, > 0 = hyperbola
            const C = 0.5 * V2 - mu / r; //(4.110)
            const a = Math.abs(mu / (2 * C));

            // longitude of ascending node
            let LAN;
            if (h.y == 0) { //inclination = 0
                LAN = 0;
            } else {
                LAN = Math.atan(-h.x / h.y);
            }

            // inclination
            const i = Math.acos(h.z / h.length());

            // argument of periapsis plus f
            let AOPplusF;
            if (i != 0) {
                AOPplusF = Math.atan2(
                    position.z * Math.asin(1 / i),
                    (position.x * Math.cos(LAN) + position.y * Math.sin(LAN))
                );
            } else {AOPplusF
                AOPplusF = Math.atan2(
                    (position.y * Math.cos(LAN) - position.x * Math.sin(LAN)),
                    (position.x * Math.cos(LAN) + position.y * Math.sin(LAN))
                );
            }

            //eccentriciy
            let e;
            if (C < 0) { // ellipse
                e = Math.sqrt(1 - p / a);
            } else { //hyperbola
                e = Math.sqrt(1 + p / a);
            }

            const f = Math.acos((p / r - 1) / e);
            
            const AOP = AOPplusF - f;

            // tau
            let tau;
            if (C < 0) { // ellipse
                let E = Math.acos((1 - r / a) / e);

                let n = Math.sqrt(Bodies[this.body].mu / Math.pow(a, 3));

                tau = time - (E - e * Math.sin(E)) / n;
            } else { //hyperbola
                let F = Math.acosh((r / a + 1) / e);

                let v = Math.sqrt(mu) / a;
                tau = time - (e * Math.sinh(F) - F) / v;
            }

            this.params = {a, e, i, AOP, LAN, tau};
        }

        console.log(this.params);
    }

    getPositionVelocity(at: {t: number} | {M: number} | {f: number}) {
        const mu = Bodies[this.body].mu;
        let { a, e, AOP, LAN, i, tau } = this.params;

        let f, r, V2, phi;

        if (e < 1) { //ellipse
            let p = a * (1 - e * e);

            if (!("f" in at)) {
                let M;

                if ("t" in at) {
                    let n = this.getN();

                    M = n * (at.t - tau); 
                } else {
                    M = at.M;
                }

                let E = M;
                for (let i = 0; i < 10; i++) {
                    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
                }

                f = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
            } else {
                f = at.f;
            }

            r = p / (1 + e * Math.cos(f));

            V2 = mu * (2 / r - 1 / a);
            phi = Math.asin(Math.sqrt(a * p / (r * (2 * a - r))));

            // have r, f, phi, V2
        } else { //hyperbola
            let p = a * (e * e - 1);
            let v = Math.sqrt(mu) / a;

            if (!("f" in at)) {
                let M;

                if ("t" in at) {
                    M = v * (at.t - tau);
                } else {
                    M = at.M;
                }

                let F = M;
                for (let i = 0; i < 10; i++) {
                    F = F - (e * Math.sinh(F) - F - M) / (1 - e * Math.cosh(F));
                }

                f = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1) ) * Math.tanh(F / 2));
            } else {
                f = at.f;
            }

            r = p / (1 + e * Math.cos(f));
            V2 = mu * (2 / r + 1 / a);
            phi = Math.PI / 2 + a * Math.acos(Math.sqrt((e * e - 1) / (r * (2 * a + r))));
        }

        const position = new THREE.Vector3(
            Math.cos(LAN) * Math.cos(AOP + f) - Math.sin(LAN) * Math.sin(AOP + f) * Math.cos(i),
            Math.sin(AOP + f) + Math.sin(i),
            Math.sin(LAN) * Math.cos(AOP + f) + Math.cos(LAN) * Math.sin(AOP + f) * Math.cos(i)
        ).multiplyScalar(r);

        const velocity = new THREE.Vector3();

        return { position, velocity };
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
            let state = this.getPositionVelocity({ f: v });

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