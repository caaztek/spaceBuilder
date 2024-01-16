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
        ];

        param.shirtColor = "#a3d9d4";

        param.rightSlotsOccupyAbove = 1 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow = 0
        param.leftSlotsOccupyAbove = 1
        param.leftSlotsOccupyBelow = 0
        param.centerSlotsOccupyAbove = 1
        param.centerSlotsOccupyBelow = 10
        param.centerSlotsOccupyAboveForced = 1
        param.centerSlotsOccupyBelowForced = 10

        param.referenceIsBottom = true;
        param.idealDistanceFromReference = 50;

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

    setDimensions() {
        super.setDimensions();
        this.blockShirtMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.shirtColor });
    }

    makeSlides() {
        super.makeSlides();
    }

    changeObjectColor(color) {
        this.blockObjectMaterial.color.set(color == undefined ? this.parameters.objectColor : color);
        this.blockShirtMaterial.color.set(color == undefined ? this.parameters.shirtColor : color);
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();
        let param = this.parameters;

        /* add slider */
        let blockGeometry = new THREE.BoxGeometry(this.width, this.depth, param.sliderThickness);
        let sliderMesh = new THREE.Mesh(blockGeometry, this.blockObjectMaterial);
        sliderMesh.position.set(0, -this.depth / 2, this.parameters.slideHeight / 2);
        sliderMesh.add(ThreeUtilities.returnObjectOutline(sliderMesh));
        this.blockObjectMoving.add(sliderMesh);

        /* add a cylinder */
        let cylinder = ThreeUtilities.returnCylinder(new THREE.Vector3(0, 0, -param.cylinderOffset), new THREE.Vector3(0, -this.depth, -param.cylinderOffset), param.cylinderRadius, this.blockObjectMaterial, 10)
        this.blockObjectMoving.add(cylinder);

        /* add clothing */
        let clothOffset = -param.cylinderOffset - 5.8;
        let shirtOffset = -param.cylinderOffset - 2.5;
        let chance = 0.5;

        for (var y = - 5; y > -this.depth + 5; y -= 5) {

            (function (y) { //needed to preserve value of y in callbacks 
                this.sceneManager.objectCache.loadObject("coatHanger", (objectName) => {
                    objectName.position.set(0, y, clothOffset);
                    this.blockObjectMoving.add(objectName);
                }, false, undefined, true);

                if ( y == -5 || Math.random() < chance) {
                    this.sceneManager.objectCache.loadObject("shirt", (objectName) => {
                        objectName.position.set(0, y + 0.3, shirtOffset);
                        this.blockObjectMoving.add(objectName);
                    }, false, this.blockShirtMaterial, false);
                }

            }).call(this, y);
        }

    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth, y: this.width, quantity: 1, thickness: 0.75 });
        cost.plywoodCuts.push({ x: this.depth, y: this.parameters.slideHeight, quantity: 2, thickness: 0.75 });

        /* additional hardware */
        cost.hardwareList.push({ 
            name: "pins", 
            unitCost: 0.05,
            parameters:{},
            quantity: 4 
        });

        cost.hardwareList.push({ 
            name: "tube", 
            unitCost: 5,
            parameters:{},
            quantity: 1 
        });

        return cost;
    }

}