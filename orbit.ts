import * as THREE from 'three';

export const Bodies: {[key: string] : {name: string; parentBody?: string; radius: number; mu: number; texture: string, params: OrbitParams}} = {
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
    },
    "Moon": {
        name: "Moon",
        parentBody: "Earth",
        radius: 1737400,
        mu: 4.9003e12,
        texture: "/2k_moon.jpg",
        params: {
            a: 384400000,
            e: 0.0549,
            omega: 5.553,
            sigma: 2.183,
            i: 0.0898,
            tau: -885000
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
            //-z to fix orientation issues
            let position = new THREE.Vector3(info.position.x, -info.position.z, info.position.y);
            let velocity = new THREE.Vector3(info.velocity.x, -info.velocity.z, info.velocity.y);

            //make sure inclination isnt 0
            if (velocity.z == 0) {
                velocity.z = 0.00001;
            }

            const mu = Bodies[body].mu;

            // orbital momentum vector
            const H = new THREE.Vector3().crossVectors(position, velocity);

            // eccentricity vector
            const evec = new THREE.Vector3().crossVectors(velocity, H).divideScalar(mu).sub(position.clone().normalize());

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

            // eccentricity
            const e = evec.length();

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

            // semimajor axis
            const a = 1 / (2 / position.length() - velocity.lengthSq() / mu);

            // time of perihelion passage
            let tau;
            if (e < 1) {
                // eccentric anomaly
                const E = 2 * Math.atan(Math.tan(v / 2) / Math.sqrt((1 + e) / (1 - e)));

                // mean anomaly
                const M = E - e * Math.sin(E);

                tau = time - (M / (Math.sqrt(mu) / Math.sqrt(a * a * a)));
            } else {
                const F = 2 * Math.atanh(Math.tan(v / 2) / Math.sqrt((e + 1) / (e - 1)));
                
                const M = e * Math.sinh(F) - F;

                tau = time - M / (Math.sqrt(mu / a * a));
            }

            this.params = { a, e, omega, sigma, i, tau };
        }
    }

    getPositionVelocity(at: {t: number} | {M: number} | {v: number}) {
        const mu = Bodies[this.body].mu;
        let { a, e, omega, sigma, i, tau } = this.params;

        if (a == 0) {
            return { position: new THREE.Vector3(), velocity: new THREE.Vector3(), true_anomaly: 0 };
        }

        let v, r, V2, phi, E;

        if (e < 1) { //ellipse
            let p = a * (1 - e * e);

            if (!("v" in at)) {
                let M;

                if ("t" in at) {
                    let n = this.getN();

                    M = n * (at.t - tau);
                } else {
                    M = at.M;
                }

                E = M;
                
                for (let i = 0; i < 10; i++) {
                    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
                }

                v = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
            } else {
                v = at.v;
            }

            r = p / (1 + e * Math.cos(v));

            V2 = mu * (2 / r - 1 / a);
            phi = Math.asin(Math.sqrt(a * p / (r * (2 * a - r))));
        } else { //hyperbola
            a = Math.abs(a); //too lazy to do proper fix

            let p = a * (e * e - 1);
            let otherv = Math.sqrt(mu / (a * a * a)) //Math.sqrt(mu / (a * a));

            if (!("v" in at)) {
                let M;

                if ("t" in at) {
                    M = otherv * (at.t - tau);
                } else {
                    M = at.M;
                }
                /*M = THREE.MathUtils.euclideanModulo(M, 2 * Math.PI);
                if (M == 0) {
                    M = 2 * Math.PI;
                }*/

                E = M; //really F
                for (let i = 0; i < 20; i++) {
                    E = E - (e * Math.sinh(E) - E - M) / (e * Math.cosh(E) - 1);
                }

                r = a * (e * Math.cosh(E) - 1);

                //v = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(E / 2));

                // orbital motion page 85, precision errors
                let q = 2 * (Math.atan(Math.exp(E)) - Math.PI / 4);

                v = Math.atan2(Math.sqrt(e * e - 1) * Math.sin(q), e * Math.cos(q) - 1);
                //console.log({at, v, E, M});
            } else {
                v = at.v;
                r = p / (1 + e * Math.cos(v));
            }

            V2 = mu * (2 / r + 1 / a);
            phi = Math.PI / 2 + a * Math.acos(Math.sqrt((e * e - 1) / (r * (2 * a + r))));
        }

        //1 + e * Math.cos(v) = 0
        //e * Math.cos(v) = -1
        //v = Math.acos(-1 / e)

        // position and velocity in orbital plane
        const o = new THREE.Vector3(Math.cos(v), Math.sin(v), 0).multiplyScalar(r);

        const oprime = new THREE.Vector3(Math.cos(v + phi), Math.sin(v + phi), 0).multiplyScalar(Math.sqrt(V2));

        // transform to inertial frame
        const rotations = [
            new THREE.Euler(0, 0, -omega),
            new THREE.Euler(i, 0, 0), // should be -i, but i works, only god knows why
            new THREE.Euler(0, 0, -sigma)
        ];

        const Rprime = o.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);
        const Vprime = oprime.applyEuler(rotations[0]).applyEuler(rotations[1]).applyEuler(rotations[2]);

        // Threejs has up axis as y instead of z, im too lazy to go back and do everything the right way
        const R = new THREE.Vector3(Rprime.x, -Rprime.z, Rprime.y);
        const V = new THREE.Vector3(Vprime.x, -Vprime.z, Vprime.y);

        /*if (globals.DEBUG_PRINT) {
            console.log({ v, r, phi, V2 });
            console.log({ v, r, R, V, params: this.params, at});
            console.log({o, oprime, Rprime, Vprime});
        }*/

        return { position: R, velocity: V, true_anomaly: v };
    }

    getPointsOnOrbitCached: {[key: string]: {positions: THREE.Vector3[], velocities: THREE.Vector3[], true_anomalies: number[], SOI: number}} = {};
    getPointsOnOrbit(N: number = 2048, onlyInSphereOfInfluence = true, timerange?: {min: number; max: number;}) {
        let stringifiedArgs = JSON.stringify({ N, onlyInSphereOfInfluence, timerange });
        if (this.getPointsOnOrbitCached[stringifiedArgs]) {
            return this.getPointsOnOrbitCached[stringifiedArgs];
        }

        const positions: THREE.Vector3[] = [];
        const velocities: THREE.Vector3[] = [];
        const true_anomalies: number[] = [];

        let { body, params } = this;

        let vmin = 0; let vmax = 2 * Math.PI;
        if (timerange) {
            if (this.params.e >= 1 || timerange.max - timerange.min < this.getPeriod()) {
                vmin = this.getPositionVelocity({ t: timerange.min }).true_anomaly;
                vmax = this.getPositionVelocity({ t: timerange.max }).true_anomaly;
            }
        } else {
            if (params.e >= 1) {
                //orbital motion page 84
                vmin = -Math.PI + Math.acos(1 / params.e) + .0001;
                vmax = Math.PI - Math.acos(1 / params.e) - .0001;
            }
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

        //console.log({vmin, vmax, positions});
        this.getPointsOnOrbitCached[stringifiedArgs] = { positions, velocities, true_anomalies, SOI };
        return { positions, velocities, true_anomalies, SOI };
    }

    getN() {
        return Math.sqrt(Bodies[this.body].mu / Math.pow(this.params.a, 3));
    }

    getMu() {
        return Bodies[this.body].mu;
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

    getEscapeInfo(time: number) {      
        let rocketPos;

        function doStuff(thisRef, t) {
            let bodyPositions = getBodyPositions(t);

            rocketPos = thisRef.getPositionVelocity({ t }).position;
            let rocketVel = thisRef.getPositionVelocity({ t }).velocity;
            let rocketPosAbs = rocketPos.clone().add(bodyPositions[thisRef.body].position);
            let rocketVelAbs = rocketVel.clone().add(bodyPositions[thisRef.body].velocity);

            let [closestBody, closestBodyInfo] = Object.entries(bodyPositions).filter(x => {
                let [body, pos] = x;

                return (pos.position.clone().sub(rocketPosAbs).length() < getSOI(body));
            }).sort((a, b) => getSOI(a[0]) - getSOI(b[0]))[0];

            if (closestBody == thisRef.body) {
                return undefined;
            }

            return {
                escapeTime: t,
                escapePositionLocal: rocketPos,
                escapePositionNew: rocketPosAbs.clone().sub(closestBodyInfo.position),
                escapeVelocityLocal: rocketVel,
                escapeVelocityNew: rocketVelAbs.clone().sub(closestBodyInfo.velocity),
                newBody: closestBody,
                oldBody: thisRef.body
            };
        }

        for (let i = 0; i < 1000; i++) {
            time += 100;
            let stuff = doStuff(this, time);
            if (stuff) {
                return stuff;
            }
        }

        for (let i = 0; i < 100; i++) {
            time += 1000;
            let stuff = doStuff(this, time);
            if (stuff) {
                return stuff;
            }
        }

        for (let i = 0; i < 100; i++) {
            time += 10000;
            let stuff = doStuff(this, time);
            if (stuff) {
                return stuff;
            }
        }

        console.log({maxDist: rocketPos.length()});
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

export const BodiesOrbits = {};
for (const [name, info] of Object.entries(Bodies)) {
    BodiesOrbits[name] = new Orbit(info.parentBody || "Sun", { params: info.params });
}

export function getBodyPositions(time: number) {
    const states: { [key: string]: { position: THREE.Vector3, velocity: THREE.Vector3 } } = {};
    time = 0;

    for (let body of Object.keys(Bodies)) {
        let orbit = BodiesOrbits[body];
        states[body] = orbit.getPositionVelocity({ t: time });

        let parent = Bodies[body].parentBody;
        while (parent) {
            let parentState = BodiesOrbits[parent].getPositionVelocity({ t: time });

            states[body].position.add(parentState.position)
            states[body].velocity.add(parentState.velocity)

            parent = Bodies[parent].parentBody;
        }
    }

    return states;
}