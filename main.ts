// Dear Dr. Farr,
// I don't know if you're going to read this, but please know that this is some of the worst code I have ever written and I'm not proud of it.

import * as THREE from 'three';

import { getCamera, getRenderer, getScene } from "./graphics.ts";
import { getAnnotations } from "./annotation.ts";
import { recalculateOrbits } from "./mechanics.ts";

// add planets
import { updateOrbitRendering, initPlanets } from './rendering.ts';
getScene().add(initPlanets());
updateOrbitRendering(recalculateOrbits());

// init camera
import { getCameraControls, updateCamera } from './controls.ts';
getCamera().position.copy(getScene().getObjectByName("Earth")!.position.clone().add(new THREE.Vector3(0, 0, 10)));
getCameraControls().target.copy(getScene().getObjectByName("Earth")!.position);
getCameraControls().update();

function animate() {
    updateCamera();

    getRenderer().render(getScene(), getCamera());
    
    for (const [key, annotation] of Object.entries(getAnnotations())) {
        annotation.update();
    }
}

getRenderer().setAnimationLoop(animate);