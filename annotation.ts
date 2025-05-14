import { globals } from "./options";
import * as THREE from "three";

// https://manu.ninja/webgl-three-js-annotations/
export class Annotation {
    htmlID: string;
    position: THREE.Vector3;

    constructor(position, element: HTMLElement) {
        this.htmlID = `annotation${Math.random()}`;
        element.id = this.htmlID;
        document.body.append(element);

        element.style.position = "absolute";

        this.update(position);
    }

    update(position?: THREE.Vector3) {
        if (position) {
            this.position = position;
        }

        const canvas = globals.renderer!.domElement;

        let vector = this.position.clone().project(globals.camera!);

        //    let mousePos = new THREE.Vector2(event.clientX / renderer.domElement.width, event.clientY / renderer.domElement.height).multiplyScalar(2).subScalar(1).multiply(new THREE.Vector2(1, -1));

        vector.x = Math.round((0.5 + vector.x / 2) * (canvas.width));
        vector.y = Math.round((0.5 - vector.y / 2) * (canvas.height));

        const annotation = document.getElementById(this.htmlID);
        if (annotation) {
            annotation.style.top = `${vector.y}px`;
            annotation.style.left = `${vector.x}px`;
        }
    }

    destroy() {
        document.getElementById(this.htmlID)?.remove();
    }
}