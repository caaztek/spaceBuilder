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

                    this.maxOffset = garage.length - garage.wallThickness - this.partitionStartX[this.partitionStartX.length - 1] - this.thickness / 2 - shelf.startX;

                    this.firstPartitionClicked = false
                    if (this.parent.partitions.indexOf(this) == 0) {
                        this.firstPartitionClicked = true;
                        this.shelfStartX = shelf.startX;
                        this.minOffset = garage.wallThickness + this.thickness / 2 - shelf.startX;
                    } else {
                        this.maxOffset = Math.min(this.maxOffset, shelf.maxColumnWidth * shelf.columnWidthStep - this.leftColumn.returnWidth());
                    }


                } else if (modifierType == "moved") {
                    /* need to snap to a multiple of  shelf.columnWidthStep*/
                    let shelf = this.findAncestorWithType("shelf");
                    let widthStep = shelf.columnWidthStep;
                    let offsetDistance = Math.min(Math.round(modifier.offsetDistance / widthStep) * widthStep, this.maxOffset);

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
                                        if (this.leftColumn.sizeUpdate()) break;
                                    }
                                }
                                if (partition.rightColumn == undefined) {
                                    repeat = false;
                                } else {
                                    partition.rightColumn.object.position.set((partition.xPosition + partition.rightColumn.rightPartition.xPosition) / 2, 0, 0);
                                    partition = partition.rightColumn.rightPartition;
                                    index++;
                                }
                            }
                        }

                    }

                    shelf.updateModifierPosition();
                    shelf.updateCrossSupports()

                }
            })
    }

    setHeight() {
        /* set height as max of neighboring columns. */
        this.height = Math.max(this.leftColumn == undefined ? -Infinity : this.leftColumn.height, this.rightColumn == undefined ? -Infinity : this.rightColumn.height);
    }

    deleteEntity() {
        super.deleteEntity();

        /* delete modifier */
        this.centralModifier.deleteEntity();
    }

    update() {
        /* delete previous object if it exists */
        if (this.partitionObject != undefined) {
            ThreeUtilities.disposeHierarchy(this.partitionObject);
        }
        this.partitionObject = new THREE.Group();
        this.object.position.set(this.xPosition, 0, 0);
        this.object.add(this.partitionObject);

        /* compute height based on neighboring column height*/
        this.setHeight();

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

        shape = new THREE.Shape();
        shape.moveTo(this.bandWidth, this.crossHeight);
        shape.lineTo(this.depth - this.bandWidth, this.crossHeight);
        shape.lineTo(this.depth - this.bandWidth, this.crossHeight + this.bandWidth);
        shape.lineTo(this.bandWidth, this.crossHeight + this.bandWidth);
        shape.lineTo(this.bandWidth, this.crossHeight);

        const crossGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        //const partitionMesh = new THREE.Mesh(partitionGeom, this.material);

        let crossMesh = ThreeUtilities.returnGroupAtDetailedCoord(crossGeom, this.material, new THREE.Vector3(-this.thickness / 2, 0, 0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis, this.sceneManager.xAxis.clone().negate(), true);
        this.partitionObject.add(crossMesh);

        /* update modifier position */
        this.centralModifier.updatePosition(new THREE.Vector3(0, -this.depth, this.height / 2))

        //console.log("building partitions")

    }

}
