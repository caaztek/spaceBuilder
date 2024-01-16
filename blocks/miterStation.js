import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';
import PullDesk from './pullDesk.js';

/* default template.
1. Change TemplateName
2. Update SetParameter with chosenName.parameters()
3. Change param.name with proper name. Update all other parameters as necessary
4. Make custom score if necessary
5. Uodpate makeSlides() as necessary. Can start from super.makeSlides() if useful. It will make standard slides with a slot
6. Update makeMovingObject() as necessary. Can start from super.makeMovingObject() if useful. It will make standard moving object with a slot
7. In Shelf.js, import /block/templateName.js and update setBlockList to include the new block type
 */

export default class MiterStation extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = MiterStation.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        param.variations = [
            {
                variationName: "Miter Station",
                variationParameters: {
                    rightSlotsOccupyAbove: 5,
                    rightSlotsOccupyBelow: 1,
                    leftSlotsOccupyAbove: 5,
                    leftSlotsOccupyBelow: 1,
                    centerSlotsOccupyAbove: 5,
                    centerSlotsOccupyBelow: 1,
                    centerSlotsOccupyAboveForced: 5,
                    centerSlotsOccupyBelowForced: 1,
                }
            }
        ]

        param.referenceIsBottom = true;
        param.idealDistanceFromReference = 32;

        param.idealHorizontalLocation = 0.5; //center so we can support wood on both sides

        param.minWidth = 30;
        param.widthMargin = 0.25;

        param.heightAboveTick = 1.5;
        param.slabTop = 3.23; // given by the miter saw design. Distance between base and top of the slab
        param.sawOffsetY = 15; //shift the model forward by that much. Needs to clear the wall when pushed, and wood has to clear front when pulled
        param.sliderMargin = 0.75; //distance between slide and slider on each edge.
        param.slideThickness = 0.75;
        param.slabThickness = 0.75;
        param.sliderThickness = 0.75;
        param.sliderStickOut = 2; //similar to pullDesk
        param.maxPullOutOffset = 15.5

        param.woodLength = 70; 
        param.woodY = 3.5;
        param.woodYMargin = 0.5;
        param.woodZ = 1.5;
        param.woodColor = "#9c856a"

        param.priority = 12
        param.onePerColumn = true
        param.fillPerColumn = true

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
        //super.makeSlides();
    }

    setZIndex(zIndex, erase = true, useForce = false) {
        this.zIndex = zIndex;

        this.setOccupancyAtIndex(zIndex, erase,useForce);

        /* try to install a pull-out desk on the left and right */
        if (this.parent.leftPartition.leftColumn != undefined) {
            let targetColumn = this.parent.leftPartition.leftColumn;
            let pullDesk = new PullDesk(this.sceneManager, this.parent.parent, "Pull-out desk");
            if (pullDesk.checkOptionAvailability(targetColumn,this.zIndex,true,true,false)) {
                pullDesk.setColumn(targetColumn).setZIndex(this.zIndex).addToShelfFilling().update();
            }
        }
        /* same on the right */
        if (this.parent.rightPartition.rightColumn != undefined) {
            let targetColumn = this.parent.rightPartition.rightColumn;
            let pullDesk = new PullDesk(this.sceneManager, this.parent.parent, "Pull-out desk");
            if (pullDesk.checkOptionAvailability(targetColumn,this.zIndex,true,true,false)) {
                pullDesk.setColumn(targetColumn).setZIndex(this.zIndex).addToShelfFilling().update();
            }
        }

        return this;
    }

    setDimensions() {
        super.setDimensions();
        this.woodMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.woodColor });
    }

    changeObjectColor(color) {
        /* overwrite for unique objects like gltf imports that need to be traversed */
        super.changeObjectColor(color);
    }

    makeMovingObject() {
        /* make the main wooden support */
        let p = this.parameters;
        let step = this.findAncestorWithType("shelf").verticalStep;
        let heightAbove = p.heightAboveTick;
        let heightBelow = step * p.leftSlotsOccupyBelow;
        let totalHeight = heightAbove + heightBelow;
        let totalSlideHeight = totalHeight - p.sliderMargin * 2;
        let offsetFromTick = heightAbove - totalHeight / 2;
        let slabAbove = heightAbove - p.slabTop;

        /* make slides */
        let slideGeom = new THREE.BoxGeometry(p.sliderThickness, this.depth, totalSlideHeight);
        let slideMeshLeft = ThreeUtilities.returnGroupAtDetailedCoord(slideGeom, this.blockSlidesMaterial, new THREE.Vector3(-this.width / 2 + p.slideThickness / 2 - p.widthMargin, -this.depth/2, offsetFromTick));
        this.blockObjectFixed.add(slideMeshLeft);
        let slideMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeom, this.blockSlidesMaterial, new THREE.Vector3(this.width / 2 - p.slideThickness / 2 + p.widthMargin, -this.depth/2, offsetFromTick));
        this.blockObjectFixed.add(slideMeshRight);

        /* make sliders */
        let sliderGeom = new THREE.BoxGeometry(p.sliderThickness, this.depth + p.sliderStickOut, totalHeight);
        let sliderMeshLeft = ThreeUtilities.returnGroupAtDetailedCoord(sliderGeom, this.blockObjectMaterial, new THREE.Vector3(-this.width / 2 + p.slideThickness / 2, -this.depth/2 - p.sliderStickOut / 2, offsetFromTick));
        this.blockObjectMoving.add(sliderMeshLeft);
        let sliderMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(sliderGeom, this.blockObjectMaterial, new THREE.Vector3(this.width / 2 - p.slideThickness / 2, -this.depth/2 - p.sliderStickOut / 2, offsetFromTick));
        this.blockObjectMoving.add(sliderMeshRight);

        /* make slab */
        let slabGeom = new THREE.BoxGeometry(this.width - p.sliderThickness * 2, this.depth + p.sliderStickOut, p.slabThickness);
        let slabMesh = ThreeUtilities.returnGroupAtDetailedCoord(slabGeom, this.blockObjectMaterial, new THREE.Vector3(0, -this.depth/2 - p.sliderStickOut / 2, slabAbove - p.slabThickness / 2));
        this.blockObjectMoving.add(slabMesh);

        /* make 2x4 */
        let woodGeom = new THREE.BoxGeometry(p.woodLength, p.woodY, p.woodZ);
        this.woodMesh = ThreeUtilities.returnGroupAtDetailedCoord(woodGeom, this.woodMaterial, new THREE.Vector3(0, -this.depth - p.woodY / 2 - p.woodYMargin, heightAbove + p.woodZ / 2));
        this.blockObjectFixed.add(this.woodMesh);
        this.woodMesh.visible = false; //only show after the animation


        /* if customized, make sure to add this.makeClickable(object to click) */
        this.sceneManager.objectCache.loadObject("miterSaw", (objectName) => {
            objectName.position.set(0, -this.depth/2, slabAbove);
            this.blockObjectMoving.add(objectName);
        },true,undefined,true);
    }

    animateOut() {
        this.animationStatus = 1;
        this.sceneManager.pushTimerCallback(this.boundUpdateAnimation, this.sceneID);

        /* look for neighboring columns */
        this.leftDesk = undefined;
        this.rightDesk = undefined;
        if (this.parent.leftPartition.leftColumn != undefined && this.parent.leftPartition.leftColumn.rightOccupants[this.zIndex].variationName == "Pull-out desk") {
            this.leftDesk = this.parent.leftPartition.leftColumn.rightOccupants[this.zIndex];
            this.leftDesk.animateOut();
        }
        if (this.parent.rightPartition.rightColumn != undefined && this.parent.rightPartition.rightColumn.leftOccupants[this.zIndex].variationName == "Pull-out desk") {
            this.rightDesk = this.parent.rightPartition.rightColumn.leftOccupants[this.zIndex];
            this.rightDesk.animateOut();
        }

    }

    animateIn() {
        this.animationStatus = 3;
        this.woodMesh.visible = false;
        this.sceneManager.pushTimerCallback(this.boundUpdateAnimation, this.sceneID);
        if (this.leftDesk != undefined) this.leftDesk.animateIn();
        if (this.rightDesk != undefined) this.rightDesk.animateIn();
    }

    updateAnimation(timeOffset) {
        let param = this.parameters;
        if (this.animationStatus == 1) {
            this.pullOutPosition += param.pullOutSpeed * timeOffset;
            if (this.pullOutPosition >= this.maxPullOut) {
                this.pullOutPosition = this.maxPullOut;
                this.animationStatus = 2;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.woodMesh.visible = true;
                this.callAllUpdates("reachEnd");
            }
        } else if (this.animationStatus == 3) {
            this.pullOutPosition -= param.pullOutSpeed * timeOffset;
            if (this.pullOutPosition <= 0) {
                this.pullOutPosition = 0;
                this.animationStatus = 0;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        }
        this.blockObjectMoving.position.set(0, -this.pullOutPosition, 0);
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