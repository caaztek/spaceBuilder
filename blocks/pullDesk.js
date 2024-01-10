import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import Block from './block.js';
import { CSG } from 'three-csg-ts';

export default class PullDesk extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent,variationName);
    }

    setParameters() {
        this.parameters = PullDesk.parameters();
    }

    static parameters() {
        let param = super.parameters();
        param.variations = [
            {
                variationName: "Pull-out desk",
                variationParameters: {
                }
            }
        ],

        param.slideColor = "#ffffe6";
        param.objectColor = "#ffffe6";

        param.deskTopThickness = 0.75;
        param.deskSideAboveTick = 1.5;
        param.deskSideBelowTick = 4;
        param.deskSideThickness = 0.75;
        param.widthMargin = 0.25;

        param.slideAboveTick = 0;
        param.slideBelowTick = 3.25;

        param.deskStickOut = 2;

        param.referenceIsBottom= true;
        param.minDistanceFromReference = 25;
        param.maxDistanceFromReference = 45;
        param.idealDistanceFromReference = 32;

        param.idealHorizontalLocation = 1;

        param.rightSlotsOccupyAbove = 1 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow= 1
        param.leftSlotsOccupyAbove= 1
        param.leftSlotsOccupyBelow= 1
        param.centerSlotsOccupyAbove= 1
        param.centerSlotsOccupyBelow= 1

        param.chamferFront = 2;
        param.chamferBottom = 2;

        param.minWidth = 15;
        param.maxWidth = 100;

        param.allowSlide = true;
        param.maxPullOutOffset = 10;

        param.priority = 9; 
        param.onePerColumn = true
        param.fillPerColumn = true

        return param;
    }

    scoreOption(column, zIndex) {
        /* if no desk have been found, use standard scoring. */
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
    /* need custom slides to accomodate the shape */
        // let shape = new THREE.Shape();
        // let param = this.parameters;
        // shape.moveTo(-param.slideHeight/2, 0);
        // shape.lineTo(param.slideHeight/2, 0);
        // shape.lineTo(param.slideHeight/2, param.slideThickness);
        // shape.lineTo(param.sliderThickness/2, param.slideThickness);
        // shape.lineTo(param.sliderThickness/2, param.slideThickness - param.slideRecess);
        // shape.lineTo(-param.sliderThickness/2, param.slideThickness - param.slideRecess);
        // shape.lineTo(-param.sliderThickness/2, param.slideThickness);
        // shape.lineTo(-param.slideHeight/2, param.slideThickness);
        // shape.lineTo(-param.slideHeight/2, 0);

        // const extrudeSettings = {
        //     steps: 1,
        //     depth: this.depth,
        //     bevelEnabled: false,
        // };
        
        // let slideGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
        // //slideGeometry.translate(0, param.deskSideHeight / 2 - param.deskTopThickness/2, 0);


        // let slideMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(this.parent.width/2 - this.parent.partitionThickness / 2,0,param.deskTopThickness / 2 - param.deskSideHeight/2), this.sceneManager.zAxis, this.sceneManager.xAxis.clone().negate(), this.sceneManager.yAxis.clone().negate(),true);

        let slideGeometry = new THREE.BoxGeometry(this.parameters.slideThickness, this.depth, (this.parameters.slideAboveTick + this.parameters.slideBelowTick));
        let slideMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(this.parent.width/2 - this.parent.partitionThickness / 2 - this.parameters.slideThickness / 2,-this.depth/2,-this.parameters.slideBelowTick + (this.parameters.slideAboveTick + this.parameters.slideBelowTick)/2), this.sceneManager.xAxis, this.sceneManager.yAxis, this.sceneManager.zAxis,true);


        //let slideGeometry = new THREE.BoxGeometry(this.parameters.slideThickness, this.depth, this.parameters.slideHeight);
        // let slideMeshRight = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshRight.position.set(this.parent.width/2 - this.parent.partitionThickness / 2 - slideThickness/2, -this.depth/2, 0);
        // slideMeshRight.add(ThreeUtilities.returnObjectOutline(slideMeshRight))
        this.blockObjectFixed.add(slideMeshRight);

        let slideMeshLeft = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(-this.parent.width/2 + this.parent.partitionThickness / 2 + this.parameters.slideThickness / 2,-this.depth/2,-this.parameters.slideBelowTick + (this.parameters.slideAboveTick + this.parameters.slideBelowTick)/2), this.sceneManager.xAxis, this.sceneManager.yAxis, this.sceneManager.zAxis,true);

        // let slideMeshLeft = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshLeft.position.set(-this.parent.width/2 + this.parent.partitionThickness / 2 + slideThickness/2, -this.depth/2, 0);
        // slideMeshLeft.add(ThreeUtilities.returnObjectOutline(slideMeshLeft))
        this.blockObjectFixed.add(slideMeshLeft);
    }

    makeMovingObject() {
        /* need custom object to accomodate the shape of the desk */

        let shape = new THREE.Shape();
        let p = this.parameters;
        shape.moveTo(-this.width/2, p.deskSideAboveTick );
        shape.lineTo(this.width/2, p.deskSideAboveTick);
        shape.lineTo(this.width/2, -p.deskSideBelowTick);
        shape.lineTo(this.width/2 - p.deskSideThickness, -p.deskSideBelowTick);
        shape.lineTo(this.width/2 - p.deskSideThickness, p.deskSideAboveTick - p.deskSideThickness);
        shape.lineTo(-this.width/2 + p.deskSideThickness, p.deskSideAboveTick - p.deskSideThickness);
        shape.lineTo(-this.width/2 + p.deskSideThickness, -p.deskSideBelowTick);
        shape.lineTo(-this.width/2, -p.deskSideBelowTick);
        shape.lineTo(-this.width/2, p.deskSideAboveTick); 

        const extrudeSettings = {
            steps: 1,
            depth: this.depth + p.deskStickOut,
            bevelEnabled: false,
        };

        let cutShape = new THREE.Shape();
        cutShape.moveTo(0,-p.deskSideBelowTick);
        cutShape.lineTo(0,-p.deskSideBelowTick + p.chamferFront);
        cutShape.lineTo(-p.chamferBottom, - p.deskSideBelowTick);
        cutShape.lineTo(0,-p.deskSideBelowTick);

        let extrudeSettingsCut = {
            steps: 1,
            depth: this.parent.width,
            bevelEnabled: false,
        };

        let cutGeometry = new THREE.ExtrudeGeometry( cutShape, extrudeSettingsCut );
        let cutMesh = ThreeUtilities.returnGroupAtDetailedCoord(cutGeometry, this.blockObjectMaterial, new THREE.Vector3(this.parent.width/2,-this.depth - p.deskStickOut,0), this.sceneManager.yAxis.clone().negate(), this.sceneManager.zAxis, this.sceneManager.xAxis.clone().negate(),false);

        let deskGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
        this.blockMesh = ThreeUtilities.returnGroupAtDetailedCoord(deskGeometry, this.blockObjectMaterial, new THREE.Vector3(0,0,0), this.sceneManager.xAxis, this.sceneManager.zAxis, this.sceneManager.yAxis.clone().negate(),false);

        cutMesh.updateMatrix();
        this.blockMesh = CSG.subtract(this.blockMesh, cutMesh);
        this.blockMesh.updateMatrix();

        this.blockMesh.add(ThreeUtilities.returnObjectOutline(this.blockMesh))

        /* add another shelf at the bottom */
        this.shelfGeometry = new THREE.BoxGeometry(this.width - p.deskSideThickness * 2, this.depth, p.deskTopThickness);
        this.shelfMesh = new THREE.Mesh(this.shelfGeometry, this.blockObjectMaterial);
        this.shelfMesh.position.set(0, -this.depth/2, -p.deskSideBelowTick + p.deskTopThickness/2);
        this.shelfMesh.add(ThreeUtilities.returnObjectOutline(this.shelfMesh))
        this.blockObjectMoving.add(this.shelfMesh);

        this.blockObjectMoving.add(this.blockMesh);
        this.makeClickable(this.blockMesh);
    }

}
