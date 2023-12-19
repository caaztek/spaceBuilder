import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import Block from './block.js';
import { CSG } from 'three-csg-ts';

export default class PullDesk extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    setParameters() {
        this.parameters = PullDesk.parameters();
    }

    static parameters() {
        let param = super.parameters();
        param.name = "Pull-out desk";

        param.slideColor = "#ffffe6";
        param.objectColor = "#ffffe6";

        param.slideHeight = 5;
        param.sliderThickness = 4;
        param.deskTopThickness = 0.75;
        param.deskSideHeight = 4;
        param.deskSideThickness = 0.75;
        param.deskStickOut = 2;

        param.referenceIsBottom= true;
        param.minDistanceFromReference = 25;
        param.maxDistanceFromReference = 45;
        param.idealDistanceFromReference = 32;

        param.idealHorizontalLocation = 1;

        param.rightSlotsOccupyAbove = 2 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow= 1
        param.leftSlotsOccupyAbove= 2
        param.leftSlotsOccupyBelow= 1
        param.centerSlotsOccupyAbove= 2
        param.centerSlotsOccupyBelow= 1

        param.chamferFront = 2;
        param.chamferBottom = 2;

        param.minWidth = 15;
        param.maxWidth = 100;

        param.allowSlide = true;
        param.maxPullOutOffset = 10;

        param.priority = 9; 
        param.fillPerColumn = true

        return param;
    }

    scoreOption(column, zIndex) {
        /* check if there is another desk in the column */
        for (var i = 0; i < column.blocks.length; i++) {
            if (column.blocks[i].parameters.name == "Pull-out desk") {
                return 0;
            }
        }

        /* if no desk have been found, use standard scoring. */
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
    /* need custom slides to accomodate the shape */
        let shape = new THREE.Shape();
        let param = this.parameters;
        shape.moveTo(-param.slideHeight/2, 0);
        shape.lineTo(param.slideHeight/2, 0);
        shape.lineTo(param.slideHeight/2, param.slideThickness);
        shape.lineTo(param.sliderThickness/2, param.slideThickness);
        shape.lineTo(param.sliderThickness/2, param.slideThickness - param.slideRecess);
        shape.lineTo(-param.sliderThickness/2, param.slideThickness - param.slideRecess);
        shape.lineTo(-param.sliderThickness/2, param.slideThickness);
        shape.lineTo(-param.slideHeight/2, param.slideThickness);
        shape.lineTo(-param.slideHeight/2, 0);

        const extrudeSettings = {
            steps: 1,
            depth: this.depth,
            bevelEnabled: false,
        };
        
        let slideGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
        //slideGeometry.translate(0, param.deskSideHeight / 2 - param.deskTopThickness/2, 0);

        let slideMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(this.parent.width/2 - this.parent.partitionThickness / 2,0,param.deskTopThickness / 2 - param.deskSideHeight/2), this.sceneManager.zAxis, this.sceneManager.xAxis.clone().negate(), this.sceneManager.yAxis.clone().negate(),true);


        //let slideGeometry = new THREE.BoxGeometry(this.parameters.slideThickness, this.depth, this.parameters.slideHeight);
        // let slideMeshRight = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshRight.position.set(this.parent.width/2 - this.parent.partitionThickness / 2 - slideThickness/2, -this.depth/2, 0);
        // slideMeshRight.add(ThreeUtilities.returnObjectOutline(slideMeshRight))
        this.blockObjectFixed.add(slideMeshRight);

        let slideMeshLeft = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(-this.parent.width/2 + this.parent.partitionThickness / 2,0,param.deskTopThickness / 2 - param.deskSideHeight/2), this.sceneManager.zAxis.clone().negate(), this.sceneManager.xAxis.clone(), this.sceneManager.yAxis.clone().negate(),true);

        // let slideMeshLeft = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshLeft.position.set(-this.parent.width/2 + this.parent.partitionThickness / 2 + slideThickness/2, -this.depth/2, 0);
        // slideMeshLeft.add(ThreeUtilities.returnObjectOutline(slideMeshLeft))
        this.blockObjectFixed.add(slideMeshLeft);
    }

    makeMovingObject() {
        /* need custom object to accomodate the shape of the desk */

        let shape = new THREE.Shape();
        let p = this.parameters;
        shape.moveTo(-this.width/2, p.deskTopThickness/2 );
        shape.lineTo(this.width/2, p.deskTopThickness/2);
        shape.lineTo(this.width/2, -p.deskSideHeight + p.deskTopThickness/2);
        shape.lineTo(this.width/2 - p.deskSideThickness, -p.deskSideHeight + p.deskTopThickness/2);
        shape.lineTo(this.width/2 - p.deskSideThickness, -p.deskTopThickness/2);
        shape.lineTo(-this.width/2 + p.deskSideThickness, -p.deskTopThickness/2);
        shape.lineTo(-this.width/2 + p.deskSideThickness, -p.deskSideHeight + p.deskTopThickness/2);
        shape.lineTo(-this.width/2, -p.deskSideHeight + p.deskTopThickness/2);
        shape.lineTo(-this.width/2, p.deskTopThickness/2);

        const extrudeSettings = {
            steps: 1,
            depth: this.depth + p.deskStickOut,
            bevelEnabled: false,
        };

        let cutShape = new THREE.Shape();
        cutShape.moveTo(0,-p.deskSideHeight + p.deskTopThickness/2);
        cutShape.lineTo(0,-p.deskSideHeight + p.deskTopThickness/2 + p.chamferFront);
        cutShape.lineTo(-p.chamferBottom,-p.deskSideHeight + p.deskTopThickness/2);
        cutShape.lineTo(0,-p.deskSideHeight + p.deskTopThickness/2);

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

        this.blockObjectMoving.add(this.blockMesh);
        this.makeClickable(this.blockMesh);
    }

}
