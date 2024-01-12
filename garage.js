import { SceneEntity } from './sceneManager.js';
import ThreeUtilities from './threeUtilities';
import { LinearModifier, PlanarModifier } from './modifier.js';
import * as THREE from 'three';
import Shelf from './shelf.js';
import ObjectCache from './objectCache.js';
import Dimension from './dimension.js';

import bin10In from './models/bin10In.gltf';
import officeMug from './models/officeMug.glb';
import officeChair from './models/officeChair.glb';
import coatHanger from './models/coatHanger.glb';
import shirt from './models/shirt.gltf';

export default class Garage extends SceneEntity {
    constructor(sceneManager, parent) {
        super(sceneManager, parent, "garage");

        /* handle gui */
        this.showGarageModifier = true;
        this.addGUI();

        /* handle all default values  */
        this.length = 250;
        this.minLength = 30;
        this.height = 100;
        this.minHeight = 50;
        this.depth = 200;
        this.wallThickness = 6;
        this.shortWallLength = 50;
        this.longWallLength = 100;
        this.cameraStartHeight = 80;
        this.cameraStartTargetHeight = 40;
        this.cameraStartDepth = 350;
        this.floorMaterial = new THREE.MeshLambertMaterial({ color: "#e6e6e6" });
        this.wallMaterial = new THREE.MeshLambertMaterial({ color: "#f2f2f2" });

        this.dimensionYOffset = 100;

        /* make a few updates to ojectCache */
        // this.sceneManager.objectCache.addObject("plasticBin", 'models/bin10In.gltf', 39);
        // this.sceneManager.objectCache.addObject("officeMug", 'models/officeMug.glb', 39,Math.PI/2);
        // this.sceneManager.objectCache.addObject("officeChair", 'models/officeChair.glb', 39);

        /* set-up object cache. Need to import .glb or .gltf file at the top of this document to include them in vite compilation */
        this.sceneManager.objectCache = new ObjectCache(this.sceneManager, this);
        this.sceneManager.objectCache.addObject("plasticBin", bin10In, 39, 0, 0, 0, [18, 27, 40]);
        this.sceneManager.objectCache.addObject("officeMug", officeMug, 39, Math.PI / 2);
        this.sceneManager.objectCache.addObject("officeChair", officeChair, 39);
        this.sceneManager.objectCache.addObject("coatHanger", coatHanger, 0.15, Math.PI / 2, Math.PI / 2, 0);
        this.sceneManager.objectCache.addObject("shirt", shirt, 85, 0, 0, 0);

        //this.sceneManager.objectCache.testObjectOutline("officeMug", 100);

        /* set objects. They need to be memorized for updates */
        this.objects = {
            floor: undefined,
            frontWall: undefined,
            leftWall: undefined,
            rightWall: undefined,
        }

        this.addModifiers();
        this.update();
        this.setCamera();

        /* set shelves */
        this.shelves = [new Shelf(this.sceneManager, this)];

        this.sceneManager.onUpdate((updateType, event) => {
            if (updateType == "keyDown" && event == "m") {
                this.showGarageModifier = !this.showGarageModifier;
                this.switchModifierVisibility(this.showGarageModifier);
                this.showModifierController.updateDisplay();
            }
        })

    }

    addGUI() {
        super.addGUI();
        this.showModifierController = this.guiFolder.add(this, "showGarageModifier").onChange((value) => {
            this.switchModifierVisibility(value);
        });
    }

    switchModifierVisibility(value) {
        this.rightModifier.switchVisibility(value);
        this.topModifier.switchVisibility(value);
        this.shelves.forEach(shelf => shelf.switchModifierVisibility(value));
    }

    setCamera() {
        this.sceneManager.camera.position.set(this.length / 2, -this.cameraStartDepth, this.cameraStartHeight);
        this.sceneManager.camera.lookAt(this.length / 2, 0, this.cameraStartTargetHeight);
        this.sceneManager.controls.target.set(this.length / 2, 0, this.cameraStartTargetHeight);
        this.sceneManager.controls.minAzimuthAngle = -Math.PI / 2;
        this.sceneManager.controls.maxAzimuthAngle = Math.PI / 2;
        this.sceneManager.controls.minPolarAngle = 0;
        this.sceneManager.controls.maxPolarAngle = Math.PI / 2;
        this.sceneManager.controls.enablePan = false
        this.sceneManager.controls.enableDamping = false

        // const originalPan = this.sceneManager.controls.pan;

        // // Override the pan function
        // this.sceneManager.controls.pan = function () {
        //     // Get the original arguments
        //     const args = Array.from(arguments);

        //     // Modify the x component to be 0 (disables horizontal panning)
        //     if (args.length === 1 && args[0].isVector2) {
        //         args[0].x = 0;
        //     } else if (args.length >= 2) {
        //         args[0] = 0; // args[0] represents the x component in this case
        //     }

        //     // Call the original pan function with modified arguments
        //     return originalPan.apply(this, args);
        // };
    }

    updateLights() {
        if (this.lights != undefined) this.object.remove(this.lights);

        let totalLight = 130 * this.length;
        let lightSpacing = 50;
        let percentLengthOccupied = 0.8;

        this.lights = new THREE.Group();

        let numberOfLights = Math.floor(this.length * percentLengthOccupied / lightSpacing);

        let startX = this.length * percentLengthOccupied / 2 - numberOfLights * lightSpacing / 2;

        for (let i = 0; i < numberOfLights; i++) {
            let light = new THREE.PointLight(0xffffff, totalLight / numberOfLights);
            light.position.set(startX + i * lightSpacing, -100, this.height + 50);
            this.lights.add(light);
        }

        this.object.add(this.lights);
    }

    addModifiers() {

        let startPoint1 = this.sceneManager.origin.clone().addScaledVector(this.sceneManager.xAxis, this.wallThickness).addScaledVector(this.sceneManager.zAxis, 0)
        this.rightModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(2)
            .updatePrecision(3)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            .updateDimension(startPoint1, startPoint1.clone().addScaledVector(this.sceneManager.xAxis, this.length - this.wallThickness * 2), this.sceneManager.yAxis.clone().negate(), 100, 0, 0)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startLength = this.length;
                } else if (modifierType == "moved") {
                    let minLength = this.minLength;
                    if (this.shelves.length > 0) { minLength = this.shelves[0].lastX() + this.shelves[0].startX + this.wallThickness + this.shelves[0].partitionThickness / 2 }
                    this.length = Math.max(this.startLength + modifier.offsetDistance, minLength);
                    modifier.dimension.updateEndPoint(startPoint1.clone().addScaledVector(this.sceneManager.xAxis, this.length - this.wallThickness * 2));
                    this.update();
                }
            })

        let startPoint = this.sceneManager.origin.clone().addScaledVector(this.sceneManager.yAxis, -this.shortWallLength).addScaledVector(this.sceneManager.xAxis, this.wallThickness / 2)

        this.topModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(2)
            .updatePrecision(3)
            .updateDirection(this.sceneManager.zAxis, this.sceneManager.yAxis)
            .updateDimension(startPoint, startPoint.clone().addScaledVector(this.sceneManager.zAxis, this.height), this.sceneManager.yAxis.clone().negate(), 20, Math.PI / 2, 0)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    console.log("clicked");
                    this.startHeight = this.height;
                } else if (modifierType == "moved") {
                    let minHeight = this.minHeight;
                    if (this.shelves.length > 0) { minHeight = this.shelves[0].maxHeight() }
                    this.height = Math.max(this.startHeight + modifier.offsetDistance, minHeight)
                    modifier.dimension.updateEndPoint(startPoint.clone().addScaledVector(this.sceneManager.zAxis, this.height));
                    this.update();
                }
            })
    }

    update() {
        /* first draw the ground */
        if (this.objects.floor != undefined) {
            ThreeUtilities.disposeHierarchy(this.objects.floor);
        }
        let floorGeom = new THREE.BoxGeometry(this.length, this.depth, this.wallThickness);
        floorGeom.translate(this.length / 2, -this.depth / 2, -this.wallThickness / 2);
        let floor = new THREE.Mesh(floorGeom, this.floorMaterial);
        floor.add(ThreeUtilities.returnObjectOutline(floor));
        this.objects.floor = floor;
        this.object.add(floor);

        /* now draw the back wall */
        if (this.objects.backWall != undefined) {
            ThreeUtilities.disposeHierarchy(this.objects.backWall);
        }
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0, -this.shortWallLength);
        shape.lineTo(this.wallThickness, -this.shortWallLength);
        shape.lineTo(this.wallThickness, -this.wallThickness);
        shape.lineTo(this.length - this.wallThickness, -this.wallThickness);
        shape.lineTo(this.length - this.wallThickness, -this.longWallLength);
        shape.lineTo(this.length, -this.longWallLength);
        shape.lineTo(this.length, 0);
        shape.lineTo(0, 0);

        const extrudeSettings = {
            steps: 2,
            depth: this.height,
            bevelEnabled: false,
        };

        const wallGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const wallObject = new THREE.Mesh(wallGeom, this.wallMaterial);
        wallObject.add(ThreeUtilities.returnObjectOutline(wallObject));
        this.object.add(wallObject);
        this.objects.backWall = wallObject;

        /* update modifier position */
        this.rightModifier.updatePosition(new THREE.Vector3(this.length - this.wallThickness, -this.wallThickness, this.height / 2))
        this.topModifier.updatePosition(new THREE.Vector3(this.length / 2, -this.wallThickness / 2, this.height))

        /* updateLights */
        this.updateLights();

        /* quick dimension try */
        // let dimension = new Dimension(this.sceneManager, this, new THREE.Vector3(0, 0, 0), new THREE.Vector3(250, -100, 0), new THREE.Vector3(0, -1, 0), 150)
        // .update();
    }
}