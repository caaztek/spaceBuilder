import { SceneEntity } from './sceneManager.js';
import { LinearModifier, PlanarModifier } from './modifier.js';
import BlockList from './blockList.js';
import * as THREE from 'three';

/* class containing all the information for a given shelf unit, made of many columns */
export default class Column extends SceneEntity {
    constructor(sceneManager, parent, startX, width, depth, height) {
        super(sceneManager, parent, "column");
        this.moduleArray = [];
        this.startX = startX;
        this.width = width;
        this.depth = depth;
        this.height = height;
        this.verticalStep = this.parent.verticalStep;
        this.startStep = this.parent.startStep;

        this.partitionThickness = this.parent.partitionThickness;
        this.heightSnapDistance = 3;

        this.object.position.set(this.startX + this.width / 2, 0, 0); //column object is centered on column

        this.resetOccupancy(); //array of occupants in this column
        

        // this.rightOccupants = {};
        // this.leftOccupants = {};
        // this.centerOccupants = {};

        this.blocks = []; //array of blocks attached to this column

        this.setModifiers();
        this.fullUpdate();
    }

    setModifiers() {
        this.topModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(1)
            .updateDirection(this.sceneManager.zAxis, this.sceneManager.yAxis)
            .updateDimension(new THREE.Vector3(-this.width / 2, -this.depth, 0), new THREE.Vector3(-this.width / 2, -this.depth, this.height), this.sceneManager.yAxis.clone().negate(), 20, Math.PI / 2, 0,undefined,true)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startHeight = this.height;
                } else if (modifierType == "moved") {
                    let room = this.findAncestorWithType("room");
                    let targetHeight = Math.max(Math.min(this.startHeight + modifier.offsetDistance, room.height), this.parent.minHeight);
                    let index = this.returnIndex();
                    if (index > 0 && Math.abs(targetHeight - this.parent.columns[index - 1].height) < this.heightSnapDistance) {
                        targetHeight = this.parent.columns[index - 1].height;
                    } else if (index < this.parent.columns.length - 1 && Math.abs(targetHeight - this.parent.columns[index + 1].height) < this.heightSnapDistance) {
                        targetHeight = this.parent.columns[index + 1].height;
                    }
                    this.height = targetHeight;
                    this.sizeUpdate();
                    this.parent.updateModifierPosition(); //when the rightmost column update, should shift +
                    
                    modifier.dimension.updateEndPoint(new THREE.Vector3(-this.width / 2, -this.depth, this.height));
                    
                    this.parent.estimateCost();
                }
            })
    }

    addPartition(left, partition) {
        if (left) {
            this.leftPartition = partition;
        } else {
            this.rightPartition = partition;
        }
    }

    returnWidth() {
        return this.rightPartition.xPosition - this.leftPartition.xPosition;
    }

    switchModifierVisibility(value) {
        this.topModifier.switchVisibility(value);
    }

    deleteEntity(deleteLeftPartition = true) {

        /* delete modifier */
        this.topModifier.deleteEntity();

        /* delete all the blocks in this column */
        for (var i = this.blocks.length - 1; i >= 0; i--) {
            let block = this.blocks[i];
            block.deleteEntity(false, true);
        }

        /* delete the left partition and connect the right one*/
        if (deleteLeftPartition) {
            if (this.leftPartition != undefined && this.leftPartition.leftColumn != undefined) {
                this.leftPartition.leftColumn.rightPartition = this.rightPartition;
                this.rightPartition.leftColumn = this.leftPartition.leftColumn;
            } else if (this.leftPartition != undefined && this.leftPartition.leftColumn == undefined) {
                /* we just deleted the first column */
                this.rightPartition.leftColumn = undefined;
            }
            this.leftPartition.deleteEntity();
        }

        /* need to update right partition */
        this.rightPartition.update();

        /* remove column from parent array */
        this.parent.columns.splice(this.returnIndex(), 1);

        /* delete everything else */
        super.deleteEntity();
    }

    maxZIndex() {
        return Math.ceil((this.height - this.startStep) / this.verticalStep);
    }

    sizeUpdate() {
        /* update size based on partition position */
        this.startX = this.leftPartition.xPosition;
        let widthChange = false;
        let newWidth = this.rightPartition.xPosition - this.leftPartition.xPosition;
        if (newWidth != this.width) {
            widthChange = true;
            this.width = newWidth;
            //console.log(this.width)
            if (this.width < this.parent.columnWidthStep) {
                this.deleteEntity();
                return true;
            }
        }
        this.object.position.set(this.startX + this.width / 2, 0, 0); //column object is centered on column

        /* update depth */
        let depthChange = false;
        if (this.parent.depth != this.depth) {
            depthChange = true;
            this.depth = this.parent.depth;
        }

        /* called when column height or size changes */
        this.updateModifierPosition();

        /* update partition size */
        this.rightPartition.update();
        this.leftPartition.update();

        /* update blocks */
        for (var i = this.blocks.length - 1; i >= 0; i--) {
            let block = this.blocks[i];
            if (!block.checkOptionAvailability(undefined, undefined, true, false)) {
                block.deleteEntity();
            }
            if (widthChange || depthChange) block.update();
        }
    }

    resetOccupancy() {
        this.occupants = {};
        for (var i = 0; i < this.maxZIndex(); i++) {
            this.occupants[i] = {};
        }
    }

    fullUpdate() {
        /* called when we want to fill column from scratch */

        /* empty column */
        this.blocks.forEach(block => block.deleteEntity(false)); //no need to release occupancy in this case
        this.blocks = [];
        //this.object.remove(this.pointLight);

        /* set array of occupancy */
        this.resetOccupancy();
        //this.occupants = {};
        // this.rightOccupants = {};
        // this.leftOccupants = {};
        // this.centerOccupants = {};

        this.updateModifierPosition();
    }

    updateModifierPosition() {
        /* position modifier */
        let topPosition = new THREE.Vector3(0, - this.depth, this.height);
        this.topModifier.updatePosition(topPosition);
        this.topModifier.dimension.updateStartPoint(new THREE.Vector3(-this.width / 2, -this.depth, 0), false)
        .updateEndPoint(new THREE.Vector3(-this.width / 2, -this.depth, this.height),false);
    }

    setWidth(width) {
        this.width = width;
        return this;
    }

    setHeight(height) {
        this.height = height;
        return this;
    }

    setDepth(depth) {
        this.depth = depth;
        return this;
    }

    returnIndex() {
        return this.parent.columns.indexOf(this);
    }

    setStartX(x) {
        this.startX = x;
        return this;
    }

    endX() {
        return this.startX + this.width;
    }

    toJSON() {
        let blocks = [];
        this.blocks.forEach(block => blocks.push(block.toJSON()));

        let data = {
            startX: this.leftPartition.xPosition,
            width: this.returnWidth(),
            height: this.height,
            depth: this.depth,
            blocks: blocks,
        }

        return data;
    }

    static fromJSON(sceneManager, parent,data) {
        let newColumn = new Column(sceneManager, parent, data.startX, data.width, data.depth, data.height);
        newColumn.blockData = data.blocks; //probably need two steps. Set-up all columns, then partitions, then fill blocks.
        return newColumn;
    }

    setBlocksFromData() {
        this.blockData.forEach(blockData => {
            let newBlock = BlockList.fromJSON(this.sceneManager, this.parent,this, blockData);
        });
    }

}