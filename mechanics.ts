import { Orbit, Bodies, BodiesOrbits, getBodyPositions } from './orbit.ts';
import { COORD_SCALE } from './options.ts';
import * as Rendering from './rendering.ts';
import { Annotation } from "./annotation.ts";
import * as THREE from "three";

const initialState = new Orbit("Earth", { position: new THREE.Vector3(1e7, 0, 0), velocity: new THREE.Vector3(0, 0, 6315), time: 0 });

// time: time in orbit before maneuver (max 1 period)
// orbits: + how many full orbits
const maneuversList: { time: number; orbits: number; prograde: number; normal: number; radialout: number; }[] = [];
export function getManeuvers() {
    return maneuversList;
}

export let statesList: { tstart: number, orbit: Orbit, cause?: { type: "maneuver"; maneuverNumber: number; maneuverPosition: THREE.Vector3 } | { type: "escape"; escapeInfo: { escapeTime: number; newBody: string; oldBody: string; escapePosition: THREE.Vector3 } } }[] = [{ tstart: 0, orbit: initialState }];

export function getStatesList() {
    return statesList;
}

export function getStateAtTime(time) {
    let i = 0;
    while (i + 1 < statesList.length && statesList[i + 1].tstart < time) {
        i++;
    }

    return statesList[i];
}

export function recalculateOrbits() {
    statesList = [{ tstart: 0, orbit: initialState }];

    function calculateProgression() {
        for (let k = 0; k < 5; k++) {
            let state = statesList[statesList.length - 1]
            let escapeInfo = state.orbit.getEscapeInfo(state.tstart);

            //todo: make orbit time adding impossible if on escape traj
            if (escapeInfo !== undefined) {
                statesList.push({
                    tstart: escapeInfo.escapeTime,
                    orbit: escapeInfo.newOrbit,
                    cause: {
                        type: "escape",
                        escapeInfo: {
                            escapeTime: escapeInfo.escapeTime,
                            oldBody: escapeInfo.oldBody,
                            newBody: escapeInfo.newBody,
                            escapePosition: escapeInfo.escapePositionLocal
                        }
                    }
                });

                continue;
            } else {
                break;
            }
        }
    }

    calculateProgression();

    for (let i = 0; i < maneuversList.length; i++) {
        let maneuver = maneuversList[i];
        let maneuverTimeAbs = 0;

        for (let j = 0; j <= i; j++) {
            maneuverTimeAbs += maneuversList[j].time; /* + orbits whatever*/;
        }

        statesList = statesList.filter(({ tstart }) => tstart < maneuverTimeAbs);
        let state = statesList[statesList.length - 1];

        let { orbit } = state;

        let { position, velocity } = orbit.getPositionVelocity({ t: maneuverTimeAbs });

        let cartesianManeuver = velocity.clone().normalize().multiplyScalar(maneuver.prograde);
        cartesianManeuver.add(position.clone().normalize().multiplyScalar(maneuver.radialout));
        cartesianManeuver.add(position.clone().cross(velocity).normalize().multiplyScalar(maneuver.normal));

        statesList.push({
            tstart: maneuverTimeAbs,
            orbit: new Orbit(orbit.body, {
                    position, velocity: velocity.add(cartesianManeuver).negate(), /* no idea why but need to negate to make orientation right */
                    time: maneuverTimeAbs
                }
            ),
            cause: {
                type: "maneuver",
                maneuverNumber: i,
                maneuverPosition: position.clone()
            }
        });

        calculateProgression();
    }

    return statesList;
}