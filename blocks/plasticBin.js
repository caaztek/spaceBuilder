import * as THREE from 'three';
import Block from './block.js';

export default class PlasticBin extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    static parameters() {
        let param = super.parameters();
        param.name = "Plastic bin";

        param.slideColor = "#ccddff";
        param.objectColor = "#ccddff";
        param.useOutlines = true;

        param.slideHeight = 1;
        param.sliderThickness = 0;

        param.minWidth = 20;
        param.widthMargin = 1;

        param.horizontalWeight = 0; //don't care where it fits horizontally

        param.referenceIsBottom= false;
        param.minDistanceFromReference = 2;
        param.maxDistanceFromReference = 1000;
        param.idealDistanceFromReference = 2; //want to place the bins as close to the top as possible

        param.binHeight = 8;
        let slotsBelow = 2;
        param.rightSlotsOccupyAbove = 1 ;//how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow= slotsBelow;
        param.leftSlotsOccupyAbove= 1;
        param.leftSlotsOccupyBelow= slotsBelow;
        param.centerSlotsOccupyAbove= 1;
        param.centerSlotsOccupyBelow= slotsBelow;

        param.priority = 3, 
        param.fillPerColumn = false

        return param;
    }

    makeMovingObject() {
        this.sceneManager.objectCache.loadObject("plasticBin", (objectName) => {
            this.binObject = objectName;
     
            this.binObject.position.set(0,-this.depth/2,this.parameters.slideHeight/2);
            let scale = 39 / 10;
            this.binObject.scale.set(scale * (this.width),scale * this.depth,scale * this.parameters.binHeight);
            this.blockObjectMoving.add(this.binObject);
    
            let binGeom = new THREE.BoxGeometry(this.width, this.depth, this.parameters.binHeight);
            let binMesh = new THREE.Mesh(binGeom, this.blockObjectMaterial);
            binMesh.position.set(0,-this.depth/2,this.parameters.slideHeight / 2 - this.parameters.binHeight/2);
            this.blockObjectMoving.add(binMesh);
            binMesh.visible = false;
    
            this.makeClickable(binMesh);

        },true,true,this.parameters.objectColor);
    }
    

    hoveredIn() {
        this.binObject.traverse((child) => {
            if (child.isMesh) {
                child.material.color.set(this.sceneManager.defaults.selection.colorHovered);
            }
        });
    }

    hoveredOut() {
        this.binObject.traverse((child) => {
            if (child.isMesh) {
                child.material.color.set(this.selected ? this.sceneManager.defaults.selection.colorSelected : this.parameters.objectColor);
            }
        });
    }
    
    deleteEntity() {
        super.deleteEntity();
        this.binObject = undefined;
    }

    setParameters() {
        this.parameters = PlasticBin.parameters();
    }
}
