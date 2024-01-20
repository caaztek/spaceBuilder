import * as THREE from 'three';
import { SceneEntity, ThreeUtilities } from './sceneManager.js';
import Layer, { FloorLayer, FoundationLayer, WallLayer, GroundLayer } from './layer.js';
import Crane from './crane2.js';
import WoodMember from './woodMember.js';
import ConcreteMember from './concreteMember.js';
import { LinearModifier } from './modifier.js';


/* Overall classe that will contain all building information */
export default class Building extends SceneEntity {
    constructor(sceneManager, parent) {
        super(sceneManager, parent, "building", false);
        this.addGUI();

        /* will contain the list of all the layers */
        this.layers = [];
        /* initialize GUI */
        this.showBuilding = true;
        this.guiFolder.add(this, "showBuilding").onChange((value) => {
            this.object.visible = value;
        });
        this.showTree = true;
        this.guiFolder.add(this, "showTree").onChange((value) => {
            this.switchVisibilitytree(value);
        });
        this.craneGui = this.guiFolder.add(this, "addCrane");
        this.guiFolder.add(this, "addWallLayer");
        this.guiFolder.add(this, "addFloorLayer");
        this.guiFolder.add(this, "addFoundationLayer");
        this.guiFolder.add(this, "hideAllBases");
        this.guiFolder.add(this, "saveBuilding");
        this.guiFolder.add(this, "loadBuilding");

        this.sceneManager.building = this;

        /* make default ground layer */
        let newLayer =  new GroundLayer(this.sceneManager, this, 0);
        this.switchActiveLayer(newLayer);

        /* initialize all defaults */
        this.defaults = {
            wall: {
                outsideThickness: 5.5,
                insideThickness: 3.5,
                studsOnCenter: 16,
                numberOfTopPlates: 2,
                numberOfBottomPlates: 1,
                woodMemberThickness: 1.5,
                height: 96,
                maxPlateStockLength: 240,
                anchorBoltShift: 1.5, //from edge of stud
                anchorBoltAbove: 4, //above slab
                anchorBoltHeight: 10,
                anchorBoltRadius: 1,
                color: "#808080",
                anchorBoltSegments: 6,
                snapDistance: 10,
            },
            opening: {
                windowBottomHeight: 36,
                windowTopHeight: 72,
                windowWidth: 36,
                doorWidth: 36,
                doorBottomHeight: 0,
                doorTopHeight: 81,
                numberOfJackStuds: 1,
                numberOfKingStuds: 1,
                numberOfRoughSils: 1,
                crippleSpacing: 16,
                headerHeight: 12,
                minimumHeight: 1,
                minLength: 5,
            },
            floor: {
                height: 16,
                joistHeight: 16,
                joistWidth: 1.5,
                beamHeight: 16,
                beamWidth: 3.5,
                joistsOnCenter: 16,
                beamsOnCenter: 100,
                totalWidthJoists: 100,
                modifierOffset: 10,
                subfloorThickness: 0.75,
                subfloorLength: 96,
                subfloorWidth: 48,
            },
            roof: {
                height: 16,
                pitch: 1/2,
                overhang: 12,
                trussWidth: 1.5,
                trussMemberHeight:5.5,
                trussOnCenter: 24,
                sheathingThickness: 0.75,
                sheathingLength: 96,
                sheathingWidth: 48,

            },
            foundation: {
                footingDepth: 24,
                footingWidth: 18,
                footingRebarSize: 4,
                footingRebarRows: 2, //vertically
                footingRebarFromTop: 6,
                footingRebarOnCenter: 12,
                slabDepth: 4,
                slabRebarPastEdge: 10,
                slabRebarMaxInset: 6,
                slabRebarOnCenter: 16,
                slabRebarSize: 4,
                slabRebarFromTop: 2,
                slabRebarRows: 1,
                columnDepth: 36,
                columnWidth: 30,
                modifierOffset: 0,

            }
        }

        /* initialize building tree */
        this.makeBuildingTree();
    }

    hideAllBases() {
        this.layers.forEach(layer => {
            layer.switchVisibilityBase(false);
        })
    }

    makeBuildingTree() {
        this.treeGroup = new THREE.Group();
        this.object.add(this.treeGroup);

        this.treeGroup.position.copy(this.sceneManager.defaults.buildingTree.start);

        let defaults = this.sceneManager.defaults.buildingTree;

        /* tree trunk */
        let t = defaults.thickness / 2;
        let r = defaults.radius;
        let shape = new THREE.Shape(); //make a + shape
        shape.moveTo(t, t);
        shape.lineTo(r, t);
        shape.lineTo(r, -t);
        shape.lineTo(t, -t);
        shape.lineTo(t, -r);
        shape.lineTo(-t, -r);
        shape.lineTo(-t, -t);
        shape.lineTo(-r, -t);
        shape.lineTo(-r, t);
        shape.lineTo(-t, t);
        shape.lineTo(-t, r);
        shape.lineTo(t, r);
        shape.lineTo(t, t);

        const extrudeSettings = {
            steps: 1,
            depth: defaults.height,
            bevelEnabled: false,
        };

        const trunkGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        this.trunkMesh = new THREE.Mesh(trunkGeom, new THREE.MeshLambertMaterial({ color: defaults.color }));
        this.trunkMesh.add(ThreeUtilities.returnObjectOutline(this.trunkMesh));
        this.treeGroup.add(this.trunkMesh);


        /* make tree trunk from two vertical planes. Deprecated because we could see from top orthogonal view */
        /*
        let trunkPlaneGeom1 = new THREE.PlaneGeometry(defaults.height, defaults.radius);
        trunkPlaneGeom1.rotateY(Math.PI / 2);
        this.treeTrunk1 = new THREE.Mesh(trunkPlaneGeom1, defaults.treeMaterial);

        let trunkPlaneGeom2 = new THREE.PlaneGeometry(defaults.radius,defaults.height);
        trunkPlaneGeom2.rotateX(Math.PI / 2);
        this.treeTrunk2 = new THREE.Mesh(trunkPlaneGeom2, defaults.treeMaterial);

        this.treeGroup.add(this.treeTrunk1);
        this.treeGroup.add(this.treeTrunk2);
        */

    }

    //const jsonString = JSON.stringify(yourSceneData, replacer, 2);
    // Save jsonString to file...
    //const yourSceneData = JSON.parse(jsonString, reviver);

    saveBuilding() {
        let data = {
            metadata: {
                time: Date.now(),
                type: "Building",
            },
            defaults: this.defaults,
            activeLayerIndex: this.layers.indexOf(this.activeLayer),
            layers: this.layers.map(layer => layer.toJSON())
        }
        let json = JSON.stringify(data, ThreeUtilities.replacer, 2);
        ThreeUtilities.downloadJSON(json, "building");
    }

    findCenter() {
        let center = new THREE.Vector3();
        let count = 0;
        this.layers.forEach(layer => {
            layer.findCenter();
            center.add(layer.center);
            count++;
        });
        center.divideScalar(count);
        this.center = center;
        return this.center;
    }

    //Load new building from json file. Erase the current one.
    loadBuilding() {
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.opacity = '0'; //we never want end user to see the button
        fileInput.addEventListener('change', () => {
            var file = fileInput.files[0];

            if (file) {
                var reader = new FileReader();
                reader.readAsText(file);
                reader.onload = (e) => {
                    try {
                        //let buildingData = JSON.parse(e.target.result);
                        this.deleteEntity();
                        this.sceneManager.building = Building.fromJSON(this.sceneManager, e.target.result);
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }

                    //let buildingData = JSON.parse(e.target.result);

                    // console.log(buildingData);

                    // this.sceneManager.building = Building.fromJSON(buildingData);

                    //this.imageData = imageURL;

                    fileInput.parentNode.removeChild(fileInput);
                };

                //reader.readAsText(file);
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
    }

    static fromJSON(sceneManager, json) {
        const obj = JSON.parse(json, ThreeUtilities.reviver);
        // const drawing = new Drawing();
        const building = new Building(sceneManager, sceneManager);
        building.defaults = obj.defaults;
        building.layers = [];
        obj.layers.forEach(layerJson => {
            let newLayer = Layer.fromJSON(sceneManager, building, layerJson); //will add layer to array
        });
        building.switchActiveLayer(building.layers[obj.activeLayerIndex])
        sceneManager.updateClickableObjects(); //otherwise the modifiers on the layer are not clickable

        return building;
    }

    /* example from chatgpt */
    // toJSON() {
    //     return JSON.stringify(this, null, 2);
    // }
    // static fromJSON(json) {
    //     const obj = JSON.parse(json);
    //     const drawing = new Drawing();
    //     drawing.points = obj.points.madap(pointJson => Point.fromJSON(JSON.stringify(pointJson)));
    //     drawing.lines = obj.lines.map(lineJson => Line.fromJSON(JSON.stringify(lineJson)));
    //     drawing.points.forEach((point, index) => {
    //         point.lines = obj.points[index].lines;
    //     });
    //     return drawing;
    // }


    switchVisibilitytree(show = true) {
        this.showTree = show;
        this.treeGroup.visible = this.showTree;
    }

    addCrane() {
        this.crane = new Crane(this.sceneManager, this)
            .setPosition(new THREE.Vector3(200, -80, 0));
        this.crane.makeWoodStack(new THREE.Vector3(300, -200, 0), 120, 6, 10)
        .makePlywoodStack(new THREE.Vector3(300,-250,0))
        .addConstructionWorker(new THREE.Vector3(0, -50, 0),Math.PI/2)

        if (this.floorPigmentDrawing != undefined) {
            this.floorPigmentDrawing.setCrane(this.crane);
        }
    }

    deleteEntity() {
        /* delete all the layers */
        this.layers.forEach(layer => {
            layer.deleteEntity();
        });

        /* call super */
        super.deleteEntity();

    }

    /* TODO: cost estimate is called way to often. need to slow down. */
    makeCostEstimate() {

        let findLatestPrice = (priceObject) => {
            for (let key in priceObject) {
                if (priceObject[key] != undefined) {
                    return priceObject[key]; //return first price for now.
                }
            }
        }
        /* make sure to sort the stockType with most preferable option first */
        let stockTypes = {
            "2x4x8": {
                stockUnit: "in",
                type: "dimensionalLumber",
                cost: { "10202023": 3.5 },
                stockParameter: { //default values
                    treated: false,
                    thickness: 1.5,
                    width: 3.5,
                    length: 96,
                    amount: "length", //cost corresponds to amount.
                }
            },
            "2x6x8": {
                stockUnit: "in",
                type: "dimensionalLumber",
                cost: { "10202023": 3.45 },
                stockParameter: { //default values
                    treated: false,
                    thickness: 1.5,
                    width: 5.5,
                    length: 96,
                    amount: "length",
                }
            },
            "2x4x20": {
                stockUnit: "in",
                type: "dimensionalLumber",
                cost: { "10202023": 10.92 },
                stockParameter: { //default values
                    treated: false,
                    thickness: 1.5,
                    width: 3.5,
                    length: 240,
                    amount: "length",
                }
            },
            "2x6x20": {
                stockUnit: "in",
                type: "dimensionalLumber",
                cost: { "10202023": 3.5 },
                stockParameter: { //default values
                    treated: false,
                    thickness: 1.5,
                    width: 5.5,
                    length: 240,
                    amount: "length",
                }
            },
            "2x4x8Treated": {
                stockUnit: "in",
                type: "dimensionalLumber",
                cost: { "10202023": 6.08 },
                stockParameter: { //default values
                    treated: true,
                    thickness: 1.5,
                    width: 3.5,
                    length: 96,
                    amount: "length",
                }
            },
            "2x6x20Treated": {
                stockUnit: "in",
                type: "dimensionalLumber",
                cost: { "10202023": 23.68 },
                stockParameter: { //default values
                    treated: true,
                    thickness: 1.5,
                    width: 5.5,
                    length: 240,
                    amount: "length",
                }
            },
            "Rebar#4": {
                stockUnit: "in",
                type: "rebar",
                cost: { "10202023": 12 },
                stockParameter: { //default values
                    diameter: 0.5,
                    length: 240,
                    amount: "length",
                }
            },
            "concreteYard": {
                stockUnit: "in3",
                type: "concrete",
                cost: { "10202023": 130 },
                stockParameter: { //default values
                    volume: 46656,
                    amount: "volume",
                }
            }
        }

        /* set-up object that will list all the different types of materials on the jobsite */
        this.takeoff = {};

        /* Or go through all the scene entities */
        let numberOfWoodPieces = 0;
        this.sceneManager.sceneEntities.forEach((entity) => {
            if (!entity.temporary && (entity.type == "woodMember" || entity.type == "concreteMember" || entity.type == "rebar")) {
                if (entity.type == "woodMember") numberOfWoodPieces++;
                let stockResponse = entity.findStock(stockTypes)
                //if (entity.type == "woodMember") console.log(stockResponse);
                if (this.takeoff[stockResponse[0]] == undefined) this.takeoff[stockResponse[0]] = [];
                this.takeoff[stockResponse[0]].push(stockResponse[1]);
            }
        });

        /* now we can estimate the cost */

        let costLabelText = ["Total Cost: $"];
        this.totalCost = 0;

        for (let key in this.takeoff) {
            if (stockTypes[key] == undefined) continue; //if we don't have a price for this stock type, skip it.
            let totalAmount = 0;
            this.takeoff[key].forEach((amount) => {
                totalAmount += amount;
            });
            let keyQuantity = Math.ceil(totalAmount / stockTypes[key].stockParameter[stockTypes[key].stockParameter.amount]);
            costLabelText.push(key + ": " + keyQuantity);
            this.totalCost += keyQuantity * findLatestPrice(stockTypes[key].cost);
        }

        //console.log("number of pieces in build: " + numberOfWoodPieces);


        costLabelText[0] = "Total Cost: $" + this.totalCost.toFixed(0);
        this.sceneManager.updateCostLabel(costLabelText);
        //return this.totalCost;
    }

    addWallLayer() {
        let newLayer = new WallLayer(this.sceneManager, this, this.nextLayerHeight());
        this.switchActiveLayer(newLayer);
        return this;
    }

    addFloorLayer() {
        let newLayer = new FloorLayer(this.sceneManager, this, this.nextLayerHeight());
        this.switchActiveLayer(newLayer);
        return this;
    }

    addFoundationLayer() {
        let baseHeight = 5; //could eventually be more subtle
        let newLayer = new FoundationLayer(this.sceneManager, this, baseHeight); //the foundation should extend below the plane of the active layer
        this.switchActiveLayer(newLayer);
        return this;
    }

    nextLayerHeight() {
        if (this.activeLayer != undefined) {
            return this.activeLayer.nextLayerHeight();
        } else {
            return 0;
        }
    }

    addLayer() {
        layers.push(new Layer(this.sceneManager, this, this.activeLayer != undefined ? this.activeLayer.nextLayerHeight : 0));

        return this;
    }

    removeLayer(layer) {
        this.layers = this.layers.filter((item) => {
            return item.sceneID != layer.sceneID;
        });
        if (this.layers.length > 0) {
            this.switchActiveLayer(this.layers[0]);
        } else {
            this.activeLayer = undefined;
        }
        return this;
    }

    switchActiveLayer(newLayer) {
        if (!newLayer instanceof Layer) return;
        this.activeLayer = newLayer;
        this.activeHeight = newLayer.baseHeight;
        this.layers.forEach((layer) => {
            if (layer.sceneID == newLayer.sceneID) {
                layer.switchActiveLayer(true);
            } else {
                layer.switchActiveLayer(false);
            }
        });
        return this;
    }
}

