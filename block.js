import { SceneEntity, ThreeUtilities } from './sceneManager.js';
import { LinearModifier, PlanarModifier } from './modifier.js';
import * as THREE from 'three';
import Column from './column.js';
import { CSG } from 'three-csg-ts';

/* class containing all the information for a given shelf unit, made of many columns */
export default class Block extends SceneEntity {
    constructor(sceneManager, shelf) {
        super(sceneManager, undefined, "block");

        this.shelf = shelf; // blocks are attached to shelves when created. They can then assigned themselved to columns and position themselves.

        this.boundUpdateAnimation = this.updateAnimation.bind(this);

        this.setParameters();
        //this.setDimensions();
       // this.update();
    }

    findBestPosition(insert = true) {
        /* make a list of all the possible options to fit this block in this shelf */
        let options = [];
        let bestOption = {
            score: 0,
        }
        this.shelf.columns.forEach(column => {
            for (var i = 0 ; i < column.maxZIndex(); i++) {
                let score = this.scoreOption(column, i);
                if (score > 0 && score > bestOption.score) {
                    bestOption = {
                        score: score,
                        column: column,
                        zIndex: i,
                    }
                }
            }
        });

        if (insert && bestOption.score != 0) {
            /* we found one valid solution. */
            this.setColumn(bestOption.column).setZIndex(bestOption.zIndex);
        }

        return bestOption;
    }

    scoreOption(column, zIndex) {
        /* score the option of placing the block in the given column at the given zIndex */
        let param = this.parameters;

        /* check availability of placement */
        for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
            if (column.rightOccupants[i] != undefined) {return 0}
        }
        for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
            if (column.leftOccupants[i] != undefined) {return 0}
        }
        for (var i = zIndex - param.centerSlotsOccupyBelow; i < zIndex + param.centerSlotsOccupyAbove; i++) {
            if (column.centerOccupants[i] != undefined) {return 0}
        }

        /* vertical score */
        let optionHeight = zIndex * column.verticalStep;
        let verticalScore;
        if (param.referenceIsBottom) {
            verticalScore = Math.abs(optionHeight - param.idealDistanceFromReference) / column.height;
        } else {
            verticalScore = Math.abs(optionHeight - (column.height - param.idealDistanceFromReference)) / column.height;
        }

        /* horizontal score */
        let horizontalScore = Math.abs(column.index / this.shelf.columns.length - param.idealHorizontalLocation);

        /* width score */
        if (column.width < param.minWidth || column.width > param.maxWidth) {return 0}
        let widthScore = Math.abs(column.width - param.idealWidth) / param.idealWidth;

        let score = 100 - (verticalScore * param.verticalWeight + horizontalScore * param.horizontalWeight + widthScore * param.widthWeight);

        return score;
    }

    setColumn(column) {
        this.parent = column;
        column.object.add(this.object); // important because column object is centered on column
        column.blocks.push(this); //add to parent's list of blocks. Not sure if this should be handled by this or parents.

        return this;
    }

    setZIndex(zIndex) {
        this.zIndex = zIndex;

        /* occupy the column objects according to block size */
        let param = this.parameters;
        for (var i = zIndex - param.rightSlotsOccupyBelow; i < zIndex + param.rightSlotsOccupyAbove; i++) {
            this.parent.rightOccupants[i] = this;
        }
        for (var i = zIndex - param.leftSlotsOccupyBelow; i < zIndex + param.leftSlotsOccupyAbove; i++) {
            this.parent.leftOccupants[i] = this;
        }
        for (var i = zIndex - param.centerSlotsOccupyBelow; i < zIndex + param.centerSlotsOccupyAbove; i++) {
            this.parent.centerOccupants[i] = this;
        }

        this.update();
        return this;
    }

    static parameters() {
        return {
            name: "defaultBlock",
            slideColor: "#ffffe6",
            objectColor:  "#ffffe6",

            maxDistanceFromReference: 100,
            minDistanceFromReference: 0, 
            idealDistanceFromReference: 10,
            referenceIsBottom: true,
            verticalWeight: 1, //compared to other blocks we are trying to put in

            idealHorizontalLocation: 0, //compared to other blocks we are trying to put in
            horizontalWeight: 10, //compared to other blocks we are trying to put in
            columns: 1, //eventually a block could span multiple columns
            minWidth: 0,
            maxWidth: 100,
            idealWidth: 15,
            widthWeight: 1,
            widthMargin: 0.5, //margin from edge of partition to edge of block. 

            minHeight: 10,
            maxHeight: 20,
            idealHeight: 15,
            heighWeight: 1,

            slideHeight: 2,
            slideRecess: 0.375, //how much the slide opening is recessed
            slideThickness: 0.75,
            sliderThickness: 0.75,

            depthOffset: 0, //relative to front of column. Positive would be proud (stick out)

            allowSlide: true, //slides when clicked on
            maxPullOutOffset: 5, //how far it can be pulled out relative to depth
            pullOutSpeed: 0.1, //how fast it pulls out

            rightSlotsOccupyAbove: 1, //how many slots above the reference slot it occupies. Including where it is attached
            rightSlotsOccupyBelow: 0,
            leftSlotsOccupyAbove: 1,
            leftSlotsOccupyBelow: 0,
            centerSlotsOccupyAbove: 1,
            centerSlotsOccupyBelow: 0,

            snapWeight: 10,
            priority: 2, //to decide the order in which the blocks are placed
        }
    }

    setParameters() {
        this.parameters = Block.parameters();
    }

    setDimensions() {
        /* Creates important dimensions based on parameters generally should not be overwritten */
        let param = this.parameters;
        this.blockSlidesMaterial = new THREE.MeshLambertMaterial({ color: param.slideColor });
        this.blockObjectMaterial = new THREE.MeshLambertMaterial({ color: param.objectColor });

        this.height = param.idealHeight;
        this.width = this.parent.width - this.parent.partitionThickness - 2 * param.widthMargin;
        this.depth = this.parent.depth; //has to fit within parent column.
        this.zPosition = this.zIndex * this.parent.verticalStep;
        this.pullOutPosition = 0; //will be used for animation
        this.maxPullOut = this.depth - param.maxPullOutOffset;
        this.animationStatus = 0; //0 is stored, 1 is in transition, 2 is pulled out, 3 is transition in
    }

    update() {
        /* called whenever we need to update the rendering of the block */

        /* delete any previous elements */
        if (this.blockObject) {
            ThreeUtilities.disposeHierarchy(this.blockObject);
        }

        this.setDimensions();

        /* prepare the objects that all  blocks should use. */
        this.object.position.set(0, 0, this.zPosition);
        this.blockObjectFixed = new THREE.Group();
        this.blockObjectMoving = new THREE.Group();
        this.object.add(this.blockObjectFixed);
        this.object.add(this.blockObjectMoving);

        this.makeSlides();
        this.makeMovingObject();
    }

    makeSlides() {

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

        let slideMeshRight = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(this.parent.width/2 - this.parent.partitionThickness / 2,0,0), this.sceneManager.zAxis, this.sceneManager.xAxis.clone().negate(), this.sceneManager.yAxis.clone().negate(),true);


        //let slideGeometry = new THREE.BoxGeometry(this.parameters.slideThickness, this.depth, this.parameters.slideHeight);
        // let slideMeshRight = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshRight.position.set(this.parent.width/2 - this.parent.partitionThickness / 2 - slideThickness/2, -this.depth/2, 0);
        // slideMeshRight.add(ThreeUtilities.returnObjectOutline(slideMeshRight))
        this.blockObjectFixed.add(slideMeshRight);

        let slideMeshLeft = ThreeUtilities.returnGroupAtDetailedCoord(slideGeometry, this.blockSlidesMaterial, new THREE.Vector3(-this.parent.width/2 + this.parent.partitionThickness / 2,0,0), this.sceneManager.zAxis.clone().negate(), this.sceneManager.xAxis.clone(), this.sceneManager.yAxis.clone().negate(),true);

        // let slideMeshLeft = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        // slideMeshLeft.position.set(-this.parent.width/2 + this.parent.partitionThickness / 2 + slideThickness/2, -this.depth/2, 0);
        // slideMeshLeft.add(ThreeUtilities.returnObjectOutline(slideMeshLeft))
        this.blockObjectFixed.add(slideMeshLeft);
    }

    makeMovingObject() {
        /* create the block. Vertically centered on the attachment index. Shift as needed. */
        let blockGeometry = new THREE.BoxGeometry(this.width, this.depth, this.height);
        blockGeometry.translate(0, -this.depth/2, 0);
        this.blockMesh = new THREE.Mesh(blockGeometry, this.blockObjectMaterial);
        this.blockMesh.add(ThreeUtilities.returnObjectOutline(this.blockMesh))
        this.blockObjectMoving.add(this.blockMesh);

        this.makeClickable(this.blockMesh);
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
        this.blockObjectMoving.position.set(0, -this.pullOutPosition, 0);
    }

    animateOut() {
        this.animationStatus = 1;
        this.sceneManager.pushTimerCallback(this.boundUpdateAnimation, this.sceneID);
    }

    animateIn() {
        this.animationStatus = 3;
        this.sceneManager.pushTimerCallback(this.boundUpdateAnimation, this.sceneID);
    }

    justClicked() {
        /* called when the block is clicked on */
        if (this.parameters.allowSlide && this.animationStatus == 0) {
            this.animateOut();
        } else if (this.parameters.allowSlide && this.animationStatus == 2) {
            this.animateIn();
        }

        return true; //interrupts the click propagation
    }



    hoveredIn() {
        this.blockMesh.material.color.set(this.sceneManager.defaults.selection.colorHovered);
    }

    hoveredOut() {
        this.blockMesh.material.color.set(this.selected ? this.sceneManager.defaults.selection.colorSelected : this.parameters.objectColor);
    }

    static blockList() {
        /* should update will the list of Blocks available for use */
        return [FixedShelf, PullShelf, PullDesk];
    } 

    placeInShelf() {

    }

}

export class FixedShelf extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    static parameters() {
        let param = super.parameters();
        param.name = "Fixed shelf";
        param.slideColor = "#ccddff";
        param.objectColor = "#ccddff";

        param.widthMargin = 0.1;

        param.minHeight = 0.75;
        param.maxHeight = 0.75;
        param.idealHeight = 0.75;
        param.allowSlide = false;
        return param;
    }

    setParameters() {
        this.parameters = FixedShelf.parameters();
    }

    makeSlides() {
        /* no slides */
    }
}

export class PullShelf extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    static parameters() {
        let param = super.parameters();
        param.name = "Pull-out Shelf";
        param.slideColor = "#ccddff";
        param.objectColor = "#ccddff";

        param.minHeight = 0.75;
        param.maxHeight = 0.75;
        param.idealHeight = 0.75;
        param.allowSlide = true;

        return param;
    }

    setParameters() {
        this.parameters = PullShelf.parameters();
    }
}

export class PullDesk extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    setParameters() {
        this.parameters = PullDesk.parameters();
    }

    static parameters() {
        let param = super.parameters();
        param.name = "Pull-out desk";

        param.slideColor = "#ccddff";
        param.objectColor = "#ccddff";

        param.slideHeight = 5;
        param.sliderThickness = 4;
        param.deskTopThickness = 0.75;
        param.deskSideHeight = 4;
        param.deskSideThickness = 0.75;
        param.deskStickOut = 2;

        param.chamferFront = 2;
        param.chamferBottom = 2;

        param.minWidth = 20;
        param.maxWidth = 100;

        param.allowSlide = true;
        param.maxPullOutOffset = 10;

        return param;
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
