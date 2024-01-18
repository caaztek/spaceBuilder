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

export default class CubeShelf extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    setParameters() {
        this.parameters = CubeShelf.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */

        let height = 3;
        param.variations = [
            {
                variationName: "Cube Shelf",
                variationParameters: {
                    rightSlotsOccupyAbove: height,
                    rightSlotsOccupyBelow: 0,
                    leftSlotsOccupyAbove: height,
                    leftSlotsOccupyBelow: 0,
                    centerSlotsOccupyAbove: height,
                    centerSlotsOccupyBelow: 0,
                    centerSlotsOccupyAboveForced: height,
                    centerSlotsOccupyBelowForced: 0,
                }
            }
        ]

        param.faceMargin = 0.25;
        param.widthMargin = 0;

        param.frontDepth = 10;
        param.wallThickness = 0.75;
        param.bookColor = "#9bb3ad";

        param.priority = 2
        param.onePerColumn = false
        param.fillPerColumn = false

        param.allowSlide = true;
        param.maxPullOut = 3;
        param.pullOutSpeed = 0.006

        return param;
    }

    updateAnimation(timeOffset) {
        let param = this.parameters;
        if (this.animationStatus == 1) {
            this.pullOutPosition += param.pullOutSpeed * timeOffset;
            if (this.pullOutPosition >= this.maxPullOut) {
                this.pullOutPosition = this.maxPullOut;
                this.animationStatus = 2;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        } else if (this.animationStatus == 3) {
            this.pullOutPosition -= param.pullOutSpeed * timeOffset;
            if (this.pullOutPosition <= 0) {
                this.pullOutPosition = 0;
                this.animationStatus = 0;
                this.sceneManager.removeTimerCallback(this.sceneID);
                this.callAllUpdates("reachEnd");
            }
        }
        for (var i = 0; i < this.bookArray.length; i++) {
            this.bookArray[i].position.setY(-this.pullOutPosition * (1 + Math.cos(i / this.numberOfBooks * 2 * Math.PI - Math.PI / 2)));
        }
    }

    setDimensions() {
        super.setDimensions();
        this.bookMaterial = new THREE.MeshLambertMaterial({ color: this.parameters.bookColor });
        this.maxPullOut = this.parameters.maxPullOut;
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
        //super.makeMovingObject();

        let step = this.findAncestorWithType("shelf").verticalStep;
        let p = this.parameters;
        let height = p.rightSlotsOccupyAbove * step - p.faceMargin;
        let depth = Math.min(p.frontDepth,this.depth);

        /* make backFace */
        let mainCubeGeom = new THREE.BoxGeometry(this.width, depth, height);
        mainCubeGeom.translate(0, - this.depth + depth / 2, height / 2,);
        let mainCubeMesh = new THREE.Mesh(mainCubeGeom, this.blockObjectMaterial);

        let cutMeshGeom = new THREE.BoxGeometry(this.width - p.wallThickness * 2,depth - p.wallThickness, height - p.wallThickness * 2);
        cutMeshGeom.translate(0, -this.depth + (depth - p.wallThickness) / 2, height / 2);
        let cutMesh = new THREE.Mesh(cutMeshGeom, this.blockObjectMaterial);

        cutMesh.updateMatrix();
        mainCubeMesh.updateMatrix();
        mainCubeMesh = CSG.subtract(mainCubeMesh, cutMesh);
        mainCubeMesh.updateMatrix();
        mainCubeMesh.add(ThreeUtilities.returnObjectOutline(mainCubeMesh));

        this.blockObjectMoving.add(mainCubeMesh);

        /* now fill with books */
        let baseBookWidth = 1;
        let baseBookHeight = height * 0.7;
        let baseBookDepth = (depth - p.wallThickness) * 0.7;

        let xPosition = -this.width / 2 + p.wallThickness;
        let yPosition = -this.depth + depth - p.wallThickness;
        let zPosition = p.wallThickness;

        this.bookArray = [];
        while (xPosition < this.width / 2 - p.wallThickness - baseBookWidth * 2) {
            let bookWidth = baseBookWidth + (Math.random() - 1) * 0.4;
            let bookHeight = baseBookHeight + (Math.random() - 1) * 0.4;
            let bookDepth = baseBookDepth + (Math.random() - 1) * 0.3;
            let newBookGeom = new THREE.BoxGeometry(bookWidth, bookDepth , bookHeight);
            newBookGeom.translate(bookWidth/2, -bookDepth/2 + yPosition, bookHeight / 2);
            let newBookMesh = ThreeUtilities.returnGroupAtDetailedCoord(newBookGeom, this.bookMaterial, new THREE.Vector3(xPosition , 0 , zPosition))
            this.blockObjectMoving.add(newBookMesh);
            this.bookArray.push(newBookMesh);
            xPosition += bookWidth + 0.1;
        }   
        this.numberOfBooks = this.bookArray.length;
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