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

export default class SurfRack extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = SurfRack.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        param.variations = [
            {
                variationName: "Surf Rack",
                variationParameters: {
                    rightSlotsOccupyAbove: 10,
                    rightSlotsOccupyBelow: 1,
                    leftSlotsOccupyAbove: 10,
                    leftSlotsOccupyBelow: 1,
                    centerSlotsOccupyAbove: 20,
                    centerSlotsOccupyAboveForced:20,
                    centerSlotsOccupyBelow: 1,
                    centerSlotsOccupyBelowForced:1,
                    priority:20,
                    startBlockListFillingCoefficient : 0.8,
                }
            }
        ]

        param.referenceIsBottom = true;
        param.maxDistanceFromReference = 15;
        param.idealDistanceFromReference = 10
        param.verticalWeight = 10;

        param.minWidth = 10;
        
        param.slideHeight = 3;
        param.widthMargin = 0;
        param.rollRadius = 2;
        param.rollFraction = 0.25

        param.boardSlot = 3;
        param.comeWidth = 2;
        param.backWidth = 4;
        param.comeHeight = 40;
        param.comeThickness = 0.75;

        param.priority = 20;
        param.onePerColumn = true
        param.fillPerColumn = true

        param.rollColor = "#696868";
        param.mainBoardColor = "#cfe3e8";
        param.finColor = "#acafb0";

        return param;
    }

    setDimensions() {
        super.setDimensions();
        this.rollsMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.rollColor });
        this.mainBoardMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.mainBoardColor });
        this.finMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.finColor });

        this.rotationSpeed = 0.001;
        this.minRotationAngle = Math.PI /2
        this.maxRotationAngle = Math.PI * 0.6;
        this.rotationAngle = this.minRotationAngle;
        
        this.minZPosition = -5;
        this.maxZPosition = 0;
        this.ZPosition = this.minZPosition;
        this.ZSpeed = (this.maxZPosition - this.minZPosition) / (this.maxRotationAngle - this.minRotationAngle) * this.rotationSpeed


    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
        //super.makeSlides();
        /* make lateral supports for the bottom tubes */
        let p = this.parameters;
        let slideGeometry = new THREE.BoxGeometry(this.parameters.slideThickness, this.depth, this.parameters.slideHeight);
        let slideLeft = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(-this.width / 2 + this.parameters.slideThickness / 2, -this.depth / 2, p.slideHeight / 2));
        this.blockObjectFixed.add(slideLeft);
        let slideRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(this.width / 2 - this.parameters.slideThickness / 2, -this.depth / 2, p.slideHeight / 2));
        this.blockObjectFixed.add(slideRight);

        let backRoll = ThreeUtilities.returnCylinder(new THREE.Vector3(-this.width / 2 + p.slideThickness, -this.depth * p.rollFraction, p.slideHeight / 2), new THREE.Vector3(this.width/ 2 - p.slideThickness, -this.depth * p.rollFraction, p.slideHeight / 2), p.rollRadius, this.rollsMaterial, 16);
        this.blockObjectFixed.add(backRoll);

        let frontRoll = ThreeUtilities.returnCylinder(new THREE.Vector3(-this.width / 2 + p.slideThickness, -this.depth *(1 - p.rollFraction), p.slideHeight / 2), new THREE.Vector3(this.width/ 2 - p.slideThickness, -this.depth *(1 - p.rollFraction), p.slideHeight / 2), p.rollRadius, this.rollsMaterial, 16);
        this.blockObjectFixed.add(frontRoll);

        /* estimate the number of board slots */
        let numberOfBoards = Math.floor((this.width  - p.comeWidth) / (p.comeWidth + p.boardSlot));
        let boardSlot = (this.width - p.comeWidth * (numberOfBoards + 1)) / numberOfBoards;

        let depthRatioEdge = 1; //if we eventually want to come to protrude
        let depthRatioCenter = 0.9;

        const shape = new THREE.Shape();
        shape.moveTo(-this.width / 2,0);
        shape.lineTo(this.width/2 , 0);
        shape.lineTo(this.width/2 , -this.depth * depthRatioEdge);
        shape.lineTo(this.width/2 - p.comeWidth, -this.depth * depthRatioEdge);
        shape.lineTo(this.width/2 - p.comeWidth, -p.backWidth);
        for (let i = 0; i < numberOfBoards - 1; i++) {
            shape.lineTo(this.width/2 - (p.comeWidth + boardSlot) * (i + 1), -p.backWidth);
            shape.lineTo(this.width/2 - (p.comeWidth + boardSlot) * (i + 1), -this.depth * depthRatioCenter);
            shape.lineTo(this.width/2 - (p.comeWidth + boardSlot) * (i + 1) - p.comeWidth, -this.depth * depthRatioCenter);
            shape.lineTo(this.width/2 - (p.comeWidth + boardSlot) * (i + 1) - p.comeWidth, -p.backWidth);
        }

        shape.lineTo(-this.width / 2 + p.comeWidth, -p.backWidth);
        shape.lineTo(-this.width / 2 + p.comeWidth, -this.depth * depthRatioEdge);
        shape.lineTo(-this.width / 2, -this.depth * depthRatioEdge);
        shape.lineTo(-this.width / 2, 0);

        let extrudeSettings = {
            steps: 2,
            depth: p.comeThickness ,
            bevelEnabled: false,
        }

        let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        let comeMesh = ThreeUtilities.returnGroupAtDetailedCoord(geometry, this.blockObjectMaterial, new THREE.Vector3(0, 0, p.comeHeight));
        this.blockObjectFixed.add(comeMesh);

        this.sceneManager.objectCache.loadObject("surfboard", (objectName) => {
            objectName.position.set(-this.width / 2 + 7,-this.depth/2,this.minZPosition);
            this.boardObject = objectName

            this.boardObject.children[1].traverse((child) => {
                if (child.isMesh) {
                    child.material = this.mainBoardMaterial;
                }
            });
    
            this.boardObject.children[0].traverse((child) => {
                if (child.isMesh) {
                    child.material = this.finMaterial;
                }
            });

            this.blockObjectFixed.add(objectName);
        }, false, undefined, true);


    }

    changeObjectColor(color) {
        /* overwrite for unique objects like gltf imports that need to be traversed */
        //super.changeObjectColor(color);
        this.blockObjectMaterial.color.set(color == undefined ? this.parameters.objectColor : color);
        this.rollsMaterial.color.set(color == undefined ? this.parameters.rollColor : color);
        this.mainBoardMaterial.color.set(color == undefined ? this.parameters.mainBoardColor : color);
        this.finMaterial.color.set(color == undefined ? this.parameters.finColor : color);

    }

    makeMovingObject() {
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

    updateAnimation(timeOffset) {
        let p = this.parameters;
        if (this.animationStatus == 1) {
            /* animate out */
            this.rotationAngle += this.rotationSpeed * timeOffset;
            this.ZPosition += this.ZSpeed * timeOffset;
            if (this.rotationAngle >= this.maxRotationAngle) {
                this.rotationAngle = this.maxRotationAngle;
                this.animationStatus = 2;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        } else if (this.animationStatus == 3) {
            this.rotationAngle -= this.rotationSpeed * timeOffset;
            this.ZPosition -= this.ZSpeed * timeOffset;
            if (this.rotationAngle <= this.minRotationAngle) {
                this.rotationAngle = this.minRotationAngle;
                this.animationStatus = 0;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        }
        //console.log(this.rotationAngle)
        this.boardObject.rotation.x = this.rotationAngle;
        this.boardObject.position.z = this.ZPosition;
    }

    /* once done, also update shelf.js blockList and imports */

}