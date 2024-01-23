import { SceneEntity } from './sceneManager.js';
import ThreeUtilities from './threeUtilities';
import { LinearModifier, PlanarModifier, buttonModifier } from './modifier.js';
import * as THREE from 'three';
import Column from './column.js';
import Block from './blocks/block.js';
import Partition from './partition.js';
import Dimension from './dimension.js';
import BlockList from './blockList.js';

import startMix1 from './examples/startMix1.json';
import shopDisplay1 from './examples/shopDisplay1.json';
import santaCruz1 from './examples/santaCruz1.json';
import miterStation1 from './examples/miterStation1.json';
import potteryStudio1 from './examples/potteryStudio1.json';

/* class containing all the information for a given shelf unit, made of many columns */
export default class Shelf extends SceneEntity {
    constructor(sceneManager, parent) {
        super(sceneManager, parent, "shelf");

        /* set defaults based on room configuration */
        let roomLength = this.parent.length;
        this.startX = roomLength * 0.2;
        this.targetLength = roomLength * 0.7; //if using column width from default table, we'll try to get close.
        this.height = this.parent.height * 0.9;
        this.minHeight = 5;

        /* depth */
        this.depth = 30;
        this.minDepth = 10;
        this.maxDepth = 50;
        this.depthModifierOffset = 2;

        /* partition */
        this.partitionThickness = 1.5;
        this.crossSupportThickness = 1.5;
        this.crossSupportHeight = 1.5;
        this.crossSupportStartZ = 10.75;
        this.crossSupportMaterial = new THREE.MeshLambertMaterial({ color: "#fff2cc" });
        this.modifierOffset = 3;
        this.verticalStep = 4;
        /* See drawing for clarification. All the modules will have to align to steps.generally modules should no protrude below their stepHeight and module+content not above their steps. Module height is generally referenced by the bottomMost step, but tbd. See draft drawings to clarify*/
        this.startStep = 2; //distance between ground and first step.

        this.pushColumnsRight = true; //push every column to the right to mimic spreadsheet interface and disrupt the rest of the shelves less.

        /* set block list */
        this.setBlockList();

        /* add GUI */
        this.showShelfModifier = true;
        this.showPartitionSteps = false;
        this.showModifiers = true;
        this.hideAllBackgrounds = false;
        this.addGUI();

        /* set columns */
        this.columns = [];
        this.matchExactWidth = false; //if match then we can't use exact column width. Maybe just use them as guides.
        this.defaultWidthStep = 4; //all width will be a multiple of this. This is also the minimum width.
        this.defaultColumnWidths = [4, 6, 10]; //as multiples of defaultWidthStep
        this.targetWidthMargin = 0;
        this.targetWidthMarginPerColumnTotal = 0.2;
        this.maxColumnWidth = 14;  //in multiple of defaultWidthStep

        /* vertical partitions will be managed by the shelf */
        this.partitionObject = new THREE.Group();
        this.object.add(this.partitionObject);
        this.partitions = [];

        /* handle actions to move shelfs when moveMode engaged */
        this.movePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); //maybe need to change this if the shelf is on another wall
        // this.moveMode = false;
        this.raycaster = new THREE.Raycaster();

        /* listened for arrow up clicks*/
        this.sceneManager.onUpdate((updateType, event) => {
            if (updateType == "keyDown" && event == "ArrowUp") {
                console.log("arrow up");
                if (this.hoveredBlock != undefined) {
                    this.hoveredBlock.arrowUpClicked();
                }
            }
        });

        this.examples = [startMix1, shopDisplay1, santaCruz1, miterStation1, potteryStudio1];
        this.exampleIndex = 0;

    }

    setUpFromNothing() {
        /* update rendering */
        this.setColumns();
        this.setModifiers();
        this.update();
        this.setDimension();
        return this;
    }

    updateCameraAndControls() {
        let xPosition = this.startX + this.partitions[this.partitions.length - 1].xPosition * 0.8;
        let yPosition = 0;
        let zPosition = this.parent.cameraStartTargetHeight;
        this.sceneManager.camera.lookAt(xPosition, yPosition, zPosition);
        this.sceneManager.controls.target.set(xPosition, yPosition, zPosition);

        //this.sceneManager.camera.position.set(xPosition, -this.parent.cameraStartDepth, this.parent.cameraStartHeight);
    }

    setDimension() {
        this.dimension = new Dimension(this.sceneManager, this, new THREE.Vector3(0, -this.depth, 0), new THREE.Vector3(this.lastX(), -this.depth, 0), this.sceneManager.yAxis.clone().negate(), 40).update();
        this.dimension.switchVisibility(false);

        return this;
        //.update()
    }

    updateDimension() {
        this.dimension.updateEndPoint(new THREE.Vector3(this.lastX(), -this.depth, 0))
        this.dimension.updateStartPoint(new THREE.Vector3(0, -this.depth, 0)).update();
    }

    getRayCastOnPlane() {
        //this.sceneManager.updatePointer(event);
        this.raycaster.setFromCamera(this.sceneManager.pointer, this.sceneManager.camera);
        let intersectionPosition = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.movePlane, intersectionPosition);
        return intersectionPosition;
    }

    setBlockList() {
        // this.baseBlockListColumn = [PullDesk, FixedDesk, PullRack,ShippingStation,SurfRack, MiterStation,PullUpBar, VerticalBike]
        // this.baseBlockListArea = [FixedShelf, PullShelf, PlasticBin, Drawer, DisplayRack, ShoeRack, CubeShelf];
        // this.baseBlockList = this.baseBlockListColumn.concat(this.baseBlockListArea);

        this.baseBlockList = BlockList.baseBlockList();

        this.shelfFilling = {};
        this.shelfFillingList = [];
        this.baseBlockList.forEach((block) => {
            block.parameters().variations.forEach((variation) => {
                this.shelfFilling[variation.variationName] = 0;
                let param = block.parameters();
                this.shelfFillingList.push({
                    block: block,
                    variationName: variation.variationName,
                    numberToFill: 0,
                    actualFilled: 0, //should be equal to shelfFilling value
                    priority: variation.variationParameters.priority != undefined ? variation.variationParameters.priority : param.priority,
                    fillCoefficient: variation.variationParameters.startBlockListFillingCoefficient != undefined ? variation.variationParameters.startBlockListFillingCoefficient : param.startBlockListFillingCoefficient,
                    maxFill: 10, //will be used to set GUI,
                    installedBlocks: [] //redundant with actualFilled.
                });
            });
        });
    }

    showInstructions() {
        this.sceneManager.modal.style.display = "block";
    }

    resetBlockList() {

        this.shelfFillingList.forEach((block) => {
            this.shelfFilling[block.variationName] = 0;
            block.actualFilled = 0;
            block.installedBlocks = [];
        });
    }


    switchModifierVisibility(value) {
        this.showModifiers = value;
        this.showModifierController.updateDisplay();
        //this.leftModifier.switchVisibility(value);
        this.rightModifier.switchVisibility(value);
        this.rightAddColumnModifier.switchVisibility(value);
        this.depthModifier.switchVisibility(value);
        //this.moveModifier.switchVisibility(value);

        this.columns.forEach((column) => {
            column.switchModifierVisibility(value);
        });
        this.partitions.forEach((partition) => {
            partition.switchModifierVisibility(value);
        });
    }

    setPartitions() {
        /* called once columns are calculated */

        /* Erase all previous partition info */
        if (this.partitions) {
            for (var i = this.partitions.length - 1; i >= 0; i--) {
                this.partitions[i].deleteEntity();
            }
        }
        this.partitions = [];

        /* make partitions */
        let column;
        for (var i = 0; i <= this.columns.length; i++) {
            column = this.columns[i];
            let newPartition = new Partition(this.sceneManager, this, this.partitionThickness, this.depth)
            this.partitions.push(newPartition);

            newPartition.setColumns(i == 0 ? undefined : this.columns[i - 1], i == this.columns.length ? undefined : this.columns[i]);

        }

    }

    setColumns() {
        /* called everytime columns need to be recalculated */

        /* Erase all previous column info */
        if (this.columns) {
            //delete all columns starting from the last
            for (var i = this.columns.length - 1; i >= 0; i--) {
                this.columns[i].deleteEntity(false);
            }
        }
        this.columns = [];

        /* figure out the step. Will represent the subdivision that the entire shelf array will follow*/
        this.columnWidthStep = this.defaultWidthStep;
        let numberOfSteps = Math.floor(this.targetLength / this.defaultWidthStep); //don't go over target length. minimum for this should be 1.
        if (this.matchExactWidth) {
            this.columnWidthStep = this.targetLength / numberOfSteps;
        }

        /* create an array of columns width using step and defaults. Many approachs possible. */
        this.defaultColumnWidths.sort((a, b) => a - b); //start with the thinnest.
        let targetStepsPerWidth = Math.floor(numberOfSteps / this.defaultColumnWidths.length);
        let currentWidthIndex = 0;
        let currentStep = 0;
        let stepsLeft = numberOfSteps;
        let currentStepsCurrentWidth = 0;
        let stepArray = []; //array represent the collection of column width (counted in step multiples)

        while (true) {
            let currentWidth = Math.min(this.defaultColumnWidths[currentWidthIndex], stepsLeft);
            stepArray.push(currentWidth);
            stepsLeft -= currentWidth;
            currentStep += currentWidth;
            currentStepsCurrentWidth += currentWidth;
            if (stepsLeft <= 0) break;
            if (currentStepsCurrentWidth >= targetStepsPerWidth) {
                currentWidthIndex++;
                currentStepsCurrentWidth = 0;
            }
        }
        /* reorder in case we had to add a small one at the end */
        stepArray.sort((a, b) => a - b);

        /* now we can create columns */
        let currentX = 0;
        let counter = 0;
        stepArray.forEach((width) => {
            let newColumn = new Column(this.sceneManager, this, currentX, width * this.columnWidthStep, this.depth, counter < 2 ? this.height * 0.8 : this.height)
            this.columns.push(newColumn);
            currentX += width * this.columnWidthStep;
            counter++;
        });

        this.setPartitions();
    }

    addColumn(fillShelf = true) {
        let newColumnWidth = this.columnWidthStep * this.defaultColumnWidths[0];

        if (this.lastX() + newColumnWidth + this.partitionThickness > this.parent.length - this.parent.wallThickness - this.startX) {
            console.log("not enough room to add column");
            return;
        }

        /* add a column at the end of the shelf */
        let newHeight = this.columns.length > 0 ? this.columns[this.columns.length - 1].height : this.height;
        let newColumn = new Column(this.sceneManager, this, this.lastX(), newColumnWidth, this.depth, newHeight);
        let newPartition = new Partition(this.sceneManager, this, this.partitionThickness, this.depth)
        newColumn.rightPartition = newPartition;
        newColumn.leftPartition = this.columns[this.columns.length - 1].rightPartition;
        newPartition.setColumns(newColumn, undefined);

        this.columns[this.columns.length - 1].rightPartition.rightColumn = newColumn;

        this.columns.push(newColumn);
        this.partitions.push(newPartition);

        newColumn.fullUpdate();

        if (fillShelf) this.fillShelf();

        //this.updateCameraAndControls(); //too jittery

    }

    setModifiers() {

        let depthDimensionStartPoint = new THREE.Vector3(0, 0, 0);


        this.rightModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(1)
            .updatePrecision(0)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            //.updateDimension(depthDimensionStartPoint, new THREE.Vector3(this.lastX(),0,0), this.sceneManager.yAxis.clone().negate(),100)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startLength = this.lastX();
                    this.dimension.switchVisibility(true);
                } else if (modifierType == "moved") {
                    this.targetLength = Math.max(Math.min(this.startLength + modifier.offsetDistance, this.parent.length - this.parent.wallThickness - this.startX - this.partitionThickness / 2), this.defaultWidthStep);
                    //modifier.dimension.updateEndPoint(new THREE.Vector3(this.lastX(),0,0));
                    this.updateDimension();
                    this.setColumns();
                    this.update();
                } else if (modifierType = "released") {
                    this.dimension.switchVisibility(false);
                }
            })

        this.rightAddColumnModifier = new buttonModifier(this.sceneManager, this, "plus")
            .setScale(0.5)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.addColumn(false);
                    this.updateModifierPosition();
                    this.updateCrossSupports();
                    this.estimateCost();
                }
            });


        this.depthModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(1)
            .updatePrecision(0)
            .updateDirection(this.sceneManager.yAxis, this.sceneManager.zAxis)
            .updateDimension(depthDimensionStartPoint, depthDimensionStartPoint.clone().addScaledVector(this.sceneManager.yAxis, -this.depth), this.sceneManager.xAxis.clone().negate())
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startDepth = this.depth;
                } else if (modifierType == "moved") {
                    this.depth = Math.max(Math.min(this.startDepth - modifier.offsetDistance, this.maxDepth), this.minDepth);
                    this.updateModifierPosition();
                    modifier.dimension.updateEndPoint(depthDimensionStartPoint.clone().addScaledVector(this.sceneManager.yAxis, -this.depth));
                    this.columns.forEach((column) => {
                        column.sizeUpdate();
                    });
                    this.estimateCost();
                }
            });

        return this;
    }

    updateModifierPosition() {
        //this.leftModifier.updatePosition(new THREE.Vector3(- this.modifierOffset, - this.depth, 10));
        let modifierDepth = this.partitions[this.partitions.length - 1].depth;
        this.rightModifier.updatePosition(new THREE.Vector3(this.lastX() + this.modifierOffset, - modifierDepth, 10));
        this.rightAddColumnModifier.updatePosition(new THREE.Vector3(this.lastX() + this.modifierOffset * 3, - modifierDepth, this.partitions[this.partitions.length - 1].height / 2));
        this.depthModifier.updatePosition(new THREE.Vector3(this.lastX() / 2, - modifierDepth - this.depthModifierOffset, 0));
    }

    maxHeight() {
        let maxHeight = 0;
        this.columns.forEach((column) => {
            maxHeight = Math.max(maxHeight, column.height);
        });
        return maxHeight;
    }

    updateObjectPosition() {
        this.object.position.set(this.startX, -this.parent.wallThickness, 0);
    }

    updateCrossSupports() {
        /* make cross support in the back*/
        /* column now own their cross supports */


        if (false) {
            ThreeUtilities.disposeHierarchy(this.crossSupportBack);
            let crossSupportGeomBack = new THREE.BoxGeometry(this.lastX() + this.partitionThickness, this.crossSupportHeight, this.crossSupportThickness);
            crossSupportGeomBack.translate(this.lastX() / 2, -this.crossSupportHeight / 2, this.crossSupportStartZ);
            this.crossSupportBack = new THREE.Mesh(crossSupportGeomBack, this.crossSupportMaterial);
            this.crossSupportBack.add(ThreeUtilities.returnObjectOutline(this.crossSupportBack));
            this.object.add(this.crossSupportBack);

            ThreeUtilities.disposeHierarchy(this.crossSupport);
            let crossSupportGeom = new THREE.BoxGeometry(this.lastX() + this.partitionThickness, this.crossSupportHeight, this.crossSupportThickness);
            crossSupportGeom.translate(this.lastX() / 2, -this.depth + this.crossSupportHeight / 2, this.crossSupportStartZ);
            this.crossSupport = new THREE.Mesh(crossSupportGeom, this.crossSupportMaterial);
            this.crossSupport.add(ThreeUtilities.returnObjectOutline(this.crossSupport));
            this.object.add(this.crossSupport);
        }
    }


    update() {
        /* called everytime the entire shelf is changed (partition size and position) and everything needs to be redrawn. */

        this.updateCameraAndControls();

        this.updateCrossSupports();

        /* update object position everything in the shelf will be in reference to that*/
        this.updateObjectPosition();

        /* update partitions */
        //this.setPartitions();

        /* update modifiers position */
        this.updateModifierPosition();

        /* fill shelf with interesting blocks */
        this.emptyShelf();
        this.fillShelf();

        /* estimate price */
        this.estimateCost();
    }

    lastX() {
        return this.partitions[this.partitions.length - 1].xPosition;
    }

    emptyShelf() {
        /* update all the columns (empty+reset arrays) */
        this.columns.forEach((column) => { column.fullUpdate() });

        /* initialize block list, in case it was filling before*/
        this.resetBlockList();
        this.estimateCost();
    }

    computeTotalArea() {
        /* find the total # of steps available for area fills */
        this.totalArea = 0;
        this.columns.forEach((column) => {
            this.totalArea += (column.height - column.startStep) / column.verticalStep;
        });

        this.totalColumns = this.columns.length;
    }

    fillShelf() {

        /* find to total number of columns */;

        this.computeTotalArea();

        /* find the total weight of fill per column blocks */
        let totalFillPerColumnWeight = 0;
        let totalFillPerAreaWeight = 0;

        this.shelfFillingList.forEach((block) => {
            if (block.block.parameters().fillPerColumn) {
                totalFillPerColumnWeight += block.fillCoefficient;
                block.maxFill = this.totalColumns;
            } else {
                totalFillPerAreaWeight += block.fillCoefficient;
                block.maxFill = this.totalArea / (block.block.parameters().centerSlotsOccupyAbove + block.block.parameters().centerSlotsOccupyBelow);
            }
        });

        /* update number to fill*/
        this.shelfFillingList.forEach((block) => {
            if (block.block.parameters().fillPerColumn) {
                block.numberToFill = Math.round(block.fillCoefficient / totalFillPerColumnWeight * block.maxFill) - block.actualFilled;
            } else {
                block.numberToFill = Math.round(block.fillCoefficient / totalFillPerAreaWeight * block.maxFill) - block.actualFilled;
            }
        });

        /* sort the filing list */
        this.shelfFillingList.sort((a, b) => b.priority - a.priority);


        /* go through the list and fill */
        for (var i = 0; i < this.shelfFillingList.length; i++) {
            let block = this.shelfFillingList[i];
            for (var j = 0; j < block.numberToFill; j++) {
                let newBlock = new block.block(this.sceneManager, this, block.variationName).findBestPosition(true);
                // let bestScore = insertedBlock.findBestPosition(true);
                if (newBlock.score == 0) {
                    newBlock.deleteEntity(false, false);
                    break; //hopefully insertedBlock gets caught by garbage collector?
                } else {
                    block.actualFilled++;
                    block.installedBlocks.push(newBlock);
                }
            }
        }

        /* update GUI display to reflect the actual filled values */
        this.updateGUI();
    }

    addGUI() {
        super.addGUI();

        /* create GUI for filling preferences */
        this.shelfFillingList.forEach((block) => {
            block.controller = this.guiFolder.add(this.shelfFilling, block.variationName, 0, 1, 1).onChange((value) => {
                let diff = block.actualFilled - value;

                if (diff > 0) {
                    /* sort installed block by their score */
                    block.installedBlocks.sort((a, b) => b.score - a.score);

                    /* remove blocks starting from worse score */
                    //console.log(block.installedBlocks.length)
                    for (var i = 0; i < diff && block.installedBlocks.length > 0; i++) {
                        let blockToRemove = block.installedBlocks.pop();
                        blockToRemove.deleteEntity(true, false);
                        block.actualFilled--;
                    }
                } else if (diff < 0) {
                    //need to add a few blocks.
                    for (var i = 0; i < -diff; i++) {
                        let newBlock = new block.block(this.sceneManager, this, block.variationName).findBestPosition(true);
                        if (newBlock.score == 0) {
                            //console.log("no more space for this block")
                            this.sceneManager.newAlert("No more space for new modules. Try remove some first.")
                            break; //hopefully insertedBlock gets caught by garbage collector?
                        } else {
                            block.actualFilled++;
                            block.installedBlocks.push(newBlock);
                        }
                    }

                }

                this.updateGUI();
                this.estimateCost();
            });
        });


        /* add a button to empty the shelf */
        this.guiFolder.add(this, "showInstructions")
        this.guiFolder.add(this, "emptyShelf")
        this.guiFolder.add(this, "saveShelf")
        this.guiFolder.add(this, "loadShelf")
        this.guiFolder.add(this, "loadNextExample")
        /* add gui to show partition steps */
        this.showStepController = this.guiFolder.add(this, "showPartitionSteps").onChange((value) => {
            this.switchPartitionStepsVisibility(value);
        });

        this.showModifierController = this.guiFolder.add(this, "showModifiers").onChange((value) => {
            this.parent.switchModifierVisibility(value);
        });

        this.guiFolder.add(this, "hideAllBackgrounds").onChange((value) => {
            let room = this.parent;
            if (value) {
                room.objects.backWall.visible = false;
                room.objects.floor.visible = false;
                this.sceneManager.renderer.setClearColor("#ffffff");

            } else {
                room.objects.backWall.visible = true;
                room.objects.floor.visible = true;
                this.sceneManager.renderer.setClearColor("#87CEEB");
            }
        });

        this.sceneManager.onUpdate((updateType, event) => {
            if (updateType == "keyDown" && event == "m") {
                this.showModifiers = !this.showModifiers;
                this.parent.switchModifierVisibility(this.showModifiers);
                //this.showModifierController.updateDisplay();
            }
        })


    }

    switchPartitionStepsVisibility(value = true) {
        this.showPartitionSteps = value;
        this.showStepController.updateDisplay();
        this.partitions.forEach((partition) => {
            partition.drawSteps = value;
            partition.update();
        });
    }

    updateGUI() {
        this.computeTotalArea();
        this.shelfFillingList.forEach((block) => {
            this.shelfFilling[block.variationName] = block.actualFilled;
            /* recompute max fill */
            if (block.block.parameters().fillPerColumn) {
                block.maxFill = this.totalColumns;
            } else {
                let param = block.block.parameters();
                let variationParameters = param.variations.find((variation) => variation.variationName == block.variationName).variationParameters;
                let blockHeight = variationParameters.centerSlotsOccupyAbove != undefined ? variationParameters.centerSlotsOccupyAbove : param.centerSlotsOccupyAbove + (variationParameters.centerSlotsOccupyBelow ? variationParameters.centerSlotsOccupyBelow : param.centerSlotsOccupyBelow);
                block.maxFill = this.totalArea / (blockHeight);
            }
            block.controller.max(block.maxFill * 1.1);
            block.controller.updateDisplay();
        });
    }

    calculatePlywoodCost(cost) {
        /* estimate plywood surface area */
        let surfaceArea = 0
        cost.plywoodCuts.forEach((cut) => {
            if (cut.quantity == undefined) cut.quantity = 1;
            if (cut.thickness == undefined) cut.thickness = 0.75;
            surfaceArea += cut.x * cut.y * cut.quantity * cut.thickness / 0.75;
        });
        let fourByEightPrice = 100;
        let fourByEightSurface = 48 * 96;
        let plywoodCost = surfaceArea / fourByEightSurface * fourByEightPrice;
        //console.log("plywoodCost: ", plywoodCost);
        return plywoodCost;
    }

    calculateHardwareCost(cost) {
        let hardwareCost = 0;
        cost.hardwareList.forEach((hardware) => {
            if (hardware.quantity == undefined) hardware.quantity = 1;
            if (hardware.unitCost == undefined) hardware.unitCost = 0;
            hardwareCost += hardware.unitCost * hardware.quantity;
        });
        //console.log("hardwareCost: ", hardwareCost);
        return hardwareCost;
    }

    loadNextExample() {
        let showModifiers = this.showModifiers;
        let showPartitionSteps = this.showPartitionSteps;
        this.deleteEntity();
        let exampleIndex = (this.exampleIndex + 1) % this.examples.length;
        let newShelf = Shelf.fromJSON(this.sceneManager, this.parent, this.examples[this.exampleIndex]);
        newShelf.exampleIndex = exampleIndex;
        newShelf.switchModifierVisibility(showModifiers);
        newShelf.switchPartitionStepsVisibility(showPartitionSteps);

        this.parent.shelves.push(newShelf);
    }


    estimateCost() {
        let cost = {
            desiredMargin: 0,
            fixedCost: 0,
            plywoodUsage: 0,
            plywoodCuts: [],
            hardwareList: [],
        };

        /* add all the partitions */
        this.partitions.forEach((partition) => {
            let partitionCost = partition.estimateCost(cost);
            cost.desiredMargin += partitionCost.desiredMargin;
            cost.fixedCost += partitionCost.fixedCost;
            cost.plywoodUsage += partitionCost.plywoodUsage;
            cost.plywoodCuts = cost.plywoodCuts.concat(partitionCost.plywoodCuts);
            cost.hardwareList = cost.hardwareList.concat(partitionCost.hardwareList);
        });

        /* add all the objects in all the columns */
        let objectCount = 0;
        this.columns.forEach((column) => {
            column.blocks.forEach((block) => {
                objectCount++;
                let blockCost = block.estimateCost(cost);
                cost.desiredMargin += blockCost.desiredMargin;
                cost.fixedCost += blockCost.fixedCost;
                cost.plywoodUsage += blockCost.plywoodUsage;
                cost.plywoodCuts = cost.plywoodCuts.concat(blockCost.plywoodCuts);
                cost.hardwareList = cost.hardwareList.concat(blockCost.hardwareList);
            });
        });

        let plywoodCost = this.calculatePlywoodCost(cost);
        let hardwareCost = this.calculateHardwareCost(cost);

        this.sceneManager.updateCostLabel(["Price as built : $" + Math.round((plywoodCost + hardwareCost) * 2.2)])

        //console.log("plywoodPrice: ", plywoodPrice);
    }

    saveShelf() {
        let data = this.toJSON();

        data.metadata = {
            time: Date.now(),
            version: 1,
            type: "shelf",
        }
        ThreeUtilities.downloadJSON(data, "shelf");
    }

    deleteEntity() {
        /* remove from parent shelves */
        this.parent.shelves.splice(this.parent.shelves.indexOf(this), 1);

        /* remove all columns */
        for (var i = this.columns.length - 1; i >= 0; i--) {
            this.columns[i].deleteEntity(false); //no need to clean-up the partitions
        }

        /* remove all partitions */
        for (var i = this.partitions.length - 1; i >= 0; i--) {
            this.partitions[i].deleteEntity();
        }

        /* remove all modifiers */
        this.rightModifier.deleteEntity();
        this.rightAddColumnModifier.deleteEntity();
        this.depthModifier.deleteEntity();
        this.dimension.deleteEntity();

        super.deleteEntity();
    }

    loadShelf() {
        ThreeUtilities.loadJsonFile((data) => {
            this.deleteEntity();
            let newShelf = Shelf.fromJSON(this.sceneManager, this.parent, data);
            this.parent.shelves.push(newShelf);
        });
    }

    maxHeight() {
        let maxHeight = 0;
        this.columns.forEach((column) => {
            maxHeight = Math.max(maxHeight, column.height);
        });
        return maxHeight;
    }

    toJSON() {
        let columns = [];
        this.columns.forEach((column) => {
            columns.push(column.toJSON());
        });
        let partitions = [];
        this.partitions.forEach((partition) => {
            partitions.push(partition.toJSON());
        });

        return {
            startX: this.startX,
            columnWidthStep: this.columnWidthStep,
            columns: columns,
            partitions: partitions,
            depth : this.depth,
        }
    }

    static fromJSON(sceneManager, parent, data) {
        let newShelf = new Shelf(sceneManager, parent)

        if (data == undefined) {
            data = newShelf.examples[newShelf.exampleIndex];
            newShelf.exampleIndex = (newShelf.exampleIndex + 1) % newShelf.examples.length;
        }


        newShelf.startX = data.startX;
        newShelf.columnWidthStep = data.columnWidthStep;
        newShelf.depth = data.depth;

        /* set all the columns */
        data.columns.forEach((columnData) => {
            let newColumn = Column.fromJSON(sceneManager, newShelf, columnData);
            newShelf.columns.push(newColumn);
        });

        /* now set all the partitions. For now we ignore previously stored partition information */
        newShelf.setPartitions();
        // data.partitions.forEach((partitionData) => {
        //     let newPartition = Partition.fromJSON(sceneManager, newShelf, partitionData);
        //     newShelf.partitions.push(newPartition);
        // });
        newShelf.setModifiers();
        newShelf.setDimension();

        /* now fill all the columns */
        newShelf.columns.forEach((column) => {
            column.setBlocksFromData();
        });

        newShelf.updateCameraAndControls();
        /* update object position everything in the shelf will be in reference to that*/
        newShelf.updateObjectPosition();
        /* update modifiers position */
        newShelf.updateModifierPosition();

        /* estimate price */
        newShelf.estimateCost();

        /* extend room if shelf doesn't fit */
        if (newShelf.startX + newShelf.lastX() > newShelf.parent.length - newShelf.parent.wallThickness) {
            console.log("extending room horizontally")
            newShelf.parent.length = newShelf.startX + newShelf.lastX() + newShelf.parent.wallThickness + newShelf.partitions[newShelf.partitions.length - 1].thickness / 2;
            newShelf.parent.update();
        }

        if (newShelf.maxHeight() > newShelf.parent.height) {
            console.log("extending room vertically")
            newShelf.parent.height = newShelf.maxHeight();
            newShelf.parent.update();
        }

        return newShelf;

    }

}
