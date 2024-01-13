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

export default class ShippingStation extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = ShippingStation.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        param.variations = [
            {
                variationName: "Shipping Station",
                variationParameters: {
                    rightSlotsOccupyAbove: 8,
                    rightSlotsOccupyBelow: 0,
                    leftSlotsOccupyAbove: 8,
                    leftSlotsOccupyBelow: 0,
                    centerSlotsOccupyAbove: 8,
                    centerSlotsOccupyBelow: 0,
                }
            }
        ]

        param.cardboardColor = "#8f7b71";

        param.referenceIsBottom = true;
        param.idealDistanceFromReference = 32;
        param.tubeDiameter = 1.5;
        param.slideHeight = 3;

        param.widthMargin = 0;
        param.shelfThickness = 0.75

        param.priority = 2
        param.onePerColumn = true
        param.fillPerColumn = true

        param.allowSlide = true

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    setDimensions() {
        super.setDimensions();
        this.cardboardMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.cardboardColor });
        this.pullPosition = 0;
        this.maxPullOut = this.depth;
        this.cardboardThickness = 0.5;
    }

    makeSlides() {
        let shelf = this.findAncestorWithType("shelf");
        let step = shelf.verticalStep;
        let p = this.parameters;
        let slideHeight = p.centerSlotsOccupyAbove * step / 2;

        let slideGeometry = new THREE.BoxGeometry(p.slideThickness, this.depth, p.slideHeight);
        let slideMesh = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockObjectMaterial, new THREE.Vector3(this.width / 2 - p.slideThickness / 2, -this.depth / 2, slideHeight));
        this.blockObjectFixed.add(slideMesh);
        let slideMesh2 = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockObjectMaterial, new THREE.Vector3(-this.width / 2 + p.slideThickness / 2, -this.depth / 2, slideHeight));
        this.blockObjectFixed.add(slideMesh2);

        /* add main cylinder */
        let cylinder = ThreeUtilities.returnCylinder(new THREE.Vector3(-this.width / 2 + p.slideThickness, -this.depth / 2, slideHeight), new THREE.Vector3(this.width / 2 - p.slideThickness, -this.depth / 2, slideHeight), p.tubeDiameter / 2, this.blockObjectMaterial, 10)
        this.blockObjectFixed.add(cylinder);

        /* figure out max paper radius */
        let maxRadius = Math.min(this.depth / 2, slideHeight) * 0.9;
        this.maxRadius = maxRadius;
        this.paperWidthStart = 6;
        let radiusDown = 0.8;
        let paperWidthEnd = 4;
        let paperWidth = this.paperWidthStart;
        let gap = 1;
        let xCylinder = - this.width/2 + p.slideThickness;

        let counter = 0;
        while (xCylinder + paperWidth < this.width / 2 - p.slideThickness) {
            let nextRoll = ThreeUtilities.returnCylinder(new THREE.Vector3(xCylinder, -this.depth / 2, slideHeight), new THREE.Vector3(xCylinder + paperWidth, -this.depth / 2, slideHeight), maxRadius, this.cardboardMaterial, 16)
            counter++;
            this.blockObjectFixed.add(nextRoll);
            xCylinder += paperWidth + gap;
            if (counter == 1) {
                paperWidth = paperWidthEnd;
                maxRadius = maxRadius * radiusDown;
            }
        }
        this.rollHeight = slideHeight



    }

    changeObjectColor(color) {
        if (color == undefined) {
            this.cardboardMaterial.color.set(this.parameters.cardboardColor);
        } else {
            this.cardboardMaterial.color.set(color);
        }
        /* overwrite for unique objects like gltf imports that need to be traversed */
        super.changeObjectColor(color);
        
    }

    updateAnimation(timeOffset) {
        let param = this.parameters;
        if (this.animationStatus == 1) {
            /* animate out */
            this.pullPosition += param.pullOutSpeed * timeOffset;
            if (this.pullPosition >= this.maxPullOut) {
                this.pullPosition = this.maxPullOut;
                this.animationStatus = 2;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        } else if (this.animationStatus == 3) {
            this.pullPosition -= param.pullOutSpeed * timeOffset;
            if (this.pullPosition <= 0) {
                this.pullPosition = 0;
                this.animationStatus = 0;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        }
        if (this.pullBlock != undefined) {
            ThreeUtilities.disposeHierarchy(this.pullBlock);
        }
        let pullBlockGeom = new THREE.BoxGeometry(this.paperWidthStart, this.pullPosition, this.cardboardThickness);
        pullBlockGeom.translate(-this.width/ 2 + this.parameters.slideThickness + this.paperWidthStart / 2, -this.depth / 2 - this.pullPosition / 2, this.rollHeight - this.maxRadius + this.cardboardThickness / 2);
        this.pullBlock = new THREE.Mesh(pullBlockGeom, this.cardboardMaterial);
        //this.pullBlock = ThreeUtilities.returnGroupAtDetailedCoord(pullBlockGeom, this.cardboardMaterial, new THREE.Vector3(0, 0, 0));
        this.blockObjectMoving.add(this.pullBlock);
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        /* make main shelf */
        let p = this.parameters;
        let shelf = this.findAncestorWithType("shelf");
        let step = shelf.verticalStep;
        let slideHeight = p.centerSlotsOccupyAbove * step / 2;
        let boxGeom = new THREE.BoxGeometry(this.width, this.depth, slideHeight * 2);
        boxGeom.translate(0, -this.depth / 2, slideHeight);
        this.blockMesh = new THREE.Mesh(boxGeom, this.blockObjectMaterial);
        this.blockMesh.visible = false;
        this.blockObjectMoving.add(this.blockMesh);
        this.makeClickable(this.blockMesh);

    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth, y: this.parameters.slideHeight, quantity: 2, thickness: 0.75 });

        /* additional hardware */
        cost.hardwareList.push({
            name: "pins",
            unitCost: 0.05,
            parameters: {},
            quantity: 4
        });
        cost.hardwareList.push({
            name: "roll",
            unitCost: 0.5 * this.width,
            parameters: {},
            quantity: 1
        });

        return cost;
    }

    /* once done, also update shelf.js blockList and imports */

}