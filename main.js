import Room from './room.js';
import SceneManager from './sceneManager.js';
import * as THREE from 'three';
import garageExampleImage from './images/example2.jpeg';
document.getElementById('spaceExample').src = garageExampleImage;


let sceneManager = new SceneManager().setUpModal();
let firstRoom = new Room(sceneManager, sceneManager);




