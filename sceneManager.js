import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
//import ObjectCache from './objectCache.js';
import ThreeUtilities from './threeUtilities.js';


/* All classes that participate in the scene and need to interact with it will extend from this. */
export class SceneEntity {
    constructor(sceneManager, parent, type) {
        this.type = type; //string

        /* link scene manager */
        this.sceneManager = sceneManager;
        if (this.sceneManager != undefined) {
            this.sceneManager.addEntity(this);
        }

        /* create main object. Assumption is that most scene entities will also contain scene objects */
        this.object = new THREE.Group();
        // if (this.sceneManager && this.sceneManager.outlinePass != undefined) this.sceneManager.outlinePass.selectedObjects.push(this.object);

        /* set-up parent */
        this.parent = parent;
        if (this.parent != undefined) {
            this.parent.object.add(this.object);
            this.layer = this.parent.layer;
        }

        /* set-up opacity. Members should take care of updating their materials (using the super function below) */
        this.opacity = 1;

        /* set up clickability */
        this.clickable = false;
        this.selected = false;
        this.clickableObject = undefined;
        this.temporary = false;

        /* handle visibility */
        this.visible = true;

        /* handle generic callbacks */
        this._onUpdate = [];

    }

    /* to be filled by sub classes. They should send the update type with the callback */
    onUpdate(callback) {
        this._onUpdate.push(callback);
        return this;
    }

    callAllUpdates(updateType, entity = this) {
        this._onUpdate.forEach((callback) => {
            callback.call(this, updateType, entity);
        });
    }

    makeClickable(object, forceClickNonVisible) {
        if (this.temporary) return this; //don't make temporary objects clickable
        if (!forceClickNonVisible && !this.visible) return this; //don't make clickable if not visible
        this.clickable = true;
        if (object != undefined) { this.clickableObject = object };
        this.hovered = false; //currently being hovered.
        this.wasHovered = false; //used by sceneManager
        //Maybe should update array of clickeable objects at this point
        if (this.clickableObject != undefined) {
            this.clickableObject.userData.sceneID = this.sceneID;
            this.sceneManager.updateClickableObjects();
        }
        return this;
    }

    getRayCastOnObject(event) {
        this.sceneManager.updatePointer(event);
        this.raycaster.setFromCamera(this.sceneManager.pointer, this.sceneManager.camera);
        const intersects = this.raycaster.intersectObject(this.clickableObject);
        if (intersects.length > 0) {
            return intersects[0].point;
        } else {
            return undefined;
        }
    }

    /* for items that we don't want to appear/interact with but not quite delete yet */
    switchInactive(inactive = false) {
        this.inactive = inactive;
        if (inactive) {
            this.switchVisibility(false);
            //this.storeClickObject = this.clickableObject;
            this.removeClickable();
        } else {
            this.switchVisibility(true);
            //this.makeClickable(this.storeClickObject);
            this.makeClickable();
        }
    }

    removeClickable() {
        this.clickable = false;
        //this.clickableObject = undefined; //doesn't cost much to store the object
        this.sceneManager.updateClickableObjects();
        return this;
    }

    findAncestorWithType(type) {
        let ancestor = this.parent;
        let maxDepth = 100;
        let counter = 0;
        while (ancestor.type != type) {
            if (ancestor.type == "sceneManager" || counter++ > maxDepth) {
                console.log("no ancestor found");
                return;
            }
            counter += 1;
            ancestor = ancestor.parent;
        }
        return ancestor;
    }

    hoveredIn() {
        return this;
    }; //extended class need to overwrite this

    justClicked() {
        return this;
    }; //extended class need to overwrite this

    hoveredOut() {
        return this;
    }; //extended class need to overwrite this

    switchSelection(selected = undefined) {
        if (selected == undefined) this.selected = !this.selected;
        else if (selected == this.selected) return false;
        else this.selected = selected
        return true;
    }

    setOpacity(opacity = this.opacity, object = this.object) {
        this.opacity = opacity;
        //console.log("setting opacity: " + opacity);
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // if (opacity == 1) child.material.transparent = false;
                // else {
                // console.log("setting Opacity in loop to: " + opacity)
                //child.material.transparent = true;
                // if (opacity < 1) child.material.transparent = true;
                child.material.opacity = opacity;
                // }
            }
        });
        return this;
    }


    switchVisibility(show = true) {
        this.visible = show;
        this.object.visible = show;
        if (!show && this.clickable) {
            this.wasClickable = true;
            this.removeClickable();
        } else if (show && this.wasClickable) {
            this.makeClickable();
        }
    }

    updateParentObject(newParentObject) {
        this.object.parent.remove(this.object);
        newParentObject.add(this.object);
        return this;
    }

    returnLocalPoint(point) {
        /*find world position of the object.*/
        let worldPosition = new THREE.Vector3();
        this.object.getWorldPosition(worldPosition);//get origin of object
        return point.clone().sub(worldPosition);
    }

    addGUI(name = this.type) {
        this.guiFolder = this.sceneManager.gui.addFolder(name);
        this.guiFolder.open();
        return this;
    }

    closeGUI() {
        this.guiFolder.close();
        return this;
    }

    openGUI() {
        this.guiFolder.open();
        return this;
    }

    removeGUI() {
        if (this.guiFolder != undefined) this.guiFolder.destroy();
        return this;
    }

    /* useful for drawing objects. */
    switchTemporary(temporary = true) {
        this.temporary = temporary;
        return this;
    }

    /* called by scene manager when delete commmand is sent */
    deleteTrigger() {
        /* descendant need to override this function to do something about the trigger */
    }

    deleteEntity(noCallback = false) {
        /* handle generic delete callbacks */
        if (!noCallback) this.callAllUpdates("delete");

        /* delete all scene content */
        ThreeUtilities.disposeHierarchy(this.object, ThreeUtilities.disposeNode);

        /* deselect the entity */
        this.selected = false;
        //this.switchSelection(false);

        //console.log("delete entity: " + this.type + this.sceneID);

        //remove from scene Manager entity array, if they are the same
        if (this.sceneManager.sceneEntities[this.sceneID] == this) delete this.sceneManager.sceneEntities[this.sceneID];

        //this.clickableObject = undefined;
        //this.clickable = false;
        //this.deleted = true; //sceneID will still be used but that's ok
        //this.sceneManager.lastId = this.sceneID; //will be used by next entity
        this.sceneManager.updateClickableObjects();

        /* delete gui */
        this.removeGUI();
    }

}


/**
 * class that manages high level scene information (camera, etc), all the entity in the scene and all user interactions
 * 
 * 
 */

export default class SceneManager extends SceneEntity {
    constructor() {
        super(undefined, undefined, "sceneManager")

        this.setDefaults(); // important to call first. Next functions use some of the defaults.

        /* initialize entity management */
        this.sceneEntities = [];
        this.lastId = 0;
        this.activeModifier = undefined;
        this.allowInteractions = true;
        this.clickableObjects = [];
        this.clickableEntities = [];
        this.allowHover = true;

        /* handle camera modes. Will allow user to cycle through different camera projections */
        this.cameraMode = 0;
        this.cameraPerspective = true;

        /* keeps track of all the keys pressed. */
        this.keysDown = {};

        /* timer callbacks to help with animations */
        this.timerCallbacks = {}; //should it be an array?
        this.boundAnimate = this.animate.bind(this);

        /* set-up display div */
        this.setUpDisplayDiv();

        /* initializing all three scene items */
        this.initializeThreeScene();

        /* provides axis for everyone in the scene to use */
        this.origin = new THREE.Vector3(0, 0, 0);
        this.xAxis = new THREE.Vector3(1, 0, 0);
        this.yAxis = new THREE.Vector3(0, 1, 0);
        this.zAxis = new THREE.Vector3(0, 0, 1);

    }

    setDefaults() {
        /* make defaults used throughout the scene */
        this.defaults = {
            drawing: {
                planeSize: 1000,
                segments: 6,
                lineRadius: 2,
                pointRadius: 3,
                pointColor: "#000066", // darkblue
                lineColor: "#6699ff", // blue
                planeColor: "#ffffff",
                snapDistance: 10,
                distanceThresholdMark: 10,
                minMarkLength: 10,
                offsetMarksEnabled: false,
                surfaceDepth: 1,
                surfaceColor: "#99ccff",
            },
            camera: {
                perspectiveCameraAngle: 45,
                perspectiveCameraNearFrustum: 0.1,
                perspectiveCameraFarFrustum: 10000,
                perspectiveCameraPosition: new THREE.Vector3(100, -100, 100),
                orthographicCameraNearFrustum: 0.05,
                orthographicCameraFarFrustum: 10000,
                orthographicCameraViewWidth: 1000, //should eventually be set by the scene
                orthographicCameraDistance: 1000, //should eventually be set-up by the scene
                controlsTarget: new THREE.Vector3(),

            },
            base: {
                planeSize: 200,
                largePlaneSize: 4000,
                planeColor: 0x777777,
                planeMaterial: new THREE.MeshStandardMaterial({ color: 0x777777, flatShading: true, side: THREE.DoubleSide })
            },
            buildingTree: {
                start: new THREE.Vector3(0, 0, 0),
                height: 500,
                radius: 20,
                thickness: 5, //seems big but better visible and we only care about relative alignement
                color: "#ff0000",
                //treeMaterial: new THREE.MeshStandardMaterial({ color: "#ff0000", side: THREE.DoubleSide })
            },
            modifier: {
                clickRadius: 10,
                cylinderRadius: 0.1, //as a multiplier of clickRadius
                cylinderLength: 0.8,
                arrowRadius: 0.3,
                arrowLength: 0.2,
                torusRadius: 10,
                torusHeight: 1, //diameter of cross section
                torusSegments: 32,
                segments: 6,
                color: "#ff0000"
            },
            selection: {
                colorHovered: "#ff33cc",
                colorSelected: "#ff0000",
            },
            wood: {
                color: "#cfbc86",
                anchorBoltColor: "#808080",
                // material: new THREE.MeshLambertMaterial({ color: "#cfbc86" }),
                // materialHovered: new THREE.MeshBasicMaterial({ color: "#ff33cc" }),
                // materialSelected: new THREE.MeshBasicMaterial({ color: "#ff0000" }),
            },
            foundation: {
                concreteColor: "#e6e6e6",
                rebarColor: "#333300",
            },
            studCanvas: {
                lineWidth: 1,
                surroundingStrokeStyle: 'black',
                surroundingFillStyle: '#cfbc86',
                markStrokeStyle: 'black',
                markFillStyle: '#786122',
                cutStrokeStyle: 'red',
                cutFillStyle: '#ffcccc',
                anchorStrokeStyle: 'red',
                anchorFillStyle: 'pink',
                dimensionStrokeStyle: 'black',
                dimensionLineWith: 1,
                dimensionFillStyle: 'black',
            }
        }
    }

    pushTimerCallback(callback, id) {
        this.timerCallbacks[id] = callback;
    }

    removeTimerCallback(id) {
        delete this.timerCallbacks[id];
    }

    switchInteractions(allow = true) {
        this.allowInteractions = allow;
        this.controls.enabled = allow;

        /* deselect everything when new mode disables interaction */
        if (!allow) {
            this.sceneEntities.forEach((entity) => {
                entity.switchSelection(false);
            });
        }
    }

    addPointLight(intensity, x, y, z, addObject, color = 0xffffff, helper = false) {
        let pointLight = new THREE.PointLight(0xffffff, intensity);
        pointLight.position.set(x, y, z);
        const sphereSize = 1;

        if (addObject != undefined) {
            addObject.add(pointLight);
            if (helper) {
                const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
                addObject.add(pointLightHelper);
            }
        } else {
            this.scene.add(pointLight);
            if (helper) {
                const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
                this.scene.add(pointLightHelper);
            }
        }

        return pointLight;
    }

    setAmbientLight(intensity, color = 0xffffff) {
        this.ambientLight.intensity = intensity;
        this.ambientLight.color.setHex(color);
    }

    /* initilizes all the standard components that are parts of most three.js scenes. */
    initializeThreeScene() {
        /* initialize basic scene elements */
        this.scene = new THREE.Scene();
        this.object = new THREE.Group();
        this.scene.add(this.object);

        /* initialize renderer */
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setClearColor("#87CEEB");
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);

        /* initialize camera and orbit controls*/
        this.updateCameraMode();

        /* initialize raycast+pointer */
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2(); //mouse pointer position in screen coordinates

        /* initialize lights */
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(this.ambientLight);

        /* display utilities */
        this.showAxes = true;
        this.showTestCube = false;
        this.updateAxes();
        //this.updateTestCube = this.updateTestCube.bind(this);


        /* initialize GUI */
        this.gui = new GUI();
        this.displayFolder = this.gui.addFolder('display');
        this.displayFolder.add(this, 'showAxes').onChange((value) => this.updateAxes());
        this.displayFolder.add(this, "showAllEntities");
        if (false) {
            const guiContainer = this.gui.domElement;

            // Function to stop event propagation
            const stopPropagation = (event) => {
                console.log("event")
                event.stopPropagation();
            };

            // Add event listeners to the GUI container
            guiContainer.addEventListener('mousedown', stopPropagation);
            guiContainer.addEventListener('mouseup', stopPropagation);
            guiContainer.addEventListener('click', stopPropagation);
        }
        //this.displayFolder.add(this, 'loadBuilding');

        /* initialize event listeners for user interaction */
        this.initializeEventListeners();

        /* start animation */
        ; //necessary to make sure that animate is called with the correct this
        this.boundAnimate();

    }

    findBestId() {
        /* new scene entities need to be assigned the first available id */
        let i = 0;  // Start from 1 as we are looking for positive integer keys
        while (this.sceneEntities.hasOwnProperty(i)) {
            i++;
        }
        return i;
    }

    addEntity(entity) {
        let id = this.findBestId();
        //console.log("adding entity : " + entity.type + id)
        this.sceneEntities[id] = entity;
        entity.sceneID = id;
    }

    animate() {
        //console.log(this.allowInteractions)
        requestAnimationFrame(this.boundAnimate);

        /* handle timer callbacks for animations */
        this.newTime = Date.now();
        this.timeOffset = (this.oldTime == undefined) ? 0 : this.newTime - this.oldTime;
        this.oldTime = this.newTime;
        Object.keys(this.timerCallbacks).forEach((key) => {
            this.timerCallbacks[key].call(this, this.timeOffset);
        });

        this.renderer.render(this.scene, this.camera);
    }


    updateCamera(cameraPosition, cameraTarget) {
        this.camera.position.set(cameraPosition);
        this.camera.lookAt(cameraTarget);
        this.controls.target.copy(cameraTarget);

    }

    updateAxes(axeSize = 200) {
        if (this.axes == undefined) {
            this.axes = new THREE.AxesHelper(axeSize);
            this.object.add(this.axes);
        }
        this.axes.visible = this.showAxes;
    }

    updateTestCube() {
        if (this.testCube == undefined) {
            let geometry = new THREE.BoxGeometry(1, 2, 3);
            this.testCube = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
            this.object.add(this.testCube);
        }
        this.testCube.visible = this.showTestCube;
    }


    updateClickableObjects() {
        this.clickableEntities = [];
        this.clickableObjects = [];
        this.clickableBoxes = [];

        Object.keys(this.sceneEntities).forEach((key) => {
            let entity = this.sceneEntities[key];
            if (entity.clickable && entity.clickableObject != undefined) {
                this.clickableEntities.push(this.sceneEntities[key]);
                this.clickableObjects.push(this.sceneEntities[key].clickableObject);
            }
        }
        );
    }


    updatePointer(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    onPointerUp(event) {
        this.clicking = false;
        if (this.allowInteractions == false) return;
    }

    onPointerMove(event) {
        if (!this.allowHover || this.allowInteractions == false || this.clicking || this.currentlyDrawing) return;

        this.updatePointer(event);

        /* check what has been clicked */
        this.raycaster.setFromCamera(this.pointer, this.camera);
        //this.clicking = true;

        const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);


        /* hover is not efficient. we need to warn all the ones that lost their hover. I think the best way is to make two passes. Expensive?*/

        for (let i = 0; i < intersects.length; i += 1) {
            let object = intersects[i].object;
            if (object.userData.sceneID) {
                let entity = this.sceneEntities[object.userData.sceneID];
                entity.hovered = true;
                if (!entity.wasHovered) {
                    entity.wasHovered = true;
                    entity.hoveredIn(intersects[i])
                }
                break;//don't allow two objects hovered at the same time.
            }
        }

        this.clickableEntities.forEach((entity) => {
            if (!entity.hovered && entity.wasHovered) {
                entity.hoveredOut();
                entity.wasHovered = false;
            }
            entity.hovered = false;
        });
    }

    onPointerDown(event) {
        if (this.allowInteractions == false || event.button != 0) return; //only react to left click

        this.updatePointer(event);

        /* check what has been clicked */
        this.raycaster.setFromCamera(this.pointer, this.camera);
        this.clicking = true;

        const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

        for (let i = 0; i < intersects.length; i += 1) {
            let object = intersects[i].object;
            //find id
            if (object.userData.sceneID) {
                if (this.sceneEntities[object.userData.sceneID].justClicked(intersects[i])) {
                    return; //cancels all future clicks.
                }
            }
        }
    }

    showAllEntities() {
        this.sceneEntities.forEach((entity) => {
            entity.switchVisibility(true);
        });
    }

    onKeyDown(event) {
        if (this._onKeyDownCallBack != undefined) {
            this._onKeyDownCallBack.forEach((callback) => {
                callback.call(this, event);
            });
        }
        //console.log(event.key);
        this.keysDown[event.key] = true;
        if (!this.allowInteractions) return;
        if (event.key === 'n') {
            //console.log("press n")
            this.cameraMode = (this.cameraMode + 1) % 4;
            this.updateCameraMode();
        } else if (event.key === ' ') {
            //deselect everything
            this.sceneEntities.forEach((entity) => {
                entity.switchSelection(false);
            });
            this.switchStudCanvasVisibility(false);
        } else if (event.key == 'Backspace') {
            //delete selected entities
            this.clickableEntities.forEach((entity) => {
                entity.deleteTrigger();
                //if (entity.selected) entity.deleteEntity();
            });
        } else if (event.key == 'm') {
            //modifier mode. full object can be clicked
            this.modifierMode = true;
        } else if (event.key == 'y') {
            /* hide all the selected objects */
            this.sceneEntities.forEach((entity) => {
                if (entity.selected && entity.type != "wall" && entity.type != "opening" && entity.type != "memberSet") {
                    entity.switchSelection(false);
                    entity.switchVisibility(false);
                }
            });
        }
    }

    onKeyDownCallBack(callback) {
        this._onKeyDownCallBack.push(callback);
        return this;
    }

    onKeyUp(event) {
        this.keysDown[event.key] = false;
        this.modifierMode = false;
    }

    switchControls(enabled = true) {
        this.controls.enabled = enabled;
    }


    /* cycles through different standard camera positions */
    updateCameraMode() {
        let defaults = this.defaults.camera;
        if (!this.camera) this.updateCamera();
        if (this.cameraMode == 0) {
            //normal perspective mode
            this.renderer.setClearColor("#87CEEB") // sets renderer background color
            this.cameraPerspective = true;
            this.camera.position.copy(defaults.perspectiveCameraPosition); //find nice perspective position
            this.controls.target.copy(defaults.controlsTarget);
            this.updateCamera();

        } else if (this.cameraMode == 1) {
            //orthogonal view from top
            this.cameraPerspective = false;
            this.controls.target.copy(defaults.controlsTarget);
            this.camera.position.x = this.controls.target.x;
            this.camera.position.y = this.controls.target.y;
            this.camera.position.z = this.controls.target.z + defaults.orthographicCameraDistance;
            this.updateCamera(defaults.orthographicCameraViewWidth);
        } else if (this.cameraMode == 2) {
            //orthogonal view from side
            this.cameraPerspective = false;
            let totalViewWidth = 1000;
            this.controls.target.set(0, 0, 0);
            this.camera.position.x = this.controls.target.x + defaults.orthographicCameraDistance;
            this.camera.position.y = this.controls.target.y;
            this.camera.position.z = this.controls.target.z;
            this.updateCamera(defaults.orthographicCameraViewWidth);
        } else if (this.cameraMode == 3) {
            //orthogonal view from side
            this.cameraPerspective = false;
            let totalViewWidth = 1000;
            this.controls.target.set(0, 0, 0);
            this.camera.position.x = this.controls.target.x;
            this.camera.position.y = this.controls.target.y + defaults.orthographicCameraDistance;
            this.camera.position.z = this.controls.target.z;
            this.updateCamera(defaults.orthographicCameraViewWidth);
        }
    }



    updateCamera(length) {
        /* We may have to create a new camera so need to remember the previous settings.  */
        let oldPosition;
        if (this.camera != undefined) {
            oldPosition = this.camera.position.clone();
        }

        let defaults = this.defaults.camera;

        if (this.cameraPerspective) {
            /* setting-up perspective camera */
            this.camera = new THREE.PerspectiveCamera(defaults.perspectiveCameraAngle, window.innerWidth / window.innerHeight, defaults.perspectiveCameraNearFrustum, defaults.perspectiveCameraFarFrustum);
            this.camera.up.set(0, 0, 1); //allow proper rotation when z is the up axis.

            if (oldPosition) this.camera.position.copy(oldPosition);
            this.updateOrbitControl();

        } else {
            /* setting-up orthographic camera */
            var width = length;
            var height = width * window.innerHeight / window.innerWidth;

            this.camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, defaults.orthographicCameraNearFrustum, defaults.orthographicCameraFarFrustum);

            if (oldPosition) this.camera.position.copy(oldPosition);
            this.camera.up.set(0, 0, 1); //allow proper rotation when z is the up axis.
            this.updateOrbitControl();
        }
    }

    hideStudCanvas() {
        //remove disply div from screen
        this.studDisplayDiv.remove();

        //this.studDisplayDiv.style.display = 'none';
    }

    switchStudCanvasVisibility(visible = true) {
        if (this.studCanvasVisible == visible) return;
        if (visible) {
            document.body.appendChild(this.studDisplayDiv);
            this.studCanvasVisible = true;
        } else {
            if (this.studDisplayDiv != undefined) this.studDisplayDiv.remove();
            this.studCanvasVisible = false;
        }
    }

    updateCostLabel(newLabel) {
        if (newLabel != undefined) this.costLabelText = newLabel;
        this.costLabel.innerHTML = this.costDivExpanded ? this.costLabelText.join('<br>') : this.costLabelText[0];
    }

    setUpDisplayDiv() {
        this.costDisplayDiv = document.createElement('div');
        this.costDisplayDiv.style.position = 'fixed';
        this.costDisplayDiv.style.zIndex = "10";
        this.costDisplayDiv.style.bottom = '20px';
        this.costDisplayDiv.style.left = 25 + 'px';
        this.costDisplayDiv.style.fontSize = '24px'; // Bigger font size
        this.costDisplayDiv.style.fontWeight = 'bold'; // Bold text
        this.costDisplayDiv.style.color = 'white'; // White text

        this.costLabel = document.createElement('costLabel');
        //this.costLabel.innerHTML = this.costLabelShortText;
        this.costDisplayDiv.appendChild(this.costLabel);
        document.body.appendChild(this.costDisplayDiv);

        /* add event listener */
        this.costDivExpanded = false;
        this.updateCostLabel(['Total Cost: $0', 'Total Cost: $0', '2x4x10 : 0']);
        this.costDisplayDiv.addEventListener('click', () => {
            // if (this.costDivExpanded) {
            //     this.costLabel.innerHTML = this.costLabelShortText;
            // } else {
            //     this.costLabel.innerHTML = this.costLabelLongText.join('<br>');
            // }
            this.costDivExpanded = !this.costDivExpanded;
            this.updateCostLabel();
        });
    }

    addSphereHelper(position, radius = 5, color = 0xffff00, segments = 8) {
        let sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments), new THREE.MeshBasicMaterial({ color: color }));
        sphere.position.copy(position);
        this.object.add(sphere);
        return sphere;
    }

    setUpStudCanvas() {
        this.studCanvas = document.createElement('canvas');
        this.studCanvasCtx = this.studCanvas.getContext('2d');
        this.studCanvas.style.backgroundColor = 'white';

        /* set dimension + scale + center  */
        this.studCanvas.width = window.innerWidth;
        this.studCanvas.height = 200;
        this.studCanvasOrigin = [30, this.studCanvas.height - 60];

        /* display canvas at the bottom of the screen */
        this.studDisplayDiv = document.createElement('div');
        this.studDisplayDiv.style.position = 'fixed';
        this.studDisplayDiv.style.zIndex = "10";
        this.studDisplayDiv.style.bottom = '0px';
        this.studDisplayDiv.style.left = '0px';
        // displayDiv.style.fontSize = '24px'; // Bigger font size
        // displayDiv.style.fontWeight = 'bold'; // Bold text
        // displayDiv.style.color = 'white'; // White text

        this.studDisplayDiv.appendChild(this.studCanvas);
        this.switchStudCanvasVisibility(true);
    }

    updateOrbitControl() {
        let oldControlsTarget;
        if (this.controls != undefined) {
            oldControlsTarget = this.controls.target.clone();
        }

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // this.controls.keys = {
        //     LEFT: 'ArrowLeft', //left arrow
        //     UP: 'ArrowUp', // up arrow
        //     RIGHT: 'ArrowRight', // right arrow
        //     BOTTOM: 'ArrowDown' // down arrow
        // }
        // this.controls.listenToKeyEvents(document);
        this.controls.addEventListener('start', () => this.orbitActive = true);
        this.controls.addEventListener('end', () => this.orbitActive = false);
        this.orbitActive = false;

        if (oldControlsTarget) this.controls.target = oldControlsTarget;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }


    initializeEventListeners() {
        window.addEventListener('pointermove', (event) => this.onPointerMove(event));

        window.addEventListener('pointerdown', (event) => this.onPointerDown(event));

        window.addEventListener('pointerup', (event) => this.onPointerUp(event));

        document.addEventListener('keydown', (event) => this.onKeyDown(event));

        document.addEventListener('keyup', (event) => this.onKeyUp(event));

        window.addEventListener('resize', (event) => this.onWindowResize(event));
    }

}

THREE.Vector3.prototype.round = function (digits) {
    this.x = ThreeUtilities.roundNumber(this.x, digits);
    this.y = ThreeUtilities.roundNumber(this.y, digits);
    this.z = ThreeUtilities.roundNumber(this.z, digits);
    return this;
}

