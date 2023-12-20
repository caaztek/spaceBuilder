import { SceneEntity } from './sceneManager.js';
import ThreeUtilities from './threeUtilities';
import { LinearModifier, PlanarModifier } from './modifier.js';
import * as THREE from 'three';
import Shelf from './shelf.js';

import bin10In from './models/bin10In.gltf';
import officeMug from './models/officeMug.glb';
import officeChair from './models/officeChair.glb';

export default class Garage extends SceneEntity {
    constructor(sceneManager, parent) {
        super(sceneManager, parent, "garage");

        /* handle gui */
        this.showGarageModifier = true;
        this.addGUI();

        /* handle all default values  */
        this.length = 200;
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

        /* make a few updates to ojectCache */
        // this.sceneManager.objectCache.addObject("plasticBin", 'models/bin10In.gltf', 39);
        // this.sceneManager.objectCache.addObject("officeMug", 'models/officeMug.glb', 39,Math.PI/2);
        // this.sceneManager.objectCache.addObject("officeChair", 'models/officeChair.glb', 39);

        this.sceneManager.objectCache.addObject("plasticBin", bin10In, 39);
        this.sceneManager.objectCache.addObject("officeMug", officeMug, 39,Math.PI/2);
        this.sceneManager.objectCache.addObject("officeChair", officeChair, 39);

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

    }

    addGUI() {
        super.addGUI();
        this.guiFolder.add(this, "showGarageModifier").onChange((value) => {
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
            let light = new THREE.PointLight(0xffffff,totalLight / numberOfLights);
            light.position.set(startX + i * lightSpacing, -100, this.height + 50 );
            this.lights.add(light);
        }

        this.object.add(this.lights);
    }

    addModifiers() {
        this.rightModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(2)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startLength = this.length;
                } else if (modifierType == "moved") {
                    let minLength = this.minLength;
                    if (this.shelves.length > 0) { minLength = this.shelves[0].lastX() + this.shelves[0].startX + this.wallThickness + this.shelves[0].partitionThickness / 2 }
                    this.length = Math.max(this.startLength + modifier.offsetDistance, minLength);
                    this.update();
                }
            })

        this.topModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(2)
            .updateDirection(this.sceneManager.zAxis, this.sceneManager.yAxis)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    console.log("clicked");
                    this.startHeight = this.height;
                } else if (modifierType == "moved") {
                    let minHeight = this.minHeight;
                    if (this.shelves.length > 0) { minHeight = this.shelves[0].maxHeight() }
                    this.height = Math.max(this.startHeight + modifier.offsetDistance, minHeight)
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
    }
}