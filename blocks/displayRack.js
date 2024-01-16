import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';
import { Vector } from 'three-csg-ts/lib/esm/Vector.js';

/* default template.
1. Change TemplateName
2. Update SetParameter with chosenName.parameters()
3. Change param.name with proper name. Update all other parameters as necessary
4. Make custom score if necessary
5. Uodpate makeSlides() as necessary. Can start from super.makeSlides() if useful. It will make standard slides with a slot
6. Update makeMovingObject() as necessary. Can start from super.makeMovingObject() if useful. It will make standard moving object with a slot
7. In Shelf.js, import /block/templateName.js and update setBlockList to include the new block type
 */

export default class DisplayRack extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = DisplayRack.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        param.variations = [
            {
                variationName: "Display Rack",
                variationParameters: {
                    rightSlotsOccupyAbove: 1,
                    rightSlotsOccupyBelow: 0,
                    leftSlotsOccupyAbove: 1,
                    leftSlotsOccupyBelow: 0,
                    centerSlotsOccupyAbove: 4,
                    centerSlotsOccupyAboveForced: 1,
                    centerSlotsOccupyBelow: 0,
                    centerSlotsOccupyBelowForced: 0,
                    startBlockListFillingCoefficient : 0,
                    centerSlotsOccupyBelow: 0,

                }
            }
        ]

        param.widthMargin = 0;

        param.slideHeight = 1.5;
        param.slideWidth = 1.5;

        param.priority = 2
        param.onePerColumn = false
        param.fillPerColumn = false

        param.allowSlide = false

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
        let p = this.parameters;
        let partitionDepth = this.parent.rightPartition.bandWidth
        let slideGeometry = new THREE.BoxGeometry(p.slideWidth, this.depth - partitionDepth * 2, p.slideHeight);
        slideGeometry.translate(0, -this.depth / 2, p.slideHeight / 2);
        let slideMesh = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(this.parent.returnWidth() / 2, 0, 0));
        this.blockObjectFixed.add(slideMesh);

        if (!this.parent.leftPartition.leftColumn || !(this.parent.leftPartition.leftColumn.rightOccupants[this.zIndex] instanceof this.constructor)) {
            let slideMesh2 = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(-this.parent.returnWidth() / 2, 0, 0));
            this.blockObjectFixed.add(slideMesh2);
        }

        //super.makeSlides();
    }

    changeObjectColor(color) {
        /* overwrite for unique objects like gltf imports that need to be traversed */
        super.changeObjectColor(color);
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();
        let partitionDepth = this.parent.rightPartition.bandWidth
        let p = this.parameters;
        let frontGeometry = new THREE.BoxGeometry(this.width, p.slideWidth, p.slideHeight);
        frontGeometry.translate(0, 0, p.slideHeight / 2);
        this.blockMesh = ThreeUtilities.returnGroupAtDetailedCoord(frontGeometry, this.blockSlidesMaterial, new THREE.Vector3(0, -this.depth + partitionDepth / 2, 0));
        let slideMeshBack = ThreeUtilities.returnGroupAtDetailedCoord(frontGeometry, this.blockSlidesMaterial, new THREE.Vector3(0, -partitionDepth / 2, 0));
        this.blockObjectMoving.add(this.blockMesh);
        this.blockObjectMoving.add(slideMeshBack);

        this.makeClickable(this.blockMesh)
    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0

        let partitionDepth = this.parent.rightPartition.bandWidth

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth - partitionDepth * 2, y: this.parameters.slideWidth, quantity: 2, thickness: 0.75 });
        cost.plywoodCuts.push({ x: this.width, y: this.parameters.slideHeight, quantity: 2, thickness: 1.5 });

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