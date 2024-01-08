import { SceneEntity } from './sceneManager.js';
import ThreeUtilities from './threeUtilities';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import optimerFont from './fonts/optimer_regular.typeface.json?url';
import { LinearModifier, PlanarModifier } from './modifier.js';
import * as THREE from 'three';

/* class containing all the information for a given shelf unit, made of many columns */
export default class Dimension extends SceneEntity {
    constructor(sceneManager, parent, startPoint, endPoint, pullDirection = new THREE.Vector3(0, 1, 0), pullOffset = 10, rotateTextX = 0, rotateTextY = 0, precision = 3) {
        super(sceneManager, parent, "dimension");

        this.parameters = {
            pullWidth: 0.1,
            pullPast: 1,
            lineWidth: 0.5,
            lineOffset: 2, //past the arrow head
            arrowLineWidth: 1,
            arrowHeadWidth: 3,
            arrowHeadLength: 5,
            arrowHeadOffset: 1,
            textSize: 5,
            textHeight: 0.2,
            textCurveSegments: 2,
            color: "#000000",
        }

        this.rotateTextX = rotateTextX;
        this.rotateTextY = rotateTextY;

        this.material = new THREE.MeshBasicMaterial({ color: this.parameters.color });

        this.startPoint = startPoint; //point to dimension from
        this.endPoint = endPoint; //point to dimension to

        this.pullDirection = pullDirection.clone().normalize(); //direction to pull lines orthogonal to dimension. Cannot be parallel to dimension vector.
        this.pullOffset = pullOffset; //how far to offset pull lines from dimension. Measured from start point.

        this.precision = precision; //display dimension to 2^precision inch fractions.

    }

    updateParameters(parameters) {
        this.parameters = Object.assign(this.parameters, parameters);
        return this;
    }

    updateEndPoint(endPoint, update = true) {
        this.endPoint = endPoint;
        if (update) this.update();
        return this;
    }

    update() {
        /* called to create dimension object to visualize */

        /* delete previous object if it exists */
        if (this.dimensionObject != undefined) {
            ThreeUtilities.disposeHierarchy(this.dimensionObject);
        }

        /* create new object */
        this.dimensionObject = new THREE.Group();
        this.object.add(this.dimensionObject);


        /* load the font if it hasn't been done yet and draw the text. */
        const loader = new FontLoader();
        if (Dimension.font == undefined) {
            loader.load(optimerFont, font => {
                Dimension.font = font;
                this.addTextAndArrow();
            });
        } else {
            this.addTextAndArrow();
        }

    }

    addCanvasText() {
        /* just a test that I may want to use later */
        // Step 1 & 2: Create and draw on the canvas
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = 2000;
        canvas.height = 2000;

        // Draw arrow and text
        context.fillStyle = 'black'; // text color
        context.font = '100px Arial';
        context.fillText("Dimension Text", 10, 200);
        // [Add code here to draw the arrow]

        // Step 3: Create a texture from the canvas
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        // Step 4: Create a plane geometry
        var geometry = new THREE.PlaneGeometry(200, 200);

        // Step 5: Apply the texture to the plane
        var material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        var plane = new THREE.Mesh(geometry, material);
        plane.position.set(120, -150, 1);

        // Step 6: Position the plane
        // [Set the position of the plane based on your dimension points]
        this.dimensionObject.add(plane);
    }

    addTextAndArrow() {
        /* create text geometry */
        let p = this.parameters;
        let length = this.endPoint.clone().sub(this.startPoint).length();
        let dimensionText = ThreeUtilities.toConstructionFormat(length,this.precision);
        const geometry = new TextGeometry(dimensionText, {
            font: Dimension.font,
            size: p.textSize,
            height: p.textHeight,
            curveSegments: p.textCurveSegments,
            bevelEnabled: false,
        });

        /* need to get an estimate of text size to center it */
        geometry.computeBoundingBox();
        let textShifX = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
        let textShifY = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
        let textShifZ = geometry.boundingBox.max.z - geometry.boundingBox.min.z;

        geometry.translate(-textShifX / 2, -textShifY / 2, -textShifZ / 2);
        geometry.rotateX(this.rotateTextX);
        geometry.rotateY(this.rotateTextY);

        /* Compute all the important vectors */
        let dimensionDirection = this.endPoint.clone().sub(this.startPoint).normalize();
        let zVector = this.pullDirection.clone().cross(dimensionDirection).normalize();
        let xVector = zVector.clone().cross(this.pullDirection).normalize();
        let yVector = this.pullDirection.clone().negate();
        let projectedXDistance = this.endPoint.clone().sub(this.startPoint).dot(xVector);
        let textOrigin;
        let textMesh;

        textOrigin = this.startPoint.clone().addScaledVector(this.pullDirection, this.pullOffset).addScaledVector(xVector, projectedXDistance / 2);
        textMesh = ThreeUtilities.returnGroupAtDetailedCoord(geometry, this.material, textOrigin, xVector, yVector, zVector, false);


        /* position the text mesh centered */
        this.dimensionObject.add(textMesh);

        /* draw arrows */
        let shape = new THREE.Shape();
        shape.moveTo(p.arrowHeadOffset, 0);
        shape.lineTo(p.arrowHeadOffset + p.arrowHeadLength, p.arrowHeadWidth / 2);
        shape.lineTo(p.arrowHeadOffset + p.arrowHeadLength, p.arrowLineWidth / 2);
        shape.lineTo(projectedXDistance / 2 - textShifX / 2 - p.arrowHeadOffset, p.arrowLineWidth / 2);
        shape.lineTo(projectedXDistance / 2 - textShifX / 2 - p.arrowHeadOffset, -p.arrowLineWidth / 2);
        shape.lineTo(p.arrowHeadOffset + p.arrowHeadLength, -p.arrowLineWidth / 2);
        shape.lineTo(p.arrowHeadOffset + p.arrowHeadLength, -p.arrowHeadWidth / 2);
        shape.lineTo(p.arrowHeadOffset, 0);

        let extrudeSettings = {
            steps: 1,
            depth: p.textHeight,
            bevelEnabled: false,
        };

        let arrowGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        let arrowMesh = ThreeUtilities.returnGroupAtDetailedCoord(arrowGeom, this.material, this.startPoint.clone().addScaledVector(this.pullDirection, this.pullOffset), xVector, yVector, zVector, false);
        this.dimensionObject.add(arrowMesh);

        let arrowMesh2 = ThreeUtilities.returnGroupAtDetailedCoord(arrowGeom, this.material, this.startPoint.clone().addScaledVector(this.pullDirection, this.pullOffset).addScaledVector(xVector, projectedXDistance), xVector.clone().negate(), yVector.clone().negate(), zVector, false);
        this.dimensionObject.add(arrowMesh2);

        /* draw lines */
        let lineGeom = new THREE.BoxGeometry(p.lineWidth, this.pullOffset + p.lineOffset, p.textHeight);
        lineGeom.translate(0, -(this.pullOffset) / 2, p.textHeight / 2);
        let lineMesh = ThreeUtilities.returnGroupAtDetailedCoord(lineGeom, this.material, this.startPoint.clone(), xVector, yVector, zVector, false);
        this.dimensionObject.add(lineMesh);

        let pullOffsetRight = this.endPoint.distanceTo(this.startPoint.clone().addScaledVector(this.pullDirection, this.pullOffset).addScaledVector(xVector, projectedXDistance));
        let lineGeom2 = new THREE.BoxGeometry(p.lineWidth, pullOffsetRight + p.lineOffset, p.textHeight);
        lineGeom2.translate(0, -(pullOffsetRight) / 2, p.textHeight / 2);
        let lineMesh2 = ThreeUtilities.returnGroupAtDetailedCoord(lineGeom2, this.material, this.endPoint.clone(), xVector, yVector, zVector, false);
        this.dimensionObject.add(lineMesh2);
    }

}