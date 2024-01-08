import * as THREE from 'three';
import { SceneEntity } from './sceneManager';
import ThreeUtilities from './threeUtilities';
import Dimension from './dimension';

/**
 * class to manage all modifiers :
 * Entities that you can visually click and drag to modify the scene environment.
 * 
 * 
 */

/* typical modifier usage
const modifier = new PlanarModifier(this.sceneManager, this)
            .updatePosition(this.modifierPosition)
            .updateNormal(new THREE.Vector3(0,0,1))
            .setScale(2)
            .onClick((modifier)=> {
                this.startPosition = this.object.position.clone();
            })
            .onMove((modifier) => {
                //console.log(distance);
                this.object.position.copy(this.startPosition.clone().addScaledVector(modifier.xAxis, modifier.offsetDistance).addScaledVector(modifier.yAxis, modifier.offsetDistanceY));
            });
*/

export default class Modifier extends SceneEntity {
    constructor(sceneManager, parent, type) {
        super(sceneManager, parent, "modifier", true);

        this.setClickableCube();

        /* set group for modifier Body */
        this.modifierBody = new THREE.Group();
        this.object.add(this.modifierBody);

        /* set type */
        this.modifierType = type;

        /* set  */
        this.startPosition2D = new THREE.Vector2();
        this.startOffset2D = new THREE.Vector2();
        this.startOffset2DY = new THREE.Vector2();

        this.pointerStartPosition = new THREE.Vector2();

        /* set standard moving function. Attach an array of objects with offsets. Modifier takes care of moving the object on its own.  */
        this.objectArray = [];
        this.updateSelfPosition = false; //sometimes modifiers need to be updated by the object through the justMoved callback.

        /* set axis */
        this.xAxis = new THREE.Vector3();
        this.yAxis = new THREE.Vector3();
        this.zAxis = new THREE.Vector3();

        /* set dimension */
        this.showDimensionWhenMoved = false;

        /* set-up bounded functions */
        this.boundJustMoved = this.justMoved.bind(this);
        this.boundJustReleased = this.justReleased.bind(this);

        /* set-up modifier mode. Requires m key to be pressed to activate modifier */
        this.needMode = false;

        this.maxPrecision = 4; //offset will snap to 2^max precision inch fraction. 
    }

    setClickableCube() {
        /* creates an invisible clickable cube a bit larger than the modifier to make it easier to click/tap */
        this.clickRadius = this.sceneManager.defaults.modifier.clickRadius;
        let cubeGeom = new THREE.BoxGeometry(this.clickRadius, this.clickRadius, this.clickRadius);
        let cubeMat = new THREE.MeshBasicMaterial({ color: "#000000" });
        this.cubeObject = new THREE.Mesh(cubeGeom, cubeMat);
        this.cubeObject.visible = false;
        this.object.add(this.cubeObject);

        this.makeClickable(this.cubeObject);
        return this;
    }

    switchModifierMode(needModifierMode = true) {
        this.needModifierMode = needModifierMode;
        return this;
    }

    addObjectArray(objectArray, selfUpdate = true) {
        this.objectArray = objectArray;
        this.updateSelfPosition = selfUpdate;
        return this;
    }

    setObjectsFromModifier() {
        this.objectArray.forEach((item) => {
            item.object.position.copy(this.object.position.clone().add(item.offset));
        });
    }

    addItemToObjectArray(object, offset = new THREE.Vector3(), setModifierFromObject = true, selfUpdate = true) {
        this.objectArray.push({ object: object, offset: offset });
        if (setModifierFromObject) this.updatePosition(object.position.clone().sub(offset));
        this.updateSelfPosition = selfUpdate;
        return this;
    }

    useDifferentObject(newObject) {
        this.makeClickable(newObject);

        /* remove the cube */
        ThreeUtilities.disposeHierarchy(this.cubeObject, ThreeUtilities.disposeNode);
        this.cubeObject = undefined;

        /* remove the arrows. */
        ThreeUtilities.disposeHierarchy(this.modifierBody, ThreeUtilities.disposeNode);
        this.modifierBody = undefined;

        return this;
    }

    setScale(scale) {
        this.scale = scale;
        this.object.scale.set(scale, scale, scale);
        return this;
    }

    updatePrecision(precision) {
        this.maxPrecision = precision;
        return this;
    }


    updatePosition(position) {
        if (this.position == undefined) {
            this.initialPosition = position.clone();
        }
        this.position = position;
        this.object.position.copy(position);
        return this;
    }

    /* called by scene manager whenever a modifier was just clicked on. Need to initialize */
    justClicked() {
        if (this.needModifierMode && !this.sceneManager.keysDown["m"]) return;

        this.sceneManager.switchControls(false);

        this.active = true;
        this.startPosition3D = this.object.position.clone();

        this.startPositionProject = this.object.position.clone().project(this.sceneManager.camera);
        this.startPositionOffsetProject = this.object.position.clone().addScaledVector(this.xAxis, 1).project(this.sceneManager.camera);

        this.offsetLength = this.startPositionProject.distanceToSquared(this.startPositionOffsetProject);

        this.startPosition2D.set(this.startPositionProject.x, this.startPositionProject.y);
        this.startOffset2D.set(this.startPositionOffsetProject.x, this.startPositionOffsetProject.y);

        if (this.yAxis) {

            this.startPositionOffsetProjectY = this.object.position.clone().addScaledVector(this.yAxis, 1).project(this.sceneManager.camera);

            this.offsetLengthY = this.startPositionProject.distanceToSquared(this.startPositionOffsetProjectY);

            this.startOffset2DY.set(this.startPositionOffsetProjectY.x, this.startPositionOffsetProjectY.y);
        }

        this.pointerStartPosition = this.sceneManager.pointer.clone();

        if (this.showDimensionWhenMoved) {
            this.dimension.switchVisibility(true);
            this.dimension.update();
        }

        this.sceneManager.switchInteractions(false);

        this.callAllUpdates("clicked");

        window.addEventListener("pointermove", this.boundJustMoved);
        //.bind(this)
        window.addEventListener("pointerup", this.boundJustReleased);
        return true;
    }

    /* called by  the event listen whenever a modifier was just moved */
    justMoved(event) {
        if (!this.active) return;
        //console.log("just moved: " + this.sceneID)
        /* update pointer */
        this.sceneManager.updatePointer(event)
        /* first measure by how much the pointer should have moved. */
        this.offsetDistance = this.sceneManager.pointer.clone().sub(this.pointerStartPosition).dot(this.startOffset2D.clone().sub(this.startPosition2D)) / this.offsetLength;
        this.offsetDistance = ThreeUtilities.roundToPrecision(this.offsetDistance, this.maxPrecision);

        if (this.yAxis) {
            this.offsetDistanceY = this.sceneManager.pointer.clone().sub(this.pointerStartPosition).dot(this.startOffset2DY.clone().sub(this.startPosition2D)) / this.offsetLengthY;
            this.offsetDistanceY = ThreeUtilities.roundToPrecision(this.offsetDistanceY, this.maxPrecision);
        }

        if (this.objectArray.length > 0) {
            let newModifierPosition = this.startPosition3D.clone().addScaledVector(this.xAxis, this.offsetDistance)
            if (this.yAxis) newModifierPosition.addScaledVector(this.yAxis, this.offsetDistanceY);
            if (this.updateSelfPosition) {
                this.updatePosition(newModifierPosition);
            }
            this.setObjectsFromModifier();
        }

        this.callAllUpdates("moved");
    }

    deleteEntity() {
        //will never be called again
        super.deleteEntity();
    }

    justReleased(event) {
        if (!this.active) return;
        //console.log("just released: " + this.sceneID)
        this.sceneManager.activeModifier = undefined;
        this.sceneManager.switchInteractions(true); //will also reactivate controls.

        if (this.showDimensionWhenMoved) {
            this.dimension.switchVisibility(false);
        }

        this.callAllUpdates("released");

        window.removeEventListener("pointermove", this.boundJustMoved);
        window.removeEventListener("pointerup", this.boundJustReleased);
        this.active = false;
    }

    getOffsetDistance() {
        return this.offsetDistance;
    }

    updateDimension(startPoint, endPoint,pullDirection, pullOffset,rotateTextX,rotateTextY, precision = this.maxPrecision) {
        this.dimension = new Dimension(this.sceneManager, this.parent, startPoint,endPoint, pullDirection, pullOffset,rotateTextX,rotateTextY, precision);
        this.showDimensionWhenMoved = true;
        return this;
    }
}


export class LinearModifier extends Modifier {
    constructor(sceneManager, parent, displayType = "line") {
        super(sceneManager, parent, "linear");

        this.displayType = displayType; //can be arrow, line, or twoLines

        this.makeBody();

    }

    makeBody() {
        /* make object programatically */
        let direction = new THREE.Vector3(1, 0, 0);
        let defaults = this.sceneManager.defaults.modifier;
        let r = this.clickRadius;

        let modifierMaterial = new THREE.MeshBasicMaterial({ color: defaults.color });


        if (this.displayType == "arrow") {

            /* make the cylinder */
            let cylinderGeom = ThreeUtilities.returnCylinder(direction.clone().multiplyScalar(defaults.cylinderLength * r / 2), direction.clone().multiplyScalar(- defaults.cylinderLength * r / 2), defaults.cylinderRadius * r, modifierMaterial, defaults.segments);
            this.modifierBody.add(cylinderGeom);

            /* add arrows at the end */
            let arrowGeom = new THREE.ConeGeometry(defaults.arrowRadius * r, defaults.arrowLength * r, defaults.segments);
            arrowGeom.rotateX(Math.PI / 2);

            let arrow1 = ThreeUtilities.returnObjAtDetailedCoord(arrowGeom, modifierMaterial, direction.clone().multiplyScalar(defaults.cylinderLength * r / 2), undefined, undefined, direction.clone());

            let arrow2 = ThreeUtilities.returnObjAtDetailedCoord(arrowGeom, modifierMaterial, direction.clone().multiplyScalar(- defaults.cylinderLength * r / 2), undefined, undefined, direction.clone().multiplyScalar(-1));

            this.modifierBody.add(arrow1);
            this.modifierBody.add(arrow2);
        } else if (this.displayType == "line") {
            let cylinderGeom = new THREE.CylinderGeometry(defaults.cylinderRadius * r, defaults.cylinderRadius * r, defaults.cylinderLength * r, defaults.segments);
            //cylinderGeom.rotateX(Math.PI / 2);
            this.modifierBody.add(new THREE.Mesh(cylinderGeom, modifierMaterial));
        } else if (this.displayType == "twoLines") {
            let sideShift = defaults.cylinderLength * r / 4;
            let cylinderGeom = new THREE.CylinderGeometry(defaults.cylinderRadius * r, defaults.cylinderRadius * r, defaults.cylinderLength * r, defaults.segments);
            //cylinderGeom.rotateX(Math.PI / 2);
            cylinderGeom.translate(sideShift, 0, 0);
            this.modifierBody.add(new THREE.Mesh(cylinderGeom, modifierMaterial));

            let cylinderGeom2 = new THREE.CylinderGeometry(defaults.cylinderRadius * r, defaults.cylinderRadius * r, defaults.cylinderLength * r, defaults.segments);
            //cylinderGeom.rotateX(Math.PI / 2);
            cylinderGeom2.translate(-sideShift, 0, 0);
            this.modifierBody.add(new THREE.Mesh(cylinderGeom2, modifierMaterial));
        }
    }
    updateDirection(direction, zAxis = new THREE.Vector3(0, 0, 1)) {
        this.xAxis = direction.normalize();
        this.zAxis = zAxis.normalize();
        this.yAxis = this.zAxis.clone().cross(this.xAxis).normalize();
        this.zAxis = this.xAxis.clone().cross(this.yAxis).normalize();
        ThreeUtilities.updateObjectOrientationFromDetailedAxis(this.modifierBody, this.xAxis, this.yAxis, this.zAxis);
        return this;
    }

    setMax(max) {
        this.max = max; //max from absolute initial position?
    }
    setMin(min) {
        this.min = min;
    }

}


/* TODO: planar modifier are not very well coordinated at a high angle. Probably because the math doesn't account for perspective */
export class PlanarModifier extends Modifier {
    constructor(sceneManager, parent,displayType = "circle") {
        super(sceneManager, parent, "plane");
        this.displayType = displayType;
        this.makeBody();

    }

    makeBody() {
        /* make object programatically */

        let defaults = this.sceneManager.defaults.modifier;
        if (this.displayType == "arrow") {

            let direction = new THREE.Vector3(1, 0, 0);
            let r = this.clickRadius;

            let modifierMaterial = new THREE.MeshBasicMaterial({ color: defaults.color });

            /* make the cylinder */
            let cylinderGeom = ThreeUtilities.returnCylinder(direction.clone().multiplyScalar(defaults.cylinderLength * r / 2), direction.clone().multiplyScalar(- defaults.cylinderLength * r / 2), defaults.cylinderRadius * r, modifierMaterial, defaults.segments);
            this.modifierBody.add(cylinderGeom);

            /* add arrows at the end */
            let arrowGeom = new THREE.ConeGeometry(defaults.arrowRadius * r, defaults.arrowLength * r, defaults.segments);
            arrowGeom.rotateX(Math.PI / 2);

            let arrow1 = ThreeUtilities.returnObjAtDetailedCoord(arrowGeom, modifierMaterial, direction.clone().multiplyScalar(defaults.cylinderLength * r / 2), undefined, undefined, direction.clone());

            let arrow2 = ThreeUtilities.returnObjAtDetailedCoord(arrowGeom, modifierMaterial, direction.clone().multiplyScalar(- defaults.cylinderLength * r / 2), undefined, undefined, direction.clone().multiplyScalar(-1));

            this.modifierBody.add(arrow1);
            this.modifierBody.add(arrow2);

            /* make the cylinder */
            direction = new THREE.Vector3(0, 1, 0);
            let cylinderGeom2 = ThreeUtilities.returnCylinder(direction.clone().multiplyScalar(defaults.cylinderLength * r / 2), direction.clone().multiplyScalar(- defaults.cylinderLength * r / 2), defaults.cylinderRadius * r, modifierMaterial, defaults.segments);
            this.modifierBody.add(cylinderGeom2);

            let arrow3 = ThreeUtilities.returnObjAtDetailedCoord(arrowGeom, modifierMaterial, direction.clone().multiplyScalar(defaults.cylinderLength * r / 2), undefined, undefined, direction.clone());

            let arrow4 = ThreeUtilities.returnObjAtDetailedCoord(arrowGeom, modifierMaterial, direction.clone().multiplyScalar(- defaults.cylinderLength * r / 2), undefined, undefined, direction.clone().multiplyScalar(-1));

            this.modifierBody.add(arrow3);
            this.modifierBody.add(arrow4);
        } else if (this.displayType == "circle") {
            let ringGeometry = new THREE.TorusGeometry(defaults.torusRadius, defaults.torusHeight/2, defaults.segments, defaults.torusSegments);
            this.modifierBody.add(new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: defaults.color })));

        }
    }

    updateNormal(normal) {
        this.zAxis = normal.clone().normalize();
        this.xAxis = ThreeUtilities.returnOrthVector(this.zAxis);
        this.yAxis = this.zAxis.clone().cross(this.xAxis);
        ThreeUtilities.updateObjectOrientationFromDetailedAxis(this.modifierBody, this.xAxis, this.yAxis, this.zAxis);
        return this;
    }
}

/* TODO: planar modifier are not very well coordinated at a high angle. Probably because the math doesn't account for perspective */
export class buttonModifier extends Modifier {
    constructor(sceneManager, parent, buttonType) {
        super(sceneManager, parent, "button");
        this.buttonType = buttonType;
        this.makeBody();
    }

    justClicked() {
        if (this.needModifierMode && !this.sceneManager.keysDown["m"]) return;
        this.callAllUpdates("clicked");
        // if (this._onClick !== undefined) {
        //     this._onClick.call(this,this);//pass the entire modifier to the function.
        // }
    }

    /* need to make different bodies based on different button types */
    makeBody() {
        let r = 10;
        let depth = 2;
        const shape = new THREE.Shape();
        shape.moveTo(r, r);
        shape.lineTo(r, - r);
        shape.lineTo(- r, - r);
        shape.lineTo(- r, r);
        shape.lineTo(r, r);

        const extrudeSettings = {
            steps: 2,
            depth: depth,
            bevelEnabled: false,
        };
        let mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extrudeSettings), new THREE.MeshBasicMaterial({ color: this.sceneManager.defaults.modifier.color }));
        this.modifierBody.add(mesh);
    }
}