import { SceneEntity } from '../sceneManager.js';
import ThreeUtilities from '../threeUtilities.js';
import { LinearModifier, PlanarModifier } from '../modifier.js';
import * as THREE from 'three';
import Column from '../column.js';

//import PullDesk from './pullDesk.js';

/* class containing all the information for blocks: units that are filling-up shelves. Each block contain information to draw itself and position itself within a column */
export default class Block extends SceneEntity {
    constructor(sceneManager, shelf, variationName = "defaultBlock") {
        super(sceneManager, undefined, "block");

        this.variationName = variationName;

        this.shelf = shelf; // blocks are attached to shelves when created. They can then assigned themselved to columns and position themselves.

        this.boundUpdateAnimation = this.updateAnimation.bind(this);

        this.score = 0; //score of the findBestPosition when this block was inserted.

        this.setParameters();
        this.applyVariationParameters();
    }

    findBestPosition(insert = true) {
        /* make a list of all the possible options to fit this block in this shelf
        TODO: Could be more efficient, for example by starting from ideal height, or by smarter search */
        let bestOption = {
            score: 0,
        }
        this.shelf.columns.forEach(column => {
            for (var i = 0; i < column.maxZIndex(); i++) {
                let score = this.scoreOption(column, i);
                if (score > 0 && score > bestOption.score) {
                    bestOption = {
                        score: score,
                        column: column,
                        zIndex: i,
                    }
                }
            }
        });

        if (insert && bestOption.score != 0) {
            /* we found one valid solution. */
            this.score = bestOption.score;
            this.setColumn(bestOption.column).setZIndex(bestOption.zIndex).update();
        }

        return this;
    }

    checkOptionAvailability(column, zIndex) {
        /* checks if this option is available. Overwrite by subclass if needs more complex logic */
        let param = this.parameters;

        /* check availability of placement */
        for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
            if (i < 0 || i > column.maxZIndex() || column.rightOccupants[i] != undefined) { return false }
        }
        for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
            if (i < 0 || i > column.maxZIndex() || column.leftOccupants[i] != undefined) { return false }
        }
        for (var i = zIndex - param.centerSlotsOccupyBelow; i < zIndex + param.centerSlotsOccupyAbove; i++) {
            if (i < 0 || column.centerOccupants[i] != undefined) { return false }
        }
        return true;
    }

    scoreOption(column, zIndex) {
        /* score the option of placing the block in the given column at the given zIndex */
        let param = this.parameters;

        if (!this.checkOptionAvailability(column, zIndex)) { return 0 }

        if (param.onePerColumn) {
            for (var i = 0; i < column.blocks.length; i++) {
                if (column.blocks[i].variationName == this.variationName) {
                    return 0;
                }
            }
        }

        /* vertical score */
        let optionHeight = zIndex * column.verticalStep;
        let verticalScore;
        if (param.referenceIsBottom) {
            if (optionHeight < param.minDistanceFromReference || optionHeight > param.maxDistanceFromReference) { return 0 }
            verticalScore = Math.abs(optionHeight - param.idealDistanceFromReference) / column.height;
        } else {
            if (optionHeight < column.height - param.maxDistanceFromReference || optionHeight > column.height - param.minDistanceFromReference) { return 0 }
            verticalScore = Math.abs(optionHeight - (column.height - param.idealDistanceFromReference)) / column.height;
        }

        /* horizontal score */
        let horizontalScore = Math.abs(column.returnIndex() / this.shelf.columns.length - param.idealHorizontalLocation);

        /* width score */
        if (column.width < param.minWidth || column.width > param.maxWidth) { return 0 }
        let widthScore = Math.abs(column.width - param.idealWidth) / param.idealWidth;

        let score = 100 - (verticalScore * param.verticalWeight + horizontalScore * param.horizontalWeight + widthScore * param.widthWeight);

        return score;
    }

    setColumn(column) {
        this.parent = column;
        column.object.add(this.object); // important because column object is centered on column
        column.blocks.push(this); //add to parent's list of blocks. Not sure if this should be handled by this or parents.

        return this;
    }

    setOccupancyAtIndex(zIndex) {
        /* occupy the column objects according to block size */
        let param = this.parameters;
        for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
            this.parent.rightOccupants[i] = this;
        }
        for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
            this.parent.leftOccupants[i] = this;
        }
        for (var i = zIndex - param.centerSlotsOccupyBelow; i < zIndex + param.centerSlotsOccupyAbove; i++) {
            this.parent.centerOccupants[i] = this;
        }
    }

    releaseOccupancy() {
        /* removes this block from the parent column block array */
        this.parent.blocks.splice(this.parent.blocks.indexOf(this), 1);

        /* release the occupancy of the column */
        let param = this.parameters;
        let zIndex = this.zIndex;
        for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
            this.parent.rightOccupants[i] = undefined;
        }
        for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
            this.parent.leftOccupants[i] = undefined;
        }
        for (var i = zIndex - param.centerSlotsOccupyBelow; i < zIndex + param.centerSlotsOccupyAbove; i++) {
            this.parent.centerOccupants[i] = undefined;
        }
    }

    setZIndex(zIndex) {
        this.zIndex = zIndex;

        this.setOccupancyAtIndex(zIndex);

        return this;
    }

    static parameters() {
        return {

            variations: [
                {
                    variationName: "defaultBlock",
                    variationParameters: {
                    }
                }
            ],

            slideColor: "#ffffe6",
            objectColor: "#ffffe6",

            startBlockListFillingCoefficient: 0.8,

            maxDistanceFromReference: 100,
            minDistanceFromReference: 6,
            idealDistanceFromReference: 10,
            referenceIsBottom: true,
            verticalWeight: 1, //compared to other blocks we are trying to put in

            idealHorizontalLocation: 0, //compared to other blocks we are trying to put in
            horizontalWeight: 1, //compared to other blocks we are trying to put in
            columns: 1, //eventually a block could span multiple columns
            minWidth: 0,
            maxWidth: 100,
            idealWidth: 15,
            widthWeight: 1,
            widthMargin: 0.5, //margin from edge of partition to edge of block.

            minHeight: 10,
            maxHeight: 20,
            idealHeight: 15,
            heighWeight: 1,

            slideHeight: 2.25,
            slideRecess: 0.375, //how much the slide opening is recessed
            slideThickness: 0.75,
            sliderThickness: 0.75,

            depthOffset: 0, //relative to front of column. Positive would be proud (stick out)

            allowSlide: true, //slides when clicked on
            maxPullOutOffset: 5, //how far it can be pulled out relative to depth
            pullOutSpeed: 0.1, //how fast it pulls out

            rightSlotsOccupyAbove: 1, //how many slots above the reference slot it occupies. Including where it is attached
            rightSlotsOccupyBelow: 0,
            leftSlotsOccupyAbove: 1,
            leftSlotsOccupyBelow: 0,
            centerSlotsOccupyAbove: 1,
            centerSlotsOccupyBelow: 0,

            priority: 2, //to decide the order in which the blocks are placed
            onePerColumn: false, //if true, only one block of this type can be placed per column. Maybe always the same as fillPerColumn?
            fillPerColumn: false //if true, the 0-1 number in gui indicates the percentage of columns that should be filled. All fillPercolumn blocks should be placed first. 
        }
    }

    applyVariationParameters() {
        /* update the parameters that are modified by the variation */
        let variation = this.parameters.variations.find(variation => variation.variationName == this.variationName)
        let variationParameters = variation.variationParameters;

        for (var key in variationParameters) {
            this.parameters[key] = variationParameters[key];
        }
    }

    setParameters() {
        this.parameters = Block.parameters();
    }

    keepAfterColumnResize() {
        /* check if the width of the block is within the column */
        let param = this.parameters;
        if (this.parent.width < param.minWidth || this.parent.width > param.maxWidth) {
            return false;
        }

        /* check if the max used height still fits within the column */
        let zMargin = this.parent.maxZIndex() - this.zIndex;
        if (param.rightSlotsOccupyAbove > zMargin || param.leftSlotsOccupyAbove > zMargin) {
            return false;
        }

        return true;
    }

    setDimensions() {
        /* Creates important dimensions based on parameters generally should not be overwritten */
        let param = this.parameters;

        this.blockSlidesMaterial = new THREE.MeshLambertMaterial({ color: param.slideColor });
        this.blockObjectMaterial = new THREE.MeshLambertMaterial({ color: param.objectColor });

        this.height = param.idealHeight;
        this.width = this.parent.width - this.parent.partitionThickness - 2 * param.widthMargin;
        this.depth = this.parent.depth; //has to fit within parent column.
        this.zPosition = this.zIndex * this.parent.verticalStep + this.parent.startStep;
        this.pullOutPosition = 0; //will be used for animation
        this.maxPullOut = this.depth - param.maxPullOutOffset;
        this.animationStatus = 0; //0 is stored, 1 is in transition, 2 is pulled out, 3 is transition in
    }

    update() {
        /* called whenever we need to update the rendering of the block */

        /* delete any previous elements */
        if (this.blockObjectFixed) {
            ThreeUtilities.disposeHierarchy(this.blockObjectFixed);
        }
        if (this.blockObjectMoving) {
            ThreeUtilities.disposeHierarchy(this.blockObjectMoving);
        }

        this.setDimensions();

        /* prepare the objects that all  blocks should use. */
        this.object.position.set(0, 0, this.zPosition);
        this.blockObjectFixed = new THREE.Group();
        this.blockObjectMoving = new THREE.Group();
        this.object.add(this.blockObjectFixed);
        this.object.add(this.blockObjectMoving);

        this.makeSlides();
        this.makeMovingObject()
    }

    makeSlides() {

        let shape = new THREE.Shape();
        let param = this.parameters;
        shape.moveTo(-param.slideHeight / 2, 0);
        shape.lineTo(param.slideHeight / 2, 0);
        shape.lineTo(param.slideHeight / 2, param.slideThickness);
        shape.lineTo(param.sliderThickness / 2, param.slideThickness);
        shape.lineTo(param.sliderThickness / 2, param.slideThickness - param.slideRecess);
        shape.lineTo(-param.sliderThickness / 2, param.slideThickness - param.slideRecess);
        shape.lineTo(-param.sliderThickness / 2, param.slideThickness);
        shape.lineTo(-param.slideHeight / 2, param.slideThickness);
        shape.lineTo(-param.slideHeight / 2, 0);

        const extrudeSettings = {
            steps: 1,
            depth: this.depth,
            bevelEnabled: false,
        };

        let slideGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        let slideMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(this.parent.width / 2 - this.parent.partitionThickness / 2, 0, param.slideHeight / 2), this.sceneManager.zAxis, this.sceneManager.xAxis.clone().negate(), this.sceneManager.yAxis.clone().negate(), true);


        //let slideGeometry = new THREE.BoxGeometry(this.parameters.slideThickness, this.depth, this.parameters.slideHeight);
        // let slideMeshRight = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshRight.position.set(this.parent.width/2 - this.parent.partitionThickness / 2 - slideThickness/2, -this.depth/2, 0);
        // slideMeshRight.add(ThreeUtilities.returnObjectOutline(slideMeshRight))
        this.blockObjectFixed.add(slideMeshRight);

        let slideMeshLeft = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(-this.parent.width / 2 + this.parent.partitionThickness / 2, 0, param.slideHeight / 2), this.sceneManager.zAxis.clone().negate(), this.sceneManager.xAxis.clone(), this.sceneManager.yAxis.clone().negate(), true);

        // let slideMeshLeft = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshLeft.position.set(-this.parent.width/2 + this.parent.partitionThickness / 2 + slideThickness/2, -this.depth/2, 0);
        // slideMeshLeft.add(ThreeUtilities.returnObjectOutline(slideMeshLeft))
        this.blockObjectFixed.add(slideMeshLeft);
    }

    makeMovingObject() {
        /* create the block. Vertically centered on the attachment index. Shift as needed. */
        let blockGeometry = new THREE.BoxGeometry(this.width, this.depth, this.height);
        blockGeometry.translate(0, -this.depth / 2, this.parameters.slideHeight / 2);
        this.blockMesh = new THREE.Mesh(blockGeometry, this.blockObjectMaterial);
        this.blockMesh.add(ThreeUtilities.returnObjectOutline(this.blockMesh))
        this.blockObjectMoving.add(this.blockMesh);

        this.makeClickable(this.blockMesh);
    }

    updateAnimation(timeOffset) {
        let param = this.parameters;
        if (this.animationStatus == 1) {
            this.pullOutPosition += param.pullOutSpeed * timeOffset;
            if (this.pullOutPosition >= this.maxPullOut) {
                this.pullOutPosition = this.maxPullOut;
                this.animationStatus = 2;
                this.sceneManager.removeTimerCallback(this.sceneID);
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

    animateOut() {
        this.animationStatus = 1;
        this.sceneManager.pushTimerCallback(this.boundUpdateAnimation, this.sceneID);
    }

    animateIn() {
        this.animationStatus = 3;
        this.sceneManager.pushTimerCallback(this.boundUpdateAnimation, this.sceneID);
    }

    justClicked() {
        /* called when the block is clicked on */

        console.log("clicked on block: " + this.variationName);
        console.log("vertical Index: " + this.zIndex);

        if (this.parameters.allowSlide && this.animationStatus == 0) {
            this.animateOut();
        } else if (this.parameters.allowSlide && this.animationStatus == 2) {
            this.animateIn();
        }

        return true; //interrupts the click propagation
    }


    hoveredIn() {
        this.blockMesh.material.color.set(this.sceneManager.defaults.selection.colorHovered);
    }

    hoveredOut() {
        this.blockMesh.material.color.set(this.selected ? this.sceneManager.defaults.selection.colorSelected : this.parameters.objectColor);
    }

    deleteEntity(releaseOccupancy = true, updateShelfFilling = true) {
        /* need to update the GUI */
        if (updateShelfFilling) {
            let shelf = this.findAncestorWithType("shelf");
            shelf.shelfFilling[this.variationName]--;
            shelf.shelfFillingList.forEach(block => {
                if (block.block.parameters().name == this.parameters.name) {
                    block.installedBlocks.splice(block.installedBlocks.indexOf(this), 1);
                    block.actualFilled--;
                    block.controller.updateDisplay();
                }
            })
        }

        /* need to remove this block from column and lists */
        if (releaseOccupancy) this.releaseOccupancy();

        //console.log("deleting block: " + this.parameters.name)

        //ThreeUtilities.disposeHierarchy(this.blockObjectMoving);

        super.deleteEntity();

    }

}

export class FixedShelf extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    static parameters() {
        let param = super.parameters();

        param.variations = [
            {
                variationName: "Fixed shelf",
                variationParameters: {
                }
            }
        ],

            param.slideColor = "#ccddff";
        param.objectColor = "#ccddff";

        param.widthMargin = 0.1;

        param.maxDistanceFromReference = 10000;
        param.minDistanceFromReference = 0;

        param.minHeight = 0.75;
        param.maxHeight = 0.75;
        param.idealHeight = 0.75;
        param.allowSlide = false;

        param.rightSlotsOccupyAbove = 2; //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow = 0;
        param.leftSlotsOccupyAbove = 2;
        param.leftSlotsOccupyBelow = 0;
        param.centerSlotsOccupyAbove = 2;
        param.centerSlotsOccupyBelow = 0;

        param.priority = 1
        param.fillPerColumn = false

        return param;
    }

    setParameters() {
        this.parameters = FixedShelf.parameters();
    }

    makeSlides() {
        /* no slides */
    }
}

export class PullShelf extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    static parameters() {
        let param = super.parameters();

        param.variations = [
            {
                variationName: "Pull-out Shelf",
                variationParameters: {
                }
            }
        ],

            param.slideColor = "#ccddff";
        param.objectColor = "#ccddff";

        param.minHeight = 0.75;
        param.maxHeight = 0.75;
        param.idealHeight = 0.75;
        param.allowSlide = true;

        param.maxWidth = 30;

        param.referenceIsBottom = true;
        param.minDistanceFromReference = 0;
        param.maxDistanceFromReference = 1000;
        param.idealDistanceFromReference = 10;

        param.rightSlotsOccupyAbove = 2; //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow = 0;
        param.leftSlotsOccupyAbove = 2;
        param.leftSlotsOccupyBelow = 0;
        param.centerSlotsOccupyAbove = 2;
        param.centerSlotsOccupyBelow = 0;

        param.priority = 2
        param.fillPerColumn = false

        return param;
    }

    setParameters() {
        this.parameters = PullShelf.parameters();
    }
}

