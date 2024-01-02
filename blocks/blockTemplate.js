import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

/* default template.
1. Change TemplateName
2. Update SetParameter with chosenName.parameters()
3. Change param.name with proper name. Update all other parameters as necessary
4. Make custom score if necessary
5. Uodpate makeSlides() as necessary. Can start from super.makeSlides() if useful. It will make standard slides with a slot
6. Update makeMovingObject() as necessary. Can start from super.makeMovingObject() if useful. It will make standard moving object with a slot
7. In Shelf.js, import /block/templateName.js and update setBlockList to include the new block type
 */

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