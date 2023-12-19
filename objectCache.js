import * as THREE from 'three';
import ThreeUtilities from './threeUtilities.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* class that handles loading, storing and cloning 3d objects that are used many times accross the scene 
Typical usage : this.sceneManager.objectCache.loadObject("plasticBin", (object) => {
    //object is a clone of the original object. It will only load it from scratch once.
});
*/
export default class ObjectCache {
    constructor() {
        this.objectLibrary = {};
    }

    addObject(name, path, scale = 1,rotateX = 0,rotateY = 0,rotateZ = 0) {
        this.objectLibrary[name] = {
            "path": path,
            "count": 0,
            "status": 0,
            "scale": scale,
            "callbacks": [],
            "rotateX": rotateX,
            "rotateY": rotateY,
            "rotateZ": rotateZ,
        }
    }

    loadObject(objectName, callBack, addOutline = true, assignMaterial = true, color = "#ccddff") {
        let element = this.objectLibrary[objectName];
        if (element == undefined) {
            console.log("object not found. add to object cache library before calling load object");
            return;
        }
        if (element.status == 0) {
            element.status = 1;
            element.callbacks.push(callBack);
            element.assignMaterial = assignMaterial;
            element.color = color;
            const loader = new GLTFLoader();

            loader.load(
                // resource URL
                element.path,
                // called when the resource is loaded
                gltf => {
                    let material = new THREE.MeshLambertMaterial({ color: color });
                    let traverseCounter = 0;
                    let traverseModulo = 1;
                    gltf.scene.traverse((child) => {
                        if (child.isMesh) {
                            traverseCounter++;
                            if (assignMaterial) child.material = material;
                            if (addOutline && traverseCounter%traverseModulo == 0) child.add(ThreeUtilities.returnObjectOutline(child))
                        }
                    });
                    gltf.scene.scale.set(element.scale, element.scale, element.scale);
                    gltf.scene.rotation.x = element.rotateX;
                    gltf.scene.rotation.y = element.rotateY;
                    gltf.scene.rotation.z = element.rotateZ;
                    element.object = gltf.scene;
                    element.status = 2;
                    this.executeCallbacks(objectName);
                }, function (xhr) {
                    //console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
                },
                // called when loading has errors
                function (error) {
                    console.log('An error happened');
                }
            );
        } else if (element.status == 1) {
            element.callbacks.push(callBack); //important because the second load call usually happens before the first one is finished loading. In this case, add new callback to list and they will all execute when the object is loaded
        } else {
            this.executeCallbacks(objectName, callBack);
        }
    }

    executeCallbacks(objectName, callback) {
        let element = this.objectLibrary[objectName];
        if (element == undefined) return;
        if (this.objectLibrary[objectName].status == 2) {
            /* execute callbacks */
            if (callback != undefined) element.callbacks.push(callback);
            element.callbacks.forEach(callback => {
                /* clone the object */
                let clonedVersion = element.object.clone();
                if (element.assignMaterial) {
                    let cloneMaterial = new THREE.MeshLambertMaterial({ color: element.color });
                    clonedVersion.traverse((child) => {
                        if (child.isMesh) {
                            child.material = cloneMaterial;
                        }
                    });
                }
                //clonedVersion.scale.set(element.scale, element.scale, element.scale);
                callback(clonedVersion);
            });
            element.callbacks = [];
        }
    }
}