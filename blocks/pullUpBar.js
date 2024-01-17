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

export default class PullUpBar extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = PullUpBar.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        param.variations = [
            {
                variationName: "Pull-up Bar",
                variationParameters: {
                    rightSlotsOccupyAbove: 2,
                    rightSlotsOccupyBelow: 0,
                    leftSlotsOccupyAbove: 2,
                    leftSlotsOccupyBelow: 0,
                    centerSlotsOccupyAbove: 2,
                    centerSlotsOccupyBelow: 0,
                    centerSlotsOccupyAboveForced: 2,
                    centerSlotsOccupyBelowForced: 0,
                    startBlockListFillingCoefficient : 1,
                }
            }
        ]

        param.referenceIsBottom = true;
        param.idealDistanceFromReference = 96;

        param.barRadius = 0.75;
        param.barStickOut = 15;
        param.barOffset = 0.5;
        param.woodThickness = 1.5;
        param.widthMargin = 0;
        param.barColor = "#757574"
        param.hole2 = 10;
        param.woodHeight = 6;

        param.minWidth = 20;

        param.priority = 10
        param.onePerColumn = true
        param.fillPerColumn = true

        param.allowSlide = false

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    changeObjectColor(color) {
        this.blockObjectMaterial.color.set(color == undefined ? this.parameters.objectColor : color);
        this.barMaterial.color.set(color == undefined ? this.parameters.barColor : color);
    }

    makeSlides() {
        //super.makeSlides();
    }

    setDimensions() {
        super.setDimensions();
        this.barMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.barColor });
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();
        let p = this.parameters;
        let step = this.findAncestorWithType("shelf").verticalStep;
        //let woodHeight = step * p.rightSlotsOccupyAbove; //looked a bit too big
        let woodHeight = p.woodHeight;
        this.woodHeight = woodHeight;

        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(this.depth + p.barStickOut, 0);
        shape.absarc(this.depth + p.barStickOut, woodHeight / 2, woodHeight / 2, -Math.PI / 2, Math.PI / 2, false);
        shape.lineTo(0, woodHeight);
        shape.lineTo(0, 0);

        // Create the hole path
        var holePath = new THREE.Path();
        holePath.absarc(this.depth + p.barStickOut, woodHeight/2, p.barRadius, 0, Math.PI * 2, true); // Circular hole, co-centric with the rounded corner
        // Add the hole to the shape
        shape.holes.push(holePath);

        let hole2 = new THREE.Path();
        hole2.absarc(this.depth + p.barStickOut - p.hole2, woodHeight/2, p.barRadius, 0, Math.PI * 2, true); // Circular hole, co-centric with the rounded corner
        shape.holes.push(hole2);

        const extrudeSettings = {
            steps: 1,
            depth: p.woodThickness,
            bevelEnabled: false,
        };

        let woodGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        let leftWoodMesh = ThreeUtilities.returnGroupAtDetailedCoord(woodGeometry, this.blockObjectMaterial, new THREE.Vector3(-this.width / 2 + p.woodThickness, 0, 0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis.clone().negate());
        this.blockObjectFixed.add(leftWoodMesh);

        let rightWoodMesh = ThreeUtilities.returnGroupAtDetailedCoord(woodGeometry, this.blockObjectMaterial, new THREE.Vector3(this.width / 2 , 0, 0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis.clone().negate());
        this.blockObjectFixed.add(rightWoodMesh);

        /* add cylinder */
        let bar = ThreeUtilities.returnCylinder(new THREE.Vector3(-this.width/2 - p.barOffset, -this.depth - p.barStickOut, woodHeight/2), new THREE.Vector3(this.width/2+ p.barOffset, -this.depth - p.barStickOut, woodHeight/2), p.barRadius, this.barMaterial, 12)
        this.blockObjectFixed.add(bar);

        this.blockObjectFixed.add(ThreeUtilities.returnCylinder(new THREE.Vector3(-this.width/2 - p.barOffset, -this.depth - p.barStickOut + p.hole2, woodHeight/2), new THREE.Vector3(this.width/2+ p.barOffset, -this.depth - p.barStickOut + p.hole2, woodHeight/2), p.barRadius, this.barMaterial, 12))


    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0

        let p = this.parameters;
        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth + p.barStickOut + this.woodHeight / 2, y: this.woodHeight, quantity: 2, thickness: 1.5 });

        /* additional hardware */
        cost.hardwareList.push({
            name: "bar",
            unitCost: this.width * 1,
            parameters: {},
            quantity: 2
        });

        return cost;
    }

    /* once done, also update shelf.js blockList and imports */

}