import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

export default class TemplateName extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    setParameters() {
        this.parameters = TemplateName.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */
        param.name = "Template name";

        param.rightSlotsOccupyAbove = 2 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow= 1
        param.leftSlotsOccupyAbove= 2
        param.leftSlotsOccupyBelow= 1
        param.centerSlotsOccupyAbove= 2
        param.centerSlotsOccupyBelow= 1

        param.priority = 2, 
        param.onePerColumn = false,
        param.fillPerColumn = false

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
        super.makeSlides();
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        super.makeMovingObject();
    }

    /* once done, also update shelf.js blockList and imports */

}