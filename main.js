import Garage from './garage.js';
import SceneManager, { ThreeUtilities } from './sceneManager.js';
import * as THREE from 'three';

let sceneManager = new SceneManager()

let garage = new Garage(sceneManager, sceneManager);
// sceneManager.building = new Building(sceneManager, sceneManager)
// // .addWallLayer()
// // .addFoundationLayer()


//sceneManager.building = new ADU(sceneManager, sceneManager,3).makeBuilding(5,false); //number of levels in ADU

//sceneManager.building.floorPigmentDrawing = new PigmentDrawing(sceneManager, sceneManager.building).makeFootingDrawing(sceneManager.building);


// let boxGeom = new THREE.BoxGeometry(10,10,10);
// let box = new THREE.Mesh(boxGeom,new THREE.MeshBasicMaterial({color:0xff0000}));
// box.position.set(0,0,5);
// box.visible = true;
// box.material.transparent = true;
// box.material.opacity = 0.5;
// sceneManager.scene.add(box);


//let building = new Building(sceneManager,sceneManager)
//.addWallLayer();
//.addFloorLayer();

// let building = new Building(sceneManager,sceneManager)
// .addFloorLayer();



// let testPolygon1 = [
//     [0,0],
//     [20,0],
//     [20,5],
//     [0,5],
// ];

// let testPolygon2 = [
//    [10,5],
//    [10,0],
//     [5,0],
//     [5,5],
// ];

// console.log(ThreeUtilities.clipPolygons(testPolygon1,testPolygon2));