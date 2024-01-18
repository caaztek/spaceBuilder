import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

/* default template.
1. Change TemplateName
2. Update SetParameter with chosenName.parameters()
3. Change param.name with proper name. Update all other parameters as necessary
4. Make custom score if necessary
5. Uodpate makeSlides() as necessary. Can start from super.makeSlides() if useful. It will make standard slides with a slot
6. Update makeMovingObject() as necessary. Can start from super.makeMovingObject() if useful. It will make standard moving object with a slot
7. In Shelf.js, import /block/templateName.js and update setBlockList to include the new block type
 */

export default class VerticalBike extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = VerticalBike.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        let slotsBelow = 17;
        param.variations = [
            {
                variationName: "Vertical Bike",
                variationParameters: {
                    rightSlotsOccupyAbove: 1,
                    rightSlotsOccupyBelow: slotsBelow,
                    leftSlotsOccupyAbove: 1,
                    leftSlotsOccupyBelow: slotsBelow,
                    centerSlotsOccupyAbove: 1,
                    centerSlotsOccupyBelow: slotsBelow,
                    centerSlotsOccupyAboveForced: 1,
                    centerSlotsOccupyBelowForced: slotsBelow,
                    startBlockListFillingCoefficient: 0.8,
                }
            }
        ]

        param.minWidth = 14;
        param.priority = 10
        param.onePerColumn = true
        param.fillPerColumn = true
        param.bikeShiftZ = -36;

        param.widthMargin = 0;
        param.slideHeight = 4;
        param.sliderThickness = 0.75;
        param.crossThickness = 0.75;

        param.hookWidth = 2;
        param.hookGapX = 4;
        param.hookGapZ = 4;
        param.hookRecessZ = 1;
        param.hookThickness = 0.75;

        param.pullOutSpeed = 0.001

        param.allowSlide = true

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
        //super.makeSlides();
    }

    setDimensions() {
        super.setDimensions();
        
        this.bikeExtraRotation = 0;
        this.maxBikeRotation  = Math.PI / 2;
        let totalRotationTime = this.maxBikeRotation / this.parameters.pullOutSpeed;
        this.bikeExtraY = 0;
        this.maxBikeShiftY = 60;
        this.ySpeed = this.maxBikeShiftY / totalRotationTime;
        this.bikeExtraZ = 0;
        this.maxBikeShiftZ = 34;
        this.zSpeed = this.maxBikeShiftZ / totalRotationTime;
        this.baseScale = 19;
        this.scaleExtra = 1.05;
    }

    changeObjectColor(color) {
        /* overwrite for unique objects like gltf imports that need to be traversed */
        super.changeObjectColor(color);
        let index = 0;
        if (color != undefined) {
            this.bicycle.scale.set(this.baseScale * this.scaleExtra,this.baseScale * this.scaleExtra,this.baseScale * this.scaleExtra);
        } else {
            this.bicycle.scale.set(this.baseScale,this.baseScale,this.baseScale);
        }
        // this.bicycle.traverse((child) => {
        //     if (child.isMesh) {
        //         child.material.color = (color == undefined ? this.bikeColorArray[index] : color);
        //         index++;
        //     }
        // });
    }

    updateAnimation(timeOffset) {
        let param = this.parameters;
        if (this.animationStatus == 1) {
            this.bikeExtraRotation += param.pullOutSpeed * timeOffset;
            this.bikeExtraY += this.ySpeed * timeOffset;
            this.bikeExtraZ += this.zSpeed * timeOffset;
            if (this.bikeExtraRotation >= this.maxBikeRotation) {
                this.bikeExtraRotation = this.maxBikeRotation;
                this.bikeExtraY = this.maxBikeShiftY;
                this.bikeExtraZ = this.maxBikeShiftZ;
                this.animationStatus = 2;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        } else if (this.animationStatus == 3) {
            this.bikeExtraRotation -= param.pullOutSpeed * timeOffset;
            this.bikeExtraY -= this.ySpeed * timeOffset;
            this.bikeExtraZ -= this.zSpeed * timeOffset;
            if (this.bikeExtraRotation <= 0) {
                this.bikeExtraRotation = 0;
                this.bikeExtraY = 0;
                this.bikeExtraZ = 0;
                this.animationStatus = 0;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        }
        this.bicycle.rotation.set(Math.PI/2, Math.PI/2, Math.PI/2 - this.bikeExtraRotation);
        this.bicycle.position.setY(-this.bikeExtraY);
        this.bicycle.position.setZ(this.parameters.bikeShiftZ - this.bikeExtraZ);
        
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();
        let p = this.parameters;

        /* make slides */
        let slideGeometry = new THREE.BoxGeometry(p.slideThickness, this.depth, p.slideHeight);
        let slideMeshLeft = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockObjectMaterial, new THREE.Vector3(-this.width / 2 + p.slideThickness / 2, -this.depth / 2,p.slideHeight/2));
        this.blockObjectFixed.add(slideMeshLeft);
        let slideMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockObjectMaterial, new THREE.Vector3(this.width / 2 - p.slideThickness / 2, -this.depth / 2,p.slideHeight/2));
        this.blockObjectFixed.add(slideMeshRight);

        let crossGeom = new THREE.BoxGeometry(this.width - 2 * p.slideThickness, p.crossThickness, p.slideHeight);
        let crossMesh = ThreeUtilities.returnGroupAtDetailedCoord(crossGeom, this.blockObjectMaterial, new THREE.Vector3(0, -this.depth / 2, p.slideHeight/2));
        this.blockObjectFixed.add(crossMesh);

        /* make the hook with a shape*/
        let hookShape = new THREE.Shape();
        hookShape.moveTo(-p.hookGapX / 2 - p.hookWidth, p.slideHeight);
        hookShape.lineTo(-p.hookGapX / 2, p.slideHeight);
        hookShape.lineTo(-p.hookGapX / 2, -p.hookGapZ);
        hookShape.lineTo(p.hookGapX / 2 , - p.hookGapZ);
        hookShape.lineTo(p.hookGapX / 2, -p.hookGapZ + p.hookRecessZ);
        hookShape.lineTo(p.hookGapX / 2 + p.hookWidth, -p.hookGapZ + p.hookRecessZ);
        hookShape.lineTo(p.hookGapX / 2 + p.hookWidth, -p.hookGapZ - p.hookWidth);
        hookShape.lineTo(-p.hookGapX / 2 - p.hookWidth, -p.hookGapZ - p.hookWidth);
        hookShape.lineTo(-p.hookGapX / 2 - p.hookWidth, p.slideHeight);

        let extrudeSettings = {
            steps: 1,
            depth: p.hookThickness,
            bevelEnabled: false,
        };

        let hookGeom = new THREE.ExtrudeGeometry(hookShape, extrudeSettings);
        let hookMesh = ThreeUtilities.returnGroupAtDetailedCoord(hookGeom, this.blockObjectMaterial, new THREE.Vector3(0, -this.depth / 2 - p.crossThickness,0), this.sceneManager.xAxis, this.sceneManager.zAxis, this.sceneManager.yAxis.clone().negate(), true);
        this.blockObjectFixed.add(hookMesh);

        /* load the bike itself */
        this.sceneManager.objectCache.loadObject("bicycle", (objectName) => {
            this.bicycle = objectName;
            objectName.position.set(0,0,p.bikeShiftZ);
            this.blockObjectFixed.add(objectName);
        }, false, undefined, true, undefined, true);
        this.bikeColorArray = this.sceneManager.objectCache.objectLibrary["bicycle"].colorArray;
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
            parameters: {},
            quantity: 4
        });

        return cost;
    }

    /* once done, also update shelf.js blockList and imports */

}