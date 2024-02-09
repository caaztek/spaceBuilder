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

export default class CrossSupport extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = CrossSupport.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        param.variations = [
            {
                variationName: "Cross Support",
                variationParameters: {
                    rightSlotsOccupyAbove: 1,
                    rightSlotsOccupyBelow: 0,
                    leftSlotsOccupyAbove: 1,
                    leftSlotsOccupyBelow: 0,
                    centerSlotsOccupyAbove: 1,
                    centerSlotsOccupyBelow: 0,
                    centerSlotsOccupyAboveForced: 1,
                    centerSlotsOccupyBelowForced: 0,
                    startBlockListFillingCoefficient: 0,
                }
            }
        ]

        param.widthMargin = 0;
        param.crossThickness = 0.75;
        param.crossDepth = 1.5;

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
        //super.makeSlides();
    }

    changeObjectColor(color) {
        /* overwrite for unique objects like gltf imports that need to be traversed */
        super.changeObjectColor(color);
    }

    setOccupancyAtIndex(zIndex, erase = true, usedForced = false) {
        /* occupy the column objects according to block size */
        let param = this.parameters;

        if (erase && this.parent.occupants[zIndex] != undefined && this.parent.occupants[zIndex].cross) {
            this.parent.occupants[zIndex].cross.deleteEntity();
        }
        if (this.parent.occupants[zIndex] == undefined) this.parent.occupants[zIndex] = {};
        this.parent.occupants[this.zIndex].cross = this;
    }

    releaseOccupancy() {
        this.parent.blocks.splice(this.parent.blocks.indexOf(this), 1);

        if (this.parent.occupants[this.zIndex] != undefined) this.parent.occupants[this.zIndex].cross = undefined;
    }

    checkOptionAvailability(column = this.parent, zIndex = this.zIndex, checkFit = true, checkOccupancy = true, usedForced = true) {
        /* fit should never be a problem */
        if (checkOccupancy && column.occupants[zIndex] != undefined) {
            if (column.occupants[zIndex].cross != undefined) return false;
            if (column.occupants[zIndex].right != undefined) return false;
            if (column.occupants[zIndex].left != undefined) return false;
            if (column.occupants[zIndex].center != undefined) return false;
        }
        return true
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();
        let p = this.parameters;
        let step = this.parent.verticalStep;
        let crossGeom = new THREE.BoxGeometry(this.width, p.sectionDepth, p.crossThickness);
        let crossMesh = ThreeUtilities.returnGroupAtDetailedCoord(crossGeom, this.blockObjectMaterial, new THREE.Vector3(0, -this.depth + p.crossDepth / 2, step - p.crossThickness / 2));
        this.blockObjectFixed.add(crossMesh);

    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth, y: this.width, quantity: 1, thickness: 0.75 });
        cost.plywoodCuts.push({ x: this.depth, y: this.parameters.slideHeight, quantity: 2, thickness: 0.75 });

        /* additional hardware */
        cost.hardwareList.push({
            name: "pins",
            unitCost: 0.05,
            parameters: {},
            quantity: 4
        });

        return cost;
    }

    /* once done, also update shelf.js blockList and imports */

}