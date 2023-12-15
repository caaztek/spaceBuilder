import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


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
        this.pointLight = new THREE.PointLight(0xffffff, 1);
        this.pointLight.position.set(5, 0, 20);
        this.pointLight.castShadow = true; // default false
        this.pointLight.shadow.mapSize.width = 2048;
        this.pointLight.shadow.mapSize.height = 2048;
        this.scene.add(this.pointLight);

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

        const intersects = this.raycaster.intersectObjects(this.clickableObjects);

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

        const intersects = this.raycaster.intersectObjects(this.clickableObjects);

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
        this.controls.keys = {
            LEFT: 'ArrowLeft', //left arrow
            UP: 'ArrowUp', // up arrow
            RIGHT: 'ArrowRight', // right arrow
            BOTTOM: 'ArrowDown' // down arrow
        }
        this.controls.listenToKeyEvents(document);
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


/* Contains a number of useful three.js function that can be used accross many projects */
export class ThreeUtilities {

    static returnGroupAtCoord(geom, material, coord, outline = true) {
        let body = this.returnObjAtCoord(geom, material, coord);
        //group.add(body);
        if (outline) {
            body.add(this.returnObjectOutline(body));
        }
        return body;
    }

    static returnGroupAtDetailedCoord(geom, material, origin, xAxis, yAxis, zAxis, outline = true) {
        //console.log(yAxis);
        let coord = {
            "origin": origin.clone(),
            "xAxis": xAxis.clone(),
            "yAxis": yAxis.clone(),
            "zAxis": zAxis.clone()
        }
        return this.returnGroupAtCoord(geom, material, coord, outline);
    }

    /* returns a arbitrary vector that is orthogonal to the input */
    static returnOrthVector(vector) {
        let parallelThreshold = 0.01;
        let candidate = new THREE.Vector3(0, 0, 1).cross(vector);
        if (candidate.lengthSq() < parallelThreshold) {
            //our candidate is almost parallel to 
            candidate = new THREE.Vector3(1, 0, 0).cross(vector);
        }
        return candidate.normalize();
    }

    /* fills in the missing axis in the coord object */
    static fillCoord(coord) {
        if (coord.xAxis == undefined && coord.yAxis == undefined) {
            // that means z must be defined
            if (coord.zAxis == undefined) { console.log("bug in setting arbitrary axis - missing too many axis"); }
            coord.xAxis = this.returnOrthVector(coord.zAxis);
            coord.yAxis = coord.zAxis.clone().cross(coord.xAxis);
        } else if (coord.xAxis == undefined) {
            //that means y must be defined.
            if (coord.yAxis == undefined) { console.log("bug in setting arbitrary axis - missing too many axis"); }
            coord.xAxis = this.returnOrthVector(coord.yAxis);
            coord.zAxis = coord.xAxis.clone().cross(coord.yAxis)
        } else if (coord.yAxis == undefined) {
            //that means x must be defined
            if (coord.xAxis == undefined) { console.log("bug in setting arbitrary axis - missing too many axis"); }
            coord.yAxis = this.returnOrthVector(coord.xAxis);
            coord.zAxis = coord.xAxis.clone().cross(coord.yAxis)
        }
        return coord;
    }

    static updateObjectOrientationFromDetailedAxis(object, xAxis, yAxis, zAxis) {
        let coord = {
            "xAxis": xAxis,
            "yAxis": yAxis,
            "zAxis": zAxis
        }
        coord = this.fillCoord(coord);
        let newMatrix = new THREE.Matrix4();
        newMatrix.makeBasis(coord.xAxis, coord.yAxis, coord.zAxis);
        object.applyMatrix4(newMatrix);
    }

    static updateObjectMatrix(object, coord) {
        coord = this.fillCoord(coord);
        let newMatrix = new THREE.Matrix4();
        newMatrix.makeBasis(coord.xAxis, coord.yAxis, coord.zAxis);
        newMatrix.setPosition(coord.origin.clone());
        object.applyMatrix4(newMatrix);
    }

    static returnObjAtCoord(geom, material, coord) {

        coord = this.fillCoord(coord);

        let newMatrix = new THREE.Matrix4();
        newMatrix.makeBasis(coord.xAxis, coord.yAxis, coord.zAxis);
        newMatrix.setPosition(coord.origin.clone());
        let object = new THREE.Mesh(geom, material);
        object.name = "body";
        object.applyMatrix4(newMatrix);
        return object;
    }

    static returnObjAtDetailedCoord(geom, material, origin, xAxis, yAxis, zAxis) {
        let coord = {
            "origin": origin,
            "xAxis": xAxis,
            "yAxis": yAxis,
            "zAxis": zAxis
        }

        return this.returnObjAtCoord(geom, material, coord);
    }

    static o = new THREE.Vector3(0, 0, 0);
    static x = new THREE.Vector3(1, 0, 0);
    static y = new THREE.Vector3(0, 1, 0);
    static z = new THREE.Vector3(0, 0, 1);

    static returnObjectOutline(mesh, outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 })) {
        let outlineGeom = new THREE.EdgesGeometry(mesh.geometry);
        let outline = new THREE.LineSegments(outlineGeom, outlineMaterial);
        //outline.matrix.copy(mesh.matrix);
        outline.matrixAutoUpdate = false; //used to be false
        outline.name = "outline";
        return outline;
    }

    static ensureCounterClockwise(polygon) {
        // Compute signed area
        let area = 0;
        for (let i = 0; i < polygon.length; i++) {
            let j = (i + 1) % polygon.length;
            area += (polygon[i][0] * polygon[j][1] - polygon[j][0] * polygon[i][1]);
        }
        area /= 2;

        // If the area is negative, the polygon is clockwise
        if (area < 0) {
            polygon.reverse();  // Reverse the order of vertices
        }

        return polygon;  // Return the (possibly reversed) polygon
    }

    /* implementation of Sutherland-Hodgman Algoprithm by https://www.rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping. input polygon must be arrays of arrays of two . Output will be empty if no intersection. */
    static clipPolygons(subjectPolygon, clipPolygon) {
        subjectPolygon = this.ensureCounterClockwise(subjectPolygon);
        clipPolygon = this.ensureCounterClockwise(clipPolygon);

        var cp1, cp2, s, e;
        var inside = function (p) {
            return (cp2[0] - cp1[0]) * (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * (p[0] - cp1[0]);
        };
        var intersection = function () {
            var dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]],
                dp = [s[0] - e[0], s[1] - e[1]],
                n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0],
                n2 = s[0] * e[1] - s[1] * e[0],
                n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
            return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3];
        };
        var outputList = subjectPolygon;
        cp1 = clipPolygon[clipPolygon.length - 1];
        for (var j in clipPolygon) {
            cp2 = clipPolygon[j];
            var inputList = outputList;
            outputList = [];
            s = inputList[inputList.length - 1]; //last on the input list
            for (var i in inputList) {
                e = inputList[i];
                if (inside(e)) {
                    if (!inside(s)) {
                        outputList.push(intersection());
                    }
                    outputList.push(e);
                }
                else if (inside(s)) {
                    outputList.push(intersection());
                }
                s = e;
            }
            cp1 = cp2;
        }

        return outputList
    }

    static roundNumber(number, digits) {
        return Math.round(number * Math.pow(10, digits)) / Math.pow(10, digits);
    }

    /* will return a clean string down to 1/16" */
    static toConstructionFormat(num) {
        const wholePart = Math.floor(num);
        const decimalPart = num - wholePart;
        const fractionNumerator = Math.round(decimalPart * 16);

        if (fractionNumerator === 0) {
            return `${wholePart}"`;
        } else if (fractionNumerator === 16) {
            return `${wholePart + 1}"`;
        } else {
            let simplifiedNumerator = fractionNumerator;
            let denominator = 16;

            // Reduce the fraction to its simplest form
            if (fractionNumerator % 8 === 0) {
                simplifiedNumerator = fractionNumerator / 8;
                denominator = 2;
            } else if (fractionNumerator % 4 === 0) {
                simplifiedNumerator = fractionNumerator / 4;
                denominator = 4;
            } else if (fractionNumerator % 2 === 0) {
                simplifiedNumerator = fractionNumerator / 2;
                denominator = 8;
            }

            const fractionString = simplifiedNumerator + '/' + denominator;
            return `${wholePart}"${fractionString}`;
        }
    }


    static returnCylinder(vstart, vend, radius, material, edges = 4) {
        let zAxis = vend.clone().addScaledVector(vstart, -1);
        let origin = vstart.clone().add(vend).multiplyScalar(0.5);
        var cylLength = zAxis.length();
        var cylGeom = new THREE.CylinderGeometry(radius, radius, cylLength, edges);
        cylGeom.rotateX(Math.PI / 2);
        zAxis.normalize();
        return this.returnObjAtDetailedCoord(cylGeom, material, origin, undefined, undefined, zAxis);
    }

    static disposeHierarchy(node, callback = this.disposeNode) {
        if (node != undefined) {
            for (var i = node.children.length - 1; i >= 0; i--) {
                var child = node.children[i];
                this.disposeHierarchy(child, callback);
                callback(child);
            }
            callback(node);
        }
    }

    static downloadJSON(json, fileName = "building") {
        const blob = new Blob([json], { type: 'application/json' });  // Create a blob from the JSON
        const url = URL.createObjectURL(blob);  // Create a URL for the blob
        const a = document.createElement('a');  // Create an anchor element
        a.href = url;  // Set the URL of the anchor element to the blob URL
        a.download = fileName + ".json";  // Set the desired file name
        document.body.appendChild(a);  // Temporarily add the anchor to the document
        a.click();  // Trigger a click to download the file
        document.body.removeChild(a);  // Remove the anchor from the document
        URL.revokeObjectURL(url);  // Clean up the blob URL
    }

    static replacer(key, value) {
        if (value instanceof THREE.Vector3) {
            return { x: value.x, y: value.y, z: value.z, isVector3: true };
        }
        return value;
    }

    static reviver(key, value) {
        if (value && value.isVector3) {
            return new THREE.Vector3(value.x, value.y, value.z);
        }
        return value;
    }


    static disposeNode(node) {
        if (node.isObject3D) {
            if (node.geometry) {
                node.geometry.dispose();
            }
            //interactionManager.remove(node);
            node.removeFromParent();
            //node.dispose();

            // if (node.material)
            // {
            //     if (node.material instanceof THREE.MeshFaceMaterial)
            //     {
            //         $.each (node.material.materials, function (idx, mtrl)
            //         {
            //             if (mtrl.map)               mtrl.map.dispose ();
            //             if (mtrl.lightMap)          mtrl.lightMap.dispose ();
            //             if (mtrl.bumpMap)           mtrl.bumpMap.dispose ();
            //             if (mtrl.normalMap)         mtrl.normalMap.dispose ();
            //             if (mtrl.specularMap)       mtrl.specularMap.dispose ();
            //             if (mtrl.envMap)            mtrl.envMap.dispose ();
            //             if (mtrl.alphaMap)          mtrl.alphaMap.dispose();
            //             if (mtrl.aoMap)             mtrl.aoMap.dispose();
            //             if (mtrl.displacementMap)   mtrl.displacementMap.dispose();
            //             if (mtrl.emissiveMap)       mtrl.emissiveMap.dispose();
            //             if (mtrl.gradientMap)       mtrl.gradientMap.dispose();
            //             if (mtrl.metalnessMap)      mtrl.metalnessMap.dispose();
            //             if (mtrl.roughnessMap)      mtrl.roughnessMap.dispose();

            //             mtrl.dispose ();    // disposes any programs associated with the material
            //         });
            //     }
            //     else
            //     {
            //         if (node.material.map)              node.material.map.dispose ();
            //         if (node.material.lightMap)         node.material.lightMap.dispose ();
            //         if (node.material.bumpMap)          node.material.bumpMap.dispose ();
            //         if (node.material.normalMap)        node.material.normalMap.dispose ();
            //         if (node.material.specularMap)      node.material.specularMap.dispose ();
            //         if (node.material.envMap)           node.material.envMap.dispose ();
            //         if (node.material.alphaMap)         node.material.alphaMap.dispose();
            //         if (node.material.aoMap)            node.material.aoMap.dispose();
            //         if (node.material.displacementMap)  node.material.displacementMap.dispose();
            //         if (node.material.emissiveMap)      node.material.emissiveMap.dispose();
            //         if (node.material.gradientMap)      node.material.gradientMap.dispose();
            //         if (node.material.metalnessMap)     node.material.metalnessMap.dispose();
            //         if (node.material.roughnessMap)     node.material.roughnessMap.dispose();

            //         node.material.dispose ();   // disposes any programs associated with the material
            //     }
            // }
        }
        // if(node.isObject3D) {
        //     node.removeFromParent();
        // }
    }   // disposeNode


}