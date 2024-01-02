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

        /* set height as max of neighboring columns. */
        this.height = Math.max(this.leftColumn == undefined ? -Infinity : this.leftColumn.height, this.rightColumn == undefined ? -Infinity : this.rightColumn.height);

        /* can update */
        this.update();

        return this;

    }

    update() {
        /* delete previous object if it exists */
        if (this.partitionObject != undefined) {
            ThreeUtilities.disposeHierarchy(this.partitionObject);
        }
        this.partitionObject = new THREE.Group();
        this.partitionObject.position.set(this.xPosition, 0, 0);
        this.object.add(this.partitionObject);

        let shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0, this.height);
        shape.lineTo(this.depth, this.height);
        shape.lineTo(this.depth, 0);
        shape.lineTo(this.depth- this.footWidth, 0);
        shape.lineTo(this.depth- this.bandWidth, this.footHeight);
        shape.lineTo(this.depth -this.bandWidth, this.height - this.bandWidth);
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

        let partitionMesh = ThreeUtilities.returnGroupAtDetailedCoord(partitionGeom, this.material, new THREE.Vector3(-this.thickness/2,0,0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis, this.sceneManager.xAxis.clone().negate(), true);
        this.partitionObject.add(partitionMesh);

        shape = new THREE.Shape();
        shape.moveTo(this.bandWidth, this.crossHeight);
        shape.lineTo(this.depth - this.bandWidth, this.crossHeight);
        shape.lineTo(this.depth - this.bandWidth, this.crossHeight + this.bandWidth);
        shape.lineTo(this.bandWidth, this.crossHeight + this.bandWidth);
        shape.lineTo(this.bandWidth, this.crossHeight);

        const crossGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        //const partitionMesh = new THREE.Mesh(partitionGeom, this.material);

        let crossMesh = ThreeUtilities.returnGroupAtDetailedCoord(crossGeom, this.material, new THREE.Vector3(-this.thickness/2,0,0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis, this.sceneManager.xAxis.clone().negate(), true);
        this.partitionObject.add(crossMesh);

        //console.log("building partitions")

    }

}
