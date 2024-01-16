import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

export default class FixedDesk extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName );
    }

    setParameters() {

        this.parameters = FixedDesk.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */
        param.variations= [
            {
                variationName: "Fixed desk",
                variationParameters: {
                }
            }
        ],

        param.objectColor=  "#ffffe6",

        param.desktopThickness = 1.5;
        param.slideHeight = 1.5; //bottom of the desk will be aligned with tick

        param.referenceIsBottom= true;
        param.minDistanceFromReference = 25;
        param.maxDistanceFromReference = 45;
        param.idealDistanceFromReference = 32;

        param.idealHeight = 1.5;

        param.minWidth = 30;
        param.idealWidth = 60;
        param.widthMargin = 0;

        param.minDepth  = 20;
        param.idealDepth = 40;

        param.idealHorizontalLocation = 1;

        param.rightSlotsOccupyAbove = 1 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow= 0
        param.leftSlotsOccupyAbove= 1
        param.leftSlotsOccupyBelow= 0
        param.centerSlotsOccupyAbove= 8
        param.centerSlotsOccupyBelow= 0
        param.centerSlotsOccupyAboveForced= 1
        param.centerSlotsOccupyBelowForced= 0

        param.allowSlide = false

        param.priority = 10
        param.onePerColumn = true
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
        //super.makeMovingObject();
        let deskGeom = new THREE.BoxGeometry(this.width, this.depth, this.parameters.desktopThickness);
        let deskMesh = ThreeUtilities.returnGroupAtDetailedCoord(deskGeom, this.blockObjectMaterial, new THREE.Vector3(0,-this.depth/2,this.parameters.desktopThickness/2));
        this.blockObjectMoving.add(deskMesh);


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
        }, false, undefined, true);

    }

    estimatecost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.desiredMargin = 0;
        cost.fixedCost = 0; //no assembly required 

        /* estimate plywood total surface */
        cost.plywoodUsage += 0

        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth, y: this.width, quantity: 2, thickness : 0.75 });

        /* additional hardware */
        cost.hardwareList.push({ 
            name: "pins", 
            unitCost: 0.05,
            parameters:{},
            quantity: 4 
        });

        return cost;
    }

    /* once done, also update shelf.js blockList and imports */

}