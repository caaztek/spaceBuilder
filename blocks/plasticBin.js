import * as THREE from 'three';
import Block from './block.js';

export default class PlasticBin extends Block {
    constructor(sceneManager, parent, variationName) {
        super(sceneManager, parent, variationName);
    }

    static parameters() {
        let param = super.parameters();
        param.variations = [
            {
                variationName: "Plastic bin",
                variationParameters: {
                }
            }
        ];

        param.slideColor = "#ccddff";
        param.objectColor = "#ccddff";
        param.useOutlines = true;

        param.slideHeight = 1;
        param.sliderThickness = 0;

        param.minWidth = 20;
        param.maxWidth = 30;
        param.widthMargin = 1;

        param.horizontalWeight = 0; //don't care where it fits horizontally

        param.referenceIsBottom = false;
        param.minDistanceFromReference = 2;
        param.maxDistanceFromReference = 1000;
        param.idealDistanceFromReference = 2; //want to place the bins as close to the top as possible

        param.binHeight = 8;
        let slotsBelow = 2;
        param.rightSlotsOccupyAbove = 1;
        param.rightSlotsOccupyBelow = slotsBelow;
        param.leftSlotsOccupyAbove = 1;
        param.leftSlotsOccupyBelow = slotsBelow;
        param.centerSlotsOccupyAbove = 1;
        param.centerSlotsOccupyBelow = slotsBelow;

        param.startBlockListFillingCoefficient = 0.3;
        param.priority = 3
        param.fillPerColumn = false

        return param;
    }

    makeMovingObject() {
        this.sceneManager.objectCache.loadObject("plasticBin", (objectName) => {
            this.binObject = objectName;

            this.binObject.position.set(0, -this.depth / 2, this.parameters.slideHeight / 2);
            let scale = 39 / 10;
            this.binObject.scale.set(scale * (this.width), scale * this.depth, scale * this.parameters.binHeight);
            this.blockObjectMoving.add(this.binObject);

            let binGeom = new THREE.BoxGeometry(this.width, this.depth, this.parameters.binHeight);
            let binMesh = new THREE.Mesh(binGeom, this.blockObjectMaterial);
            binMesh.position.set(0, -this.depth / 2, this.parameters.slideHeight / 2 - this.parameters.binHeight / 2);
            this.blockObjectMoving.add(binMesh);
            binMesh.visible = false;

            this.makeClickable(binMesh);

        }, true, true, this.parameters.objectColor);
    }

    changeObjectColor(color = this.parameters.objectColor) {
        /* need to override to traverse every children */
        this.binObject.traverse((child) => {
            if (child.isMesh) {
                child.material.color.set(color);
            }
        });
    }

    deleteEntity(releaseOccupancy, updateShelfFilling) {
        super.deleteEntity(releaseOccupancy, updateShelfFilling);
        this.binObject = undefined;
    }

    setParameters() {
        this.parameters = PlasticBin.parameters();
    }

    estimateCost() {
        let cost = super.estimateCost();

        /* estimate fixed cost and margin for this particulare block */
        cost.margin = 0;
        cost.fixedCost = 0; //no assembly required 
    
        /* estimate plywood total surface */
        cost.plywoodUsage += 0
    
        /* plywood cuts */
        cost.plywoodCuts.push({ x: this.depth, y: this.parameters.slideHeight, quantity: 2, thickness: 0.75 });
    
        /* additional hardware */
        cost.hardwareList.push({ 
            name: "plasticBin", 
            quantity: 1, 
            parameters: { width: this.width, depth: this.depth }, 
            unitCost: 0.05 * this.width * this.depth 
        });
    
        return cost;

    }
}
