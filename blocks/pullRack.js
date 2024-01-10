import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

export default class PullRack extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = PullRack.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */
        param.variations = [
            {
                variationName: "Pull-out rack",
                variationParameters: {
                }
            }
        ],

            param.rightSlotsOccupyAbove = 1 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow = 0
        param.leftSlotsOccupyAbove = 1
        param.leftSlotsOccupyBelow = 0
        param.centerSlotsOccupyAbove = 1
        param.centerSlotsOccupyBelow = 12

        param.idealHorizontalLocation = 0;
        param.horizontalWeight = 2;

        param.minWidth = 18;
        param.maxWidth = 30;
        param.idealWidth = 20;

        param.sliderThickness = 0.75;
        param.cylinderRadius = 1;
        param.cylinderOffset = 2;

        param.priority = 10;
        param.onePerColumn = true;
        param.fillPerColumn = true;

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
        super.makeSlides();
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();
        let param = this.parameters;

        /* add slider */
        let blockGeometry = new THREE.BoxGeometry(this.width, this.depth, param.sliderThickness);
        this.blockMesh = new THREE.Mesh(blockGeometry, this.blockObjectMaterial);
        this.blockMesh.position.set(0, -this.depth / 2, this.parameters.slideHeight / 2);
        this.blockMesh.add(ThreeUtilities.returnObjectOutline(this.blockMesh));
        this.blockObjectMoving.add(this.blockMesh);

        /* add a cylinder */
        let cylinder = ThreeUtilities.returnCylinder(new THREE.Vector3(0, 0, -param.cylinderOffset), new THREE.Vector3(0, -this.depth, -param.cylinderOffset), param.cylinderRadius, this.blockObjectMaterial, 10)
        this.blockObjectMoving.add(cylinder);

        this.makeClickable(this.blockMesh);

        /* add clothing */
        let clothOffset = -param.cylinderOffset - 5.8;
        let shirtOffset = -param.cylinderOffset - 2.5;
        let chance = 0.5;

        for (var y = - 5; y > -this.depth + 5; y -= 5) {

            (function (y) { //needed to preserve value of y in callbacks 
                this.sceneManager.objectCache.loadObject("coatHanger", (objectName) => {
                    objectName.position.set(0, y, clothOffset);
                    this.blockObjectMoving.add(objectName);
                }, false, false, undefined, true);

                if (Math.random() < chance) {
                    this.sceneManager.objectCache.loadObject("shirt", (objectName) => {
                        objectName.position.set(0, y + 0.3, shirtOffset);
                        this.blockObjectMoving.add(objectName);
                    }, false, true, "#a3d9d4", true);
                }

            }).call(this, y);
        }

    }


    /* once done, also update shelf.js blockList and imports */

}