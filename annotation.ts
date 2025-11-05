import * as THREE from "three";
import { getCamera, getRenderer, getScene } from "./graphics";

const annotations: {[key: string]: Annotation} = {};
export function getAnnotations() {
    return annotations;
}

export function updateAnnotations() {
    for (const [key, annotation] of Object.entries(getAnnotations())) {
        annotation.update();
    }
}

// https://manu.ninja/webgl-three-js-annotations/
export class Annotation {
    htmlID: string;
    position: THREE.Vector3;
    dot?: THREE.Object3D;
    parent?: THREE.Object3D;
    offset: THREE.Vector2 = new THREE.Vector2(0, 0);

    constructor(position, element: HTMLElement, parent?: THREE.Object3D, addDot = true, offset?: THREE.Vector2) {
        this.htmlID = `annotation${Math.random()}`;
        element.id = this.htmlID;
        document.body.append(element);

        element.style.position = "absolute";

        if (addDot) {
            const geometry = new THREE.SphereGeometry(.05, 32, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const maneuverNode = new THREE.Mesh(geometry, material);
            maneuverNode.name = `${this.htmlID}dot`;

            if (parent) {
                parent.add(maneuverNode);
            } else {
                getScene().add(maneuverNode);
            }

            this.dot = maneuverNode;
        }
        
        this.parent = parent;
        this.update(position, undefined, offset);

        annotations[this.htmlID] = this;
    }

    update(position?: THREE.Vector3, newElement?: HTMLElement, offset?: THREE.Vector2) {
        if (position) {
            this.position = position;
        }

        if (this.dot && position) {
            this.dot.position.copy(position);
        }

        let positionClone = this.position.clone();
        if (this.parent) {
            positionClone.add(this.parent.position);
            this.parent.traverseAncestors((obj) => {
                positionClone.add(obj.position);
            });
        }

        const canvas = getRenderer().domElement;

        let vector = positionClone.project(getCamera());

        // let mousePos = new THREE.Vector2(event.clientX / renderer.domElement.width, event.clientY / renderer.domElement.height).multiplyScalar(2).subScalar(1).multiply(new THREE.Vector2(1, -1));

        vector.x = Math.round((0.5 + vector.x / 2) * (canvas.width));
        vector.y = Math.round((0.5 - vector.y / 2) * (canvas.height));

        if (offset) {
            vector.x += offset.x;
            vector.y += offset.y;
        }

        if (newElement) {
            document.getElementById(this.htmlID)?.remove();

            newElement.id = this.htmlID;
            document.body.append(newElement);    
        }

        const annotation = document.getElementById(this.htmlID);

        if (annotation) {
            annotation.style.top = `${vector.y}px`;
            annotation.style.left = `${vector.x}px`;
        }
    }

    destroy() {
        document.getElementById(this.htmlID)?.remove();
        getScene().getObjectByName(`${this.htmlID}dot`)?.removeFromParent();
    }
}