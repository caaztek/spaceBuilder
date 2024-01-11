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
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = TemplateName.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        param.variations = [
            {
                variationName: "Template name",
                variationParameters: {
                    rightSlotsOccupyAbove : 2,
                    rightSlotsOccupyBelow :1,
                    leftSlotsOccupyAbove : 2,
                    leftSlotsOccupyBelow : 1,
                    centerSlotsOccupyAbove : 2,
                    centerSlotsOccupyBelow : 1,
                }
            }
        ],

        param.priority = 2
        param.onePerColumn = false
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