import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

export default class Drawer extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = Drawer.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */
        param.variations = [
            {
                variationName: "Thin Drawer",
                variationParameters: {
                    rightSlotsOccupyAbove: 1,
                    leftSlotsOccupyAbove: 1,
                    centerSlotsOccupyAbove: 1,
                    centerSlotsOccupyAboveForced: 1,
                    centerSlotsOccupyBelowForced: 0,
                    startBlockListFillingCoefficient : 0.1,
                    priority : 1
                }
            },
            {
                variationName: "Regular Drawer",
                variationParameters: {
                    rightSlotsOccupyAbove: 2,
                    leftSlotsOccupyAbove: 2,
                    centerSlotsOccupyAbove: 2,
                    centerSlotsOccupyAboveForced: 2,
                    centerSlotsOccupyBelowForced: 0,
                    startBlockListFillingCoefficient : 0.2,
                    priority : 3
                }
            },
            {
                variationName: "Tall Drawer",
                variationParameters: {
                    rightSlotsOccupyAbove: 3,
                    leftSlotsOccupyAbove: 3,
                    centerSlotsOccupyAbove: 3,
                    centerSlotsOccupyAboveForced: 3,
                    centerSlotsOccupyBelowForced: 0,
                    startBlockListFillingCoefficient : 0.2,
                    priority : 4
                }
            },
        ]

        param.referenceIsBottom = true;
        param.idealDistanceFromReference = 0;
        param.minDistanceFromReference = 0;
        param.verticalWeight = 10;

        param.horizontalWeight = 0;

        // // param.rightSlotsOccupyAbove = 2 //how many slots above the reference slot it occupies. Including where it is attached
        // param.rightSlotsOccupyBelow = 0
        // // param.leftSlotsOccupyAbove = 2
        // param.leftSlotsOccupyBelow = 0
        // // param.centerSlotsOccupyAbove = 2
        // param.centerSlotsOccupyBelow = 0

        param.faceMargin = 0.25; //gap between top of drawer and next
        param.sliderMargin = 2; //gap between top of slider and next
        param.slideMargin = 1.5 // different between slider and slide
        param.slideThickness = 0.75;
        param.slideExtra = 0.375
        param.faceThickness = 0.75;
        param.sideThickness = 0.75;
        param.bottomThickness = 0.25;
        param.widthMargin = 0.25; //gap between edge of partition and edge of slider

        param.priority = 2
        param.onePerColumn = false
        param.fillPerColumn = false
        param.priority = 7

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    setDimensions() {
        super.setDimensions();
        let p = this.parameters;
        let step = this.parent.verticalStep;
        this.sliderHeight = step * p.rightSlotsOccupyAbove - p.sliderMargin;
        this.slideHeight = this.sliderHeight - p.slideMargin;
        this.faceHeight = step * p.rightSlotsOccupyAbove - p.faceMargin;
        this.totalHeight = this.faceHeight
    }

    makeSlides() {
        let p = this.parameters;
        //let step = this.findAncestorWithType("shelf").verticalStep;



        let slideGeometry = new THREE.BoxGeometry(p.slideThickness, this.depth - p.faceThickness, this.slideHeight);
        slideGeometry.translate(-(this.parent.width - this.parent.partitionThickness) / 2 + p.slideThickness / 2, p.faceThickness / 2 - this.depth / 2, this.sliderHeight / 2);
        let slideMesh = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        slideMesh.add(ThreeUtilities.returnObjectOutline(slideMesh));
        this.blockObjectFixed.add(slideMesh);

        let slideGeometry2 = new THREE.BoxGeometry(p.slideThickness, this.depth - p.faceThickness, this.slideHeight);
        slideGeometry2.translate(+(this.parent.width - this.parent.partitionThickness) / 2 - p.slideThickness / 2, p.faceThickness / 2 - this.depth / 2, this.sliderHeight / 2);
        let slideMesh2 = new THREE.Mesh(slideGeometry2, this.blockSlidesMaterial);
        slideMesh2.add(ThreeUtilities.returnObjectOutline(slideMesh2));
        this.blockObjectFixed.add(slideMesh2);

    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();

        let p = this.parameters;
        let step = this.findAncestorWithType("shelf").verticalStep;
        let sliderHeight = step * p.rightSlotsOccupyAbove - p.sliderMargin;
        let slideHeight = sliderHeight - p.slideMargin;


        let lastIndex = this.zIndex + p.rightSlotsOccupyAbove - 1;
        if (this.parent.occupants[lastIndex] != undefined && this.parent.occupants[lastIndex].cross != undefined) {
            this.faceHeight -= this.parent.occupants[lastIndex].cross.parameters.crossThickness;
        }

        /* make face of drawer */
        let faceGeometry = new THREE.BoxGeometry(this.width, p.faceThickness, this.faceHeight);
        faceGeometry.translate(0, p.faceThickness / 2 - this.depth, this.faceHeight / 2);

        this.blockMesh = new THREE.Mesh(faceGeometry, this.blockObjectMaterial);
        this.blockMesh.add(ThreeUtilities.returnObjectOutline(this.blockMesh));
        this.blockObjectMoving.add(this.blockMesh);

        this.makeClickable(this.blockMesh);

        /* make sides */
        let sideGeometry = new THREE.BoxGeometry(p.sideThickness, this.depth - p.faceThickness - p.sideThickness, sliderHeight);
        sideGeometry.translate(-this.width / 2 + p.sideThickness / 2, p.faceThickness / 2 - this.depth / 2 - p.sideThickness / 2, sliderHeight / 2);
        let sideMesh = new THREE.Mesh(sideGeometry, this.blockObjectMaterial);
        sideMesh.add(ThreeUtilities.returnObjectOutline(sideMesh));
        this.blockObjectMoving.add(sideMesh);

        let sideGeometry2 = new THREE.BoxGeometry(p.sideThickness, this.depth - p.faceThickness - p.sideThickness, sliderHeight);
        sideGeometry2.translate(this.width / 2 - p.sideThickness/2, p.faceThickness / 2 - this.depth / 2 - p.sideThickness / 2, sliderHeight / 2);
        let sideMesh2 = new THREE.Mesh(sideGeometry2, this.blockObjectMaterial);
        sideMesh2.add(ThreeUtilities.returnObjectOutline(sideMesh2));
        this.blockObjectMoving.add(sideMesh2);

        /* make back */
        let backGeometry = new THREE.BoxGeometry(this.width, p.sideThickness, sliderHeight);
        backGeometry.translate(0, -p.sideThickness / 2, sliderHeight / 2);
        let backMesh = new THREE.Mesh(backGeometry, this.blockObjectMaterial);
        backMesh.add(ThreeUtilities.returnObjectOutline(backMesh));
        this.blockObjectMoving.add(backMesh);

        /* make bottom */
        let bottomGeometry = new THREE.BoxGeometry(this.width - p.sideThickness * 2, this.depth - p.faceThickness - p.sideThickness, p.bottomThickness);
        bottomGeometry.translate(0, p.faceThickness / 2 - this.depth / 2 - p.sideThickness / 2, p.bottomThickness / 2);
        let bottomMesh = new THREE.Mesh(bottomGeometry, this.blockObjectMaterial);
        //bottomMesh.add(ThreeUtilities.returnObjectOutline(bottomMesh));
        this.blockObjectMoving.add(bottomMesh);

    }


    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 5; //potentially difficult assembly

        /* estimate plywood total surface */
        cost.plywoodUsage += 0 // anything not counted in cuts to reflect nesting for example.

        let p = this.parameters;
        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth - p.faceThickness, y: this.slideHeight, quantity: 2, thickness: 0.75 }); //slides
        cost.plywoodCuts.push({ x: this.faceHeight, y: this.width, quantity: 1, thickness: 0.75 }); //face
        cost.plywoodCuts.push({ x: this.depth - p.faceThickness - p.sideThickness, y: this.sliderHeight, quantity: 2, thickness: 0.75 }); //side
        cost.plywoodCuts.push({ x: this.sliderHeight, y: this.width, quantity: 1, thickness: 0.75 }); //back
        cost.plywoodCuts.push({ x: this.depth - p.faceThickness - p.sideThickness, y: this.width - p.sideThickness * 2, quantity: 1, thickness: p.bottomThickness }); //bottom

        /* additional hardware */
        cost.hardwareList.push({
            name: "pins",
            unitCost: 0.05,
            parameters: {},
            quantity: 4
        });

        return cost;
    }

}