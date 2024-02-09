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

        /* handle move */
        this.boundPointerMove = this.onPointerMove.bind(this);
        this.boundPointerUp = this.onPointerUp.bind(this);
        this.colorMovedGoodPosition = "#03fc1c";
        this.colorMovedBadPosition = "#fc0303";
        this.snapColumnXMin = 5;
        this.snapColumnZMin = 2;
        this.moving = false;

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
            this.setColumn(bestOption.column)
            .setZIndex(bestOption.zIndex,true,false)
            .update();
        }

        return this;
    }

    estimateCost() {
        /* to be overriden by sub classes */
        return {
            desiredMargin: 0, //fixed margin we want on this particular block
            fixedCost: 0, //Consumables or assembly time for this particular module.
            plywoodUsage: 0, //in equivalent square inches of 0.75 plywood.
            plywoodCuts: [], //array of rectangular plywood cuts
            hardwareList: [], //list of hardware used
        }
    }

    checkOptionAvailability(column = this.parent, zIndex = this.zIndex, checkFit = true, checkOccupancy = true, usedForced = true) {
        /* checks if this option is available. Overwrite by subclass if needs more complex logic */
        let param = this.parameters;
        if (checkFit) {
            /* check if column width is within min/max width */
            if (column.width < param.minWidth || column.width > param.maxWidth) {
                return false;
            }

            /* check if the max used height still fits within the column */
            let zMargin = column.maxZIndex() - zIndex;
            if (param.rightSlotsOccupyAbove > zMargin || param.leftSlotsOccupyAbove > zMargin) {
                return false;
            }

            /* check if it fits below */
            if (zIndex - this.parameters.centerSlotsOccupyBelow < 0) return false;

            /* check if depth still works */
            if (column.depth < param.minDepth || column.depth > param.maxDepth) {
                return false;
            }
        }

        if (checkOccupancy) {
            /* check slot occupancy*/
            for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
                if (i < 0 || i > column.maxZIndex() || (column.occupants[i] != undefined && column.occupants[i].right != undefined)) { 
                    return false 
                }
            }
            for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
                if (i < 0 || i > column.maxZIndex() || (column.occupants[i] != undefined && column.occupants[i].left != undefined)) { 
                    return false 
                }
            }
            for (var i = zIndex - (usedForced? param.centerSlotsOccupyBelowForced : param.centerSlotsOccupyBelow); i < zIndex + (usedForced? param.centerSlotsOccupyAboveForced : param.centerSlotsOccupyAbove); i++) {
                /* potential problem: we override on the non-forced coefficient, so potentially the area above a fixed shelf could be occupied by a fixed desk. Shouldn't happen but not sure if it is a problem */
                if (i < 0) return false;
                else if (column.occupants[i] != undefined && column.occupants[i].center != undefined) {
                    if (!usedForced) return false;
                    //check if that block would still interfere if we used forced parameter.
                    let occupant = column.occupants[i].center;
                    if (i < occupant.zIndex + occupant.parameters.centerSlotsOccupyAboveForced && i >= occupant.zIndex - occupant.parameters.centerSlotsOccupyBelowForced) return false;
                }
            }
        }
        return true;
    }

    scoreOption(column, zIndex) {
        /* score the option of placing the block in the given column at the given zIndex */
        let param = this.parameters;

        if (!this.checkOptionAvailability(column, zIndex, true, true, false)) { 
            return 0 
        }

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

    setOccupancyAtIndex(zIndex, erase = true, usedForced = false) {
        /* occupy the column objects according to block size */
        let param = this.parameters;
        for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
            if (erase && this.parent.occupants[i] != undefined && this.parent.occupants[i].right != undefined) {
                this.parent.occupants[i].right.deleteEntity(true, true);
            }
            if (this.parent.occupants[i] == undefined) this.parent.occupants[i] = {};
            this.parent.occupants[i].right = this;
        }
        for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
            if (erase && this.parent.occupants[i] != undefined && this.parent.occupants[i].left != undefined) {
                this.parent.occupants[i].left.deleteEntity(true, true);
            }
            if (this.parent.occupants[i] == undefined) this.parent.occupants[i] = {};
            this.parent.occupants[i].left = this;
        }

        for (var i = zIndex - (usedForced ? param.centerSlotsOccupyBelowForced : param.centerSlotsOccupyBelow); i < zIndex + (usedForced ? param.centerSlotsOccupyAboveForced : param.centerSlotsOccupyAbove); i++) {
            if (erase && this.parent.occupants[i] != undefined && this.parent.occupants[i].center != undefined) {
                if (!usedForced) this.parent.occupants[i].center.deleteEntity(true, true);
                else {
                    let occupant = this.parent.occupants[i].center;
                    if (i < occupant.zIndex + occupant.parameters.centerSlotsOccupyAboveForced && i >= occupant.zIndex - occupant.parameters.centerSlotsOccupyBelowForced)
                        this.parent.occupants[i].center.deleteEntity(true, true);
                }
            }
            if (this.parent.occupants[i] == undefined) this.parent.occupants[i] = {};
            this.parent.occupants[i].center = this;
        }
    }

    releaseOccupancy() {
        /* removes this block from the parent column block array */
        this.parent.blocks.splice(this.parent.blocks.indexOf(this), 1);

        /* release the occupancy of the column */
        let param = this.parameters;
        let zIndex = this.zIndex;
        for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
            if (this.parent.occupants[i] != undefined && this.parent.occupants[i].right === this) this.parent.occupants[i].right = undefined; //check is necessary because during move another block has already taken the spot before this is deleted
        }
        for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
            if (this.parent.occupants[i] != undefined && this.parent.occupants[i].left === this) this.parent.occupants[i].left = undefined;
        }
        for (var i = zIndex - param.centerSlotsOccupyBelow; i < zIndex + param.centerSlotsOccupyAbove; i++) {
            if (this.parent.occupants[i] != undefined && this.parent.occupants[i].center === this) this.parent.occupants[i].center = undefined;
        }
    }



    setZIndex(zIndex, erase = true, useForce = false) {
        this.zIndex = zIndex;

        this.setOccupancyAtIndex(zIndex, erase,useForce);

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

            minDepth: 10,
            maxDepth: 100,
            idealDepth: 20,
            depthWeight: 0,

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
            centerSlotsOccupyAboveForced: 1, //when dragging a block above will only check forced
            centerSlotsOccupyBelowForced: 0,

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

    setDimensions() {
        /* Creates important dimensions based on parameters generally should not be overwritten */
        if (this.parameters.centerSlotsOccupyAboveForced == undefined) this.parameters.centerSlotsOccupyAboveForced = this.parameters.centerSlotsOccupyAbove;
        if (this.parameters.centerSlotsOccupyBelowForced == undefined) this.parameters.centerSlotsOccupyBelowForced = this.parameters.centerSlotsOccupyBelow;

        let param = this.parameters;

        this.blockSlidesMaterial = new THREE.MeshLambertMaterial({ color: param.slideColor });
        this.blockObjectMaterial = new THREE.MeshLambertMaterial({ color: param.objectColor });

        this.heightAbove = param.centerSlotsOccupyAboveForced * this.parent.verticalStep;
        this.heightBelow = param.centerSlotsOccupyBelowForced * this.parent.verticalStep;
        this.totalHeight = this.heightAbove + this.heightBelow;
        
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
        this.makeMovingObject();
        this.makeClickableBox();

        return this;
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

    }

    makeClickableBox() {
        /* create a clickable box that is the size of the block */
        let boxGeom = new THREE.BoxGeometry(this.width, this.depth, this.totalHeight);
        boxGeom.translate(0, -this.depth / 2, this.heightAbove - this.totalHeight / 2);
        this.clickBox = new THREE.Mesh(boxGeom, this.blockObjectMaterial);
        this.clickBox.visible = false;
        this.blockObjectMoving.add(this.clickBox);
        this.makeClickable(this.clickBox);
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

    onPointerMove(event) {
        let shelf = this.findAncestorWithType("shelf");
        this.sceneManager.updatePointer(event)
        let newPointMouse = shelf.getRayCastOnPlane();
        let delta = newPointMouse.clone().sub(this.startPointClick);

        /* find new worldPosition */
        let newShelfPosition = this.startBlockInShelfPosition.clone().add(delta);

        /* check if new world Position can snap to a columnworldX */
        this.foundSnap.found = false;
        for (var i = 0; i < shelf.columns.length; i++) {
            let column = shelf.columns[i];
            if (Math.abs(newShelfPosition.x - column.object.position.x) < this.snapColumnXMin) {
                let zIndex = Math.round((newShelfPosition.z - column.startStep) / column.verticalStep);
                //this.zIndex = zIndex;
                if (this.checkOptionAvailability(column, zIndex, true, false)) {
                    newShelfPosition.x = column.object.position.x;
                    newShelfPosition.z = column.startStep + zIndex * column.verticalStep;
                    this.foundSnap = {
                        found: true,
                        columnI: i,
                        zIndex: zIndex,
                    }
                    break;
                }
            }
        }
        this.changeObjectColor(this.foundSnap.found ? this.colorMovedGoodPosition : this.colorMovedBadPosition);

        this.object.position.copy(newShelfPosition);
    }

    onPointerUp(event) {
        this.sceneManager.switchControls(true);
        if (this.foundSnap.found) {
            /* add this block  to the right column*/
            let newBlock = new this.constructor(this.sceneManager, this.shelf, this.variationName)
                .setColumn(this.shelf.columns[this.foundSnap.columnI])
                .setZIndex(this.foundSnap.zIndex, true, true)
                .addToShelfFilling()
                .update();
        }
        this.deleteEntity(false,true);
        window.removeEventListener('pointermove', this.boundPointerMove, false);
        window.removeEventListener('pointerup', this.boundPointerUp, false);
    }

    justClicked() {
        /* called when the block is clicked on */
        //console.log("clicked on block: " + this.variationName);
        //console.log("vertical Index: " + this.zIndex);
        let shelf = this.findAncestorWithType("shelf");

        // let cost = this.estimateCost();
        // shelf.calculatePlywoodCost(cost);

        if (!this.moving && (this.sceneManager.keysDown["a"] || this.sceneManager.keysDown["A"])) {
            /* need to move the block when the cursor moves */
            this.startPointClick = shelf.getRayCastOnPlane();
            //this.startBlockPosition = this.object.position.clone();

            this.moving = true;

            let startBlockWorldPosition = new THREE.Vector3();
            this.object.getWorldPosition(startBlockWorldPosition);

            let startShelfWorldPosition = new THREE.Vector3();
            shelf.object.getWorldPosition(startShelfWorldPosition);

            this.startBlockInShelfPosition = startBlockWorldPosition.clone().sub(startShelfWorldPosition).setComponent(1, -1);

            this.parent.object.remove(this.object); //remove from column
            this.shelf.object.add(this.object);
            this.object.position.copy(this.startBlockInShelfPosition);
            this.releaseOccupancy();

            if (this.sceneManager.keysDown["Shift"]) {
                let newBlock = new this.constructor(this.sceneManager, this.shelf, this.variationName)
                    .setColumn(this.parent)
                    .setZIndex(this.zIndex, false)
                    .addToShelfFilling()
                    .update();
            }

            this.foundSnap = {
                found: false,
                columnI: undefined,
                zIndex: undefined,
            }

            this.sceneManager.switchControls(false);


            this.changeObjectColor(this.colorMovedGoodPosition);

            window.addEventListener('pointermove', this.boundPointerMove, false);
            window.addEventListener('pointerup', this.boundPointerUp, false);


            //console.log(this.startPointClick);

        } else if (!this.moving) {
            if (this.parameters.allowSlide && this.animationStatus == 0) {
                this.animateOut();
            } else if (this.parameters.allowSlide && this.animationStatus == 2) {
                this.animateIn();
            }
        }

        return true; //interrupts the click propagation
    }

    changeObjectColor(color = this.parameters.objectColor) {
        this.blockObjectMaterial.color.set(color);
    }

    hoveredIn() {
        /* maybe we could differentiate with moveMode? */
        this.changeObjectColor(this.sceneManager.defaults.selection.colorHovered);
        this.shelf.hoveredObject = this;
    }

    hoveredOut() {
        this.changeObjectColor();
        this.shelf.hoveredBlock = undefined;
    }

    arrowUpClicked() {

    }

    addToShelfFilling() {
        let shelf = this.findAncestorWithType("shelf");
        let block = shelf.shelfFillingList.find(block => block.variationName == this.variationName)
        block.actualFilled++;
        shelf.shelfFilling[this.variationName]++;
        block.controller.updateDisplay();
        block.installedBlocks.push(this);
        return this;
    }

    deleteEntity(releaseOccupancy = true, updateShelfFilling = true) {
        /* need to update the GUI */
        if (updateShelfFilling) {
            let shelf = this.findAncestorWithType("shelf");
            shelf.shelfFilling[this.variationName]--;
            shelf.shelfFillingList.forEach(block => {
                if (block.variationName == this.variationName) {
                    block.installedBlocks.splice(block.installedBlocks.indexOf(this), 1);
                    block.actualFilled--;
                    block.controller.updateDisplay();
                }
            })
        }

        /* need to remove this block from column and lists */
        if (releaseOccupancy) this.releaseOccupancy();

        /* delete block object moving */
        //ThreeUtilities.disposeHierarchy(this.blockObjectMoving);
        //ThreeUtilities.disposeHierarchy(this.blockObjectFixed);

        //console.log("deleting block: " + this.parameters.name)

        //ThreeUtilities.disposeHierarchy(this.blockObjectMoving);

        super.deleteEntity();

    }

    static baseBlockList() {
        return [PullDesk, FixedDesk, PullRack,ShippingStation,SurfRack, MiterStation,PullUpBar, VerticalBike,FixedShelf, PullShelf, PlasticBin, Drawer, DisplayRack, ShoeRack, CubeShelf]
    }


    toJSON() {
        /* no need to store column or shelf. It will be called by the column */
        let data = {
            variationName : this.variationName,
            zIndex : this.zIndex,
        }

        return data
    }
    /* from Json is handled by BlockList, because it needs to figure out which class the stored data belongs to. */


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

        param.rightSlotsOccupyAbove = 1; //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow = 0;
        param.leftSlotsOccupyAbove = 1;
        param.leftSlotsOccupyBelow = 0;
        param.centerSlotsOccupyAbove = 2;
        param.centerSlotsOccupyBelow = 0;
        param.centerSlotsOccupyAboveForced = 1;
        param.centerSlotsOccupyBelowForced = 0;

        param.priority = 1
        param.fillPerColumn = false

        return param;
    }

    setParameters() {
        this.parameters = FixedShelf.parameters();
    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0 // anything not counted in cuts to reflect nesting for example.

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth, y: this.width, quantity: 1, thickness: 0.75 });

        /* additional hardware */
        cost.hardwareList.push({
            name: "pins",
            unitCost: 0.05,
            parameters: {},
            quantity: 4
        });

        return cost;
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
        ]

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

        param.rightSlotsOccupyAbove = 1; //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow = 0;
        param.leftSlotsOccupyAbove = 1;
        param.leftSlotsOccupyBelow = 0;
        param.centerSlotsOccupyAbove = 2;
        param.centerSlotsOccupyBelow = 0;
        param.centerSlotsOccupyAboveForced = 1;
        param.centerSlotsOccupyBelowForced = 0;


        param.priority = 2
        param.fillPerColumn = false

        return param;
    }

    setParameters() {
        this.parameters = PullShelf.parameters();
    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += this.depth * this.width; //the main sheet of plywood
        cost.plywoodUsage += this.parameters.slideHeight * this.depth * 2; //the slides

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth, y: this.width, quantity: 1 });
        cost.plywoodCuts.push({ x: this.depth, y: this.parameters.slideHeight, quantity: 2 });

        /* additional hardware */
        cost.hardwareList.push({
            name: "pins",
            unitCost: 0.05,
            parameters: {},
            quantity: 4
        });

        return cost;
    }

}

