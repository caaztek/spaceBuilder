import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

export default class FixedDesk extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    setParameters() {

        this.parameters = FixedDesk.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */
        param.name = "Fixed desk";

        param.objectColor=  "#ffffe6",

        param.desktopThickness = 1.5;

        param.referenceIsBottom= true;
        param.minDistanceFromReference = 25;
        param.maxDistanceFromReference = 45;
        param.idealDistanceFromReference = 32;

        param.idealHeight = 1.5;

        param.minWidth = 30;
        param.idealWidth = 60;
        param.widthMargin = 0;

        param.idealHorizontalLocation = 1;

        param.rightSlotsOccupyAbove = 1 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow= 0
        param.leftSlotsOccupyAbove= 1
        param.leftSlotsOccupyBelow= 0
        param.centerSlotsOccupyAbove= 8
        param.centerSlotsOccupyBelow= 0

        param.allowSlide = false

        param.priority = 10; 
        param.fillPerColumn = true

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {

        //super.makeSlides();
    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        super.makeMovingObject();

        this.sceneManager.objectCache.loadObject("officeMug", (objectName) => {
            objectName.traverse((child) => {
                if (child.isMesh) {
                    child.material.metalness = 0;
                   // let color = child.material.color.clone();
                    //child.material = new THREE.MeshLambertMaterial({ color: color });
                }
            });
            objectName.position.set(this.width / 2 - 4,-5,0.8);
            //let scale = 1;
            this.blockObjectMoving.add(objectName);
        }, false, false, undefined, true);

    }

    /* once done, also update shelf.js blockList and imports */

}