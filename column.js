import { SceneEntity } from './sceneManager.js';
import { LinearModifier, PlanarModifier } from './modifier.js';
import * as THREE from 'three';

/* class containing all the information for a given shelf unit, made of many columns */
export default class Column extends SceneEntity {
    constructor(sceneManager, parent, startX,width,depth,height,index) {
        super(sceneManager, parent, "column");
        this.moduleArray = [];
        this.startX = startX;
        this.width = width;
        this.depth = depth;
        this.height = height;
        this.index = index;
        this.verticalStep = this.parent.verticalStep;

        this.partitionThickness = this.parent.partitionThickness;
        this.heightSnapDistance = 3;

        this.object.position.set(this.startX + this.width / 2, 0, 0); //column object is centered on column

        this.rightOccupants = {};
        this.leftOccupants = {};
        this.centerOccupants = {};

        this.blocks = []; //array of blocks attached to this column

        this.setModifiers();
        this.update();
    }

    setModifiers() {
        this.topModifier = new LinearModifier(this.sceneManager, this, "line")
        .setScale(1)
        .updateDirection(this.sceneManager.zAxis, this.sceneManager.yAxis)
        .onUpdate((modifierType, modifier) => {
            if (modifierType == "clicked") {
                this.startHeight = this.height;
            } else if (modifierType == "moved") {
                let garage = this.findAncestorWithType("garage");
                let targetHeight = Math.max(Math.min(this.startHeight + modifier.offsetDistance,garage.height),this.parent.minHeight);
                if (this.index > 0 && Math.abs(targetHeight - this.parent.columns[this.index - 1].height) < this.heightSnapDistance) {
                    targetHeight = this.parent.columns[this.index - 1].height;
                } else if (this.index < this.parent.columns.length - 1 && Math.abs(targetHeight - this.parent.columns[this.index + 1].height) < this.heightSnapDistance) {
                    targetHeight = this.parent.columns[this.index + 1].height;
                }
                this.height = targetHeight;
                this.parent.update();
            }
        })
    }

    switchModifierVisibility(value) {
        this.topModifier.switchVisibility(value);
    }

    deleteEntity() {
        super.deleteEntity();
        this.topModifier.deleteEntity();
        this.blocks.forEach(block => block.deleteEntity());
    }

    maxZIndex() {
        return Math.floor(this.height / this.verticalStep);
    }

    update() {
        /* called whenever there is a change in overall column size */

        /* empty column */
        this.blocks.forEach(block => block.deleteEntity());
        this.blocks = [];
        //this.object.remove(this.pointLight);

        /* set array of occupancy */
        this.rightOccupants = {};
        this.leftOccupants = {};
        this.centerOccupants = {};

        /* position modifier */
        let topPosition = new THREE.Vector3(0,- this.depth, this.height);
        this.topModifier.updatePosition(topPosition);

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

    setIndex(index) {
        this.index = index;
        return this;
    }

    setStartX(x) {
        this.startX = x;
        return this;
    }

    endX() {
        return this.startX + this.width;
    }
    
}