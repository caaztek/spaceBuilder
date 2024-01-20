import { SceneEntity } from './sceneManager.js';
import ThreeUtilities from './threeUtilities';
import { LinearModifier, PlanarModifier } from './modifier.js';
import * as THREE from 'three';
import Column from './column.js';
import Block, { FixedShelf, PullShelf } from './blocks/block.js';
import PullDesk from './blocks/pullDesk.js';
import PlasticBin from './blocks/plasticBin.js';
import FixedDesk from './blocks/fixedDesk.js';

/* class containing all the information for a given shelf unit, made of many columns */
export default class Partition extends SceneEntity {
    constructor(sceneManager, parent, thickness = 1.5, depth = 60) {
        super(sceneManager, parent, "partition");

        this.material = new THREE.MeshLambertMaterial({ color: "#fff2cc" });

        this.depth = depth;
        this.thickness = thickness;

        this.bandWidth = 1.5;
        this.footWidth = 1;
        this.footHeight = 10;
        this.crossHeight = 10;

        this.rightColumn = undefined;
        this.leftColumn = undefined;

        this.drawSteps = false; //draw horizontal lines at the front of partition to represent steps.
    }

    switchModifierVisibility(value) {
        this.centralModifier.switchVisibility(value);
    }

    setColumns(leftColumn, rightColumn) {
        /* apply columns */
        this.leftColumn = leftColumn;
        this.rightColumn = rightColumn;

        /* add this partition to corresponding columns */
        if (this.rightColumn != undefined) this.rightColumn.addPartition(true, this);
        if (this.leftColumn != undefined) this.leftColumn.addPartition(false, this);

        /* set position based on columns position */
        if (this.rightColumn != undefined) this.xPosition = this.rightColumn.startX;
        else this.xPosition = this.leftColumn.endX()

        this.setModifier();

        /* can update */
        this.update();

        return this;

    }

    setModifier() {
        /* set modifier */
        this.centralModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(1)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            .updateDimension(new THREE.Vector3(this.leftColumn? -this.leftColumn.returnWidth() : 0, -this.depth, 0), new THREE.Vector3(this.leftColumn? 0 : this.parent.lastX() - this.xPosition, -this.depth, 0), this.sceneManager.yAxis.clone().negate(), 20, 0, 0)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    /* need to store start position of all partitions to the right so we can push them */
                    this.partitionStartX = [];
                    let partition = this;
                    let repeat = true;
                    while (repeat) {
                        this.partitionStartX.push(partition.xPosition);
                        if (partition.rightColumn == undefined) {
                            repeat = false;
                        } else {
                            partition = partition.rightColumn.rightPartition;
                        }
                    }

                    let garage = this.findAncestorWithType("garage");
                    let shelf = this.findAncestorWithType("shelf");
                    this.minOffset = undefined;

                    this.maxOffset = garage.length - garage.wallThickness - this.partitionStartX[this.partitionStartX.length - 1] - this.thickness / 2 - shelf.startX;


                    this.firstPartitionClicked = false
                    this.shelfStartX = shelf.startX;
                    if (this.parent.partitions.indexOf(this) == 0) {
                        /* we will be moving the entire shelf */
                        this.firstPartitionClicked = true;
                        this.minOffset = garage.wallThickness + this.thickness / 2 - shelf.startX;
                    } else {
                        this.maxOffsetColumnSize = shelf.maxColumnWidth * shelf.columnWidthStep - this.leftColumn.returnWidth()
                        this.maxOffset = Math.min(this.maxOffset, this.maxOffsetColumnSize);

                        /* don't allow deleting the last column */
                        /* check if this partition is the last */
                        if (this.rightColumn == undefined) {
                            this.minOffset = - this.xPosition + shelf.columnWidthStep;
                        }
                    }

                    this.parent.updateDimension();
                    this.parent.dimension.switchVisibility(true);

                } else if (modifierType == "moved") {
                    /* need to snap to a multiple of  shelf.columnWidthStep*/
                    let shelf = this.findAncestorWithType("shelf");
                    let garage = this.findAncestorWithType("garage");
                    let widthStep = shelf.columnWidthStep;
                    let offsetDistance = modifier.offsetDistance;
                    if (!this.firstPartitionClicked) offsetDistance = Math.round(offsetDistance / widthStep) * widthStep
                    offsetDistance = Math.min(offsetDistance, this.maxOffset);
                    if (this.minOffset != undefined) offsetDistance = Math.max(offsetDistance, this.minOffset);

                    if (!shelf.pushColumnsRight) {
                        if (this.rightColumn != undefined) this.rightColumn.sizeUpdate();
                        this.xPosition = this.partitionStartX[0] + offsetDistance;
                        this.object.position.set(this.xPosition, 0, 0);
                    } else {
                        if (this.firstPartitionClicked) {
                            /* shift the entire shelf object */
                            offsetDistance = Math.max(offsetDistance, this.minOffset)
                            shelf.startX = this.shelfStartX + offsetDistance;
                            shelf.updateObjectPosition();
                            shelf.updateCameraAndControls();
                        } else {
                            /* shift all the partitions to the right */
                            let partition = this;
                            let index = 0;
                            let repeat = true;
                            while (repeat) {
                                partition.xPosition = this.partitionStartX[index] + offsetDistance;
                                partition.object.position.set(partition.xPosition, 0, 0);
                                if (index == 0) {
                                    if (this.leftColumn != undefined) {
                                        if (this.leftColumn.sizeUpdate()) {
                                            /* left column just got deleted */
                                            if (this.leftColumn != undefined) {
                                                /* current partition still in the middle */
                                                this.maxOffset = Math.min(this.maxOffset, offsetDistance + shelf.maxColumnWidth * widthStep - this.leftColumn.returnWidth()); //need to update to prevent column from being too big
                                                //break;
                                            } else {
                                                /* Current partition is now the first. Need to update maxoffset. No worries about column too big */
                                                this.firstPartitionClicked = true;
                                                this.minOffset = garage.wallThickness + this.thickness / 2 - shelf.startX - this.partitionStartX[0];

                                                this.shelfStartX += this.partitionStartX[0];
                                                // shelf.startX = this.xPosition;
                                                // shelf.updateObjectPosition();
                                                // shelf.updateCameraAndControls();
                                                
                                                this.maxOffset = garage.length - garage.wallThickness - this.partitionStartX[this.partitionStartX.length - 1] - this.thickness / 2 - shelf.startX;
                                            }
                                            
                                        }
                                    }
                                } else {
                                    partition.leftColumn.object.position.set((partition.xPosition + partition.leftColumn.leftPartition.xPosition) / 2, 0, 0);
                                }
                                if (partition.rightColumn == undefined) {
                                    repeat = false;
                                } else {
                                    // partition.rightColumn.object.position.set((partition.xPosition + partition.rightColumn.rightPartition.xPosition) / 2, 0, 0);
                                    partition = partition.rightColumn.rightPartition;
                                    index++;
                                }
                            }
                        }

                    }

                    shelf.updateModifierPosition();
                    shelf.updateCrossSupports()
                    this.parent.estimateCost();
                    this.parent.updateDimension();

                } else if (modifierType == "released") {
                    this.parent.dimension.switchVisibility(false);
                }
                
                 /* handle dimension update */
                modifier.dimension.updateStartPoint(new THREE.Vector3(this.leftColumn ? - this.leftColumn.returnWidth() : 0, -this.depth, 0));
            
            })
    }

    setHeight() {
        /* set height as max of neighboring columns. */
        this.height = Math.max(this.leftColumn == undefined ? -Infinity : this.leftColumn.height, this.rightColumn == undefined ? -Infinity : this.rightColumn.height);
    }

    setDepth() {
        /* set depth as max of neighboring columns */
        this.depth = Math.max(this.leftColumn == undefined ? -Infinity : this.leftColumn.depth, this.rightColumn == undefined ? -Infinity : this.rightColumn.depth);
    }

    deleteEntity(removeFromParentArray = true) {

        /* remove partition from parent array */
        this.parent.partitions.splice(this.parent.partitions.indexOf(this), 1);

        /* delete modifier */
        this.centralModifier.deleteEntity();

        super.deleteEntity();
    }

    update() {
        /* delete previous object if it exists */
        if (this.partitionObject != undefined) {
            ThreeUtilities.disposeHierarchy(this.partitionObject);
        }
        this.partitionObject = new THREE.Group();
        this.object.position.set(this.xPosition, 0, 0);
        this.object.add(this.partitionObject);

        /* update depth */

        /* compute height based on neighboring column height*/
        this.setHeight();
        this.setDepth();

        let shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0, this.height);
        shape.lineTo(this.depth, this.height);
        shape.lineTo(this.depth, 0);
        shape.lineTo(this.depth - this.footWidth, 0);
        shape.lineTo(this.depth - this.bandWidth, this.footHeight);
        shape.lineTo(this.depth - this.bandWidth, this.height - this.bandWidth);
        shape.lineTo(this.bandWidth, this.height - this.bandWidth);
        shape.lineTo(this.bandWidth, this.footHeight);
        shape.lineTo(this.footWidth, 0);
        shape.lineTo(0, 0);

        const extrudeSettings = {
            steps: 2,
            depth: this.thickness,
            bevelEnabled: false,
        };

        const partitionGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        //const partitionMesh = new THREE.Mesh(partitionGeom, this.material);

        let partitionMesh = ThreeUtilities.returnGroupAtDetailedCoord(partitionGeom, this.material, new THREE.Vector3(-this.thickness / 2, 0, 0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis, this.sceneManager.xAxis.clone().negate(), true);
        this.partitionObject.add(partitionMesh);

        /* cross support at the bottom */
        shape = new THREE.Shape();
        shape.moveTo(this.bandWidth, this.crossHeight);
        shape.lineTo(this.depth - this.bandWidth, this.crossHeight);
        shape.lineTo(this.depth - this.bandWidth, this.crossHeight + this.bandWidth);
        shape.lineTo(this.bandWidth, this.crossHeight + this.bandWidth);
        shape.lineTo(this.bandWidth, this.crossHeight);

        const crossGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        let crossMesh = ThreeUtilities.returnGroupAtDetailedCoord(crossGeom, this.material, new THREE.Vector3(-this.thickness / 2, 0, 0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis, this.sceneManager.xAxis.clone().negate(), true);
        this.partitionObject.add(crossMesh);

        /* update modifier position */
        this.centralModifier.updatePosition(new THREE.Vector3(0, -this.depth, this.height / 2))

        /* optionally draw ticks for steps */
        if (this.drawSteps) {
            let stepZ = this.parent.startStep;
            let stepObject = new THREE.Group();
            this.partitionObject.add(stepObject);
            const material = new THREE.LineBasicMaterial({ color: "#000000" });
            while (stepZ < this.height) {
                let geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-this.thickness / 2, -this.depth - 0.1, stepZ), // Start point
                    new THREE.Vector3(this.thickness / 2, -this.depth - 0.1, stepZ)   // End point
                ]);
                stepObject.add(new THREE.Line(geometry, material));
                stepZ += this.parent.verticalStep;
            }
        }

    }

    estimateCost() {
        let cost = {
            desiredMargin: 0,
            fixedCost: 0,
            plywoodUsage: 0,
            plywoodCuts: [],
            hardwareList: [],
        };

        /* estimate fixed cost and margin for this particulare block */
        cost.margin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.height, y: this.bandWidth, quantity: 4, thickness: 0.75 }); //vertical members, accounting for 2 plies
        cost.plywoodCuts.push({ x: this.depth - 2 * this.bandWidth, y: this.bandWidth, quantity: 4, thickness: 0.75 }); //horizontal members

        /* additional hardware */
        cost.hardwareList.push({
            name: "bolts",
            unitCost: 0.2,
            parameters: {},
            quantity: 8
        });

        return cost;

    }

    toJSON() {
        return {
            thickness : this.thickness,
            depth : this.depth,
            bandWidth : this.bandWidth,
            footWidth : this.footWidth,
            footHeight : this.footHeight,
            crossHeight : this.crossHeight,
            xPosition : this.xPosition,
            height : this.height,
        }
    }

    static fromJSON(sceneManager, parent, data) {
        let partition = new Partition(sceneManager, parent, data.thickness, data.depth);
        partition.bandWidth = data.bandWidth;
        partition.footWidth = data.footWidth;
        partition.footHeight = data.footHeight;
        partition.crossHeight = data.crossHeight;
        partition.xPosition = data.xPosition;
        partition.height = data.height;
        return partition;
    }

}
