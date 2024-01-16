import * as THREE from 'three';
import ThreeUtilities from './threeUtilities.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SceneEntity } from './sceneManager.js';

/* class that handles loading, storing and cloning 3d objects that are used many times accross the scene 
Typical usage : this.sceneManager.objectCache.loadObject("plasticBin", (object) => {
    //object is a clone of the original object. It will only load it from scratch once.
});
*/
export default class ObjectCache extends SceneEntity {
    constructor(sceneManager, parent) {
        super(sceneManager, parent, "objectCache");
        this.objectLibrary = {};
    }

    addObject(name, path, scale = 1, rotateX = 0, rotateY = 0, rotateZ = 0, outlineArray = []) {
        this.objectLibrary[name] = {
            "path": path,
            "count": 0,
            "status": 0,
            "scale": scale,
            "callbacks": [],
            "outlineToUse": -1,
            "rotateX": rotateX,
            "rotateY": rotateY,
            "rotateZ": rotateZ,
            "outlineArray": outlineArray,
        }

        return this;
    }

    testObjectOutline(objectName, testScale = 500) {
        /* creates a GUI slider to test outlines one by one. Can be useful to create an array of outlines to use for a given imported object */
        super.addGUI();
        let element = this.objectLibrary[objectName];
        element.outlineToUse = 0;
        document.addEventListener('keydown', event => {
            if (event.key === 'ArrowRight') {
                element.outlineToUse++;
                console.log(element.outlineToUse)
                this.drawSingleOutline(objectName, testScale);
            } else if (event.key === 'ArrowLeft') {
                element.outlineToUse--;
                console.log(element.outlineToUse)
                this.drawSingleOutline(objectName, testScale);
            }
        });

        this.guiFolder.add(element, 'outlineToUse', 0, 200).step(1).onChange(() => {
            this.drawSingleOutline(objectName, testScale);
        });
    }

    drawSingleOutline(objectName, testScale = 500) {
        let element = this.objectLibrary[objectName];

        if (element.testObject) {
            //console.log("dispose")
            ThreeUtilities.disposeHierarchy(element.testObject);
        }
        const loader = new GLTFLoader();
        loader.load(
            // resource URL
            element.path,
            // called when the resource is loaded
            gltf => {
                let traverseCounter = 0;
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        traverseCounter++;
                        if (traverseCounter == element.outlineToUse) child.add(ThreeUtilities.returnObjectOutline(child))
                    }
                });
                gltf.scene.scale.set(testScale, testScale, testScale);
                gltf.scene.position.set(-50, 0, 0);
                element.testObject = gltf.scene;
                this.object.add(element.testObject);
            }, function (xhr) {
                //console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // called when loading has errors
            function (error) {
                console.log('An error happened');
            }
        );
    }

    loadObject(objectName, callBack, addOutline = true, material = undefined, changeMetalness = false) {
        let element = this.objectLibrary[objectName];
        if (element == undefined) {
            console.log("object not found. add to object cache library before calling load object");
            return;
        } 
        element.callbacks.push({
            call: callBack,
            material: material
        });
        if (element.status == 0) {
            /* first time the object is called. needs to be loaded. */
            element.status = 1;
            //element.color = color;
            const loader = new GLTFLoader();

            loader.load(
                // resource URL
                element.path,
                // called when the resource is loaded
                gltf => {
                    //let material = new THREE.MeshLambertMaterial({ color: color });
                    let traverseCounter = 0;
                    let useModulo = false;
                    let traverseModulo = 3;
                    let useMax = false;
                    let traverseMax = 100;
                    let traverseMin = 10;
                    let useOutlineArray = true;
                    gltf.scene.traverse((child) => {
                        if (child.isMesh) {
                            traverseCounter++;
                            //if (assignMaterial) child.material = material;
                            if (addOutline && (!useModulo || traverseCounter % traverseModulo == 0) && (!useMax || (traverseCounter < traverseMax && traverseCounter > traverseMin)) && (!useOutlineArray || (element.outlineArray.includes(traverseCounter) || element.outlineArray.length == 0))) {
                                child.add(ThreeUtilities.returnObjectOutline(child))
                            }
                            if (changeMetalness) child.material.metalness = 0;
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
            /* object is loading. add callback to list */
            //element.callbacks.push(callBack); //important because the second load call usually happens before the first one is finished loading. In this case, add new callback to list and they will all execute when the object is loaded
        } else {
            /* object is loaded. execute callback */
            this.executeCallbacks(objectName);
        }
    }

    executeCallbacks(objectName) {
        let element = this.objectLibrary[objectName];
        if (element == undefined) return;
        if (this.objectLibrary[objectName].status == 2) {
            /* execute callbacks */
            //if (callback != undefined) element.callbacks.push(callback);
            element.callbacks.forEach(callback => {
                /* clone the object */
                let clonedVersion = element.object.clone();
                if (callback.material != undefined) {
                    clonedVersion.traverse((child) => {
                        if (child.isMesh) {
                            child.material = callback.material;
                        }
                    });
                }
                callback.call(clonedVersion);
            });
            element.callbacks = [];
        }
    }
}