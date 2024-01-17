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

export default class ShoeRack extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = ShoeRack.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        let stepHeight = 8;

        param.variations = [
            {
                variationName: "Shoe Rack",
                variationParameters: {
                    rightSlotsOccupyAbove: stepHeight,
                    rightSlotsOccupyBelow: 0,
                    leftSlotsOccupyAbove: stepHeight,
                    leftSlotsOccupyBelow: 0,
                    centerSlotsOccupyAbove: stepHeight,
                    centerSlotsOccupyBelow: 0,
                    centerSlotsOccupyAboveForced: stepHeight,
                    centerSlotsOccupyBelowForced: 0,
                    startBlockListFillingCoefficient: 0.02,
                }
            }
        ]

        param.referenceIsBottom = true;
        param.idealDistanceFromReference = 0;

        param.faceMargin = 0.25; //margin between top of face and next line
        param.widthMargin = 0.25;
        param.sliderHeight = 4;
        param.slideMargin = 0.75;
        param.faceThickness = 0.75;
        param.slotHeight = 9;
        param.slotThickness = 0.75;
        param.shoeWidth = 10.5;
        param.firstSlot = 2;

        param.minWidth = 14;

        param.priority = 20
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

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        let p = this.parameters;
        let step = this.findAncestorWithType("shelf").verticalStep;
        let faceHeight = step * p.rightSlotsOccupyAbove - p.faceMargin;

        /* make face of drawer */
        let faceGeometry = new THREE.BoxGeometry(this.width, p.faceThickness, faceHeight);
        faceGeometry.translate(0, 0, faceHeight / 2);

        let faceMesh = ThreeUtilities.returnGroupAtDetailedCoord(faceGeometry, this.blockObjectMaterial, new THREE.Vector3(0, -this.depth + p.faceThickness / 2, 0));
        this.blockObjectMoving.add(faceMesh);

        let backMesh = ThreeUtilities.returnGroupAtDetailedCoord(faceGeometry, this.blockObjectMaterial, new THREE.Vector3(0, - p.faceThickness / 2, 0));
        this.blockObjectMoving.add(backMesh);

        /* make sliders */
        let sliderGeometry = new THREE.BoxGeometry(this.sliderThickness, this.depth - p.faceThickness * 2, p.sliderHeight);
        let leftSliderMesh = ThreeUtilities.returnGroupAtDetailedCoord(sliderGeometry, this.blockObjectMaterial, new THREE.Vector3(-this.width / 2 + p.sliderThickness / 2, -this.depth / 2, p.sliderHeight / 2));
        this.blockObjectMoving.add(leftSliderMesh);
        let rightSliderMesh = ThreeUtilities.returnGroupAtDetailedCoord(sliderGeometry, this.blockObjectMaterial, new THREE.Vector3(this.width / 2 - p.sliderThickness / 2, -this.depth / 2, p.sliderHeight / 2));
        this.blockObjectMoving.add(rightSliderMesh);

        /* make all the rows */
        let numberOfSlots = Math.floor((faceHeight - p.firstSlot) / p.slotHeight);
        let slotGeometry = new THREE.BoxGeometry(this.width - p.sliderThickness * 2, this.depth - p.faceThickness * 2, p.slotThickness);

        let numberOfShoesPerRow = Math.floor((this.depth - p.faceThickness * 2) / p.shoeWidth);

        let shiftYPair = 6;
        let shiftZPair = 3
        let shiftYSneakers = 6.5;
        let shiftZSneakers = 0;

        for (var i = 0; i < numberOfSlots; i++) {
            let slotMesh = ThreeUtilities.returnGroupAtDetailedCoord(slotGeometry, this.blockObjectMaterial, new THREE.Vector3(0, -this.depth / 2, p.slotThickness / 2 + i * p.slotHeight + p.firstSlot));
            this.blockObjectMoving.add(slotMesh);
            for (var j = 0; j < numberOfShoesPerRow; j++) {
                if (i % 2 == 0) {
                    let position = new THREE.Vector3(0, -this.depth + j * p.shoeWidth + shiftYPair, p.slotThickness / 2 + i * p.slotHeight + shiftZPair + p.firstSlot)
                    this.sceneManager.objectCache.loadObject("shoePair", (shoe) => {
                        //console.log(shoe.position)
                        this.blockObjectMoving.add(shoe);
                    }, false, undefined, true, position);
                } else {
                    let position = new THREE.Vector3(0, -this.depth + j * p.shoeWidth + shiftYSneakers, p.slotThickness / 2 + i * p.slotHeight + shiftZSneakers + p.firstSlot)
                    this.sceneManager.objectCache.loadObject("sneakers", (shoe) => {
                        //console.log(shoe.position)
                        this.blockObjectMoving.add(shoe);
                    }, false, undefined, true, position);
                }
            }

        }

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