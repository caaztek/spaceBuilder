import Garage from './garage.js';
import SceneManager from './sceneManager.js';
import * as THREE from 'three';
import garageExampleImage from './images/example2.jpeg';
document.getElementById('garageExample').src = garageExampleImage;


let sceneManager = new SceneManager().setUpModal();
let garage123 = new Garage(sceneManager, sceneManager);




