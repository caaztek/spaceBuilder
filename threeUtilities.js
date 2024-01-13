import * as THREE from 'three';

/* Contains a number of useful three.js function that can be used accross many projects */
export default class ThreeUtilities {

    static returnGroupAtCoord(geom, material, coord, outline = true) {
        let body = this.returnObjAtCoord(geom, material, coord);
        //group.add(body);
        if (outline) {
            body.add(this.returnObjectOutline(body));
        }
        return body;
    }

    static returnGroupAtDetailedCoord(geom, material, origin, xAxis = new THREE.Vector3(1,0,0), yAxis = new THREE.Vector3(0,1,0), zAxis = new THREE.Vector3(0,0,1), outline = true) {
        //console.log(yAxis);
        let coord = {
            "origin": origin.clone(),
            "xAxis": xAxis.clone(),
            "yAxis": yAxis.clone(),
            "zAxis": zAxis.clone()
        }
        return this.returnGroupAtCoord(geom, material, coord, outline);
    }

    /* returns a arbitrary vector that is orthogonal to the input */
    static returnOrthVector(vector) {
        let parallelThreshold = 0.01;
        let candidate = new THREE.Vector3(0, 0, 1).cross(vector);
        if (candidate.lengthSq() < parallelThreshold) {
            //our candidate is almost parallel to 
            candidate = new THREE.Vector3(1, 0, 0).cross(vector);
        }
        return candidate.normalize();
    }

    /* fills in the missing axis in the coord object */
    static fillCoord(coord) {
        if (coord.xAxis == undefined && coord.yAxis == undefined) {
            // that means z must be defined
            if (coord.zAxis == undefined) { console.log("bug in setting arbitrary axis - missing too many axis"); }
            coord.xAxis = this.returnOrthVector(coord.zAxis);
            coord.yAxis = coord.zAxis.clone().cross(coord.xAxis);
        } else if (coord.xAxis == undefined) {
            //that means y must be defined.
            if (coord.yAxis == undefined) { console.log("bug in setting arbitrary axis - missing too many axis"); }
            coord.xAxis = this.returnOrthVector(coord.yAxis);
            coord.zAxis = coord.xAxis.clone().cross(coord.yAxis)
        } else if (coord.yAxis == undefined) {
            //that means x must be defined
            if (coord.xAxis == undefined) { console.log("bug in setting arbitrary axis - missing too many axis"); }
            coord.yAxis = this.returnOrthVector(coord.xAxis);
            coord.zAxis = coord.xAxis.clone().cross(coord.yAxis)
        }
        return coord;
    }

    static updateObjectOrientationFromDetailedAxis(object, xAxis, yAxis, zAxis) {
        let coord = {
            "xAxis": xAxis,
            "yAxis": yAxis,
            "zAxis": zAxis
        }
        coord = this.fillCoord(coord);
        let newMatrix = new THREE.Matrix4();
        newMatrix.makeBasis(coord.xAxis, coord.yAxis, coord.zAxis);
        object.applyMatrix4(newMatrix);
    }

    static updateObjectMatrix(object, coord) {
        coord = this.fillCoord(coord);
        let newMatrix = new THREE.Matrix4();
        newMatrix.makeBasis(coord.xAxis, coord.yAxis, coord.zAxis);
        newMatrix.setPosition(coord.origin.clone());
        object.applyMatrix4(newMatrix);
    }

    static returnObjAtCoord(geom, material, coord) {

        coord = this.fillCoord(coord);

        let newMatrix = new THREE.Matrix4();
        newMatrix.makeBasis(coord.xAxis, coord.yAxis, coord.zAxis);
        newMatrix.setPosition(coord.origin.clone());
        let object = new THREE.Mesh(geom, material);
        object.name = "body";
        object.applyMatrix4(newMatrix);
        return object;
    }

    static returnObjAtDetailedCoord(geom, material, origin, xAxis, yAxis, zAxis) {
        let coord = {
            "origin": origin,
            "xAxis": xAxis,
            "yAxis": yAxis,
            "zAxis": zAxis
        }

        return this.returnObjAtCoord(geom, material, coord);
    }

    static o = new THREE.Vector3(0, 0, 0);
    static x = new THREE.Vector3(1, 0, 0);
    static y = new THREE.Vector3(0, 1, 0);
    static z = new THREE.Vector3(0, 0, 1);

    static returnObjectOutline(mesh, outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 })) {
        let outlineGeom = new THREE.EdgesGeometry(mesh.geometry);
        let outline = new THREE.LineSegments(outlineGeom, outlineMaterial);
        //outline.matrix.copy(mesh.matrix);
        outline.matrixAutoUpdate = false; //used to be false
        outline.name = "outline";
        return outline;
    }

    static ensureCounterClockwise(polygon) {
        // Compute signed area
        let area = 0;
        for (let i = 0; i < polygon.length; i++) {
            let j = (i + 1) % polygon.length;
            area += (polygon[i][0] * polygon[j][1] - polygon[j][0] * polygon[i][1]);
        }
        area /= 2;

        // If the area is negative, the polygon is clockwise
        if (area < 0) {
            polygon.reverse();  // Reverse the order of vertices
        }

        return polygon;  // Return the (possibly reversed) polygon
    }

    /* implementation of Sutherland-Hodgman Algoprithm by https://www.rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping. input polygon must be arrays of arrays of two . Output will be empty if no intersection. */
    static clipPolygons(subjectPolygon, clipPolygon) {
        subjectPolygon = this.ensureCounterClockwise(subjectPolygon);
        clipPolygon = this.ensureCounterClockwise(clipPolygon);

        var cp1, cp2, s, e;
        var inside = function (p) {
            return (cp2[0] - cp1[0]) * (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * (p[0] - cp1[0]);
        };
        var intersection = function () {
            var dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]],
                dp = [s[0] - e[0], s[1] - e[1]],
                n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0],
                n2 = s[0] * e[1] - s[1] * e[0],
                n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
            return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3];
        };
        var outputList = subjectPolygon;
        cp1 = clipPolygon[clipPolygon.length - 1];
        for (var j in clipPolygon) {
            cp2 = clipPolygon[j];
            var inputList = outputList;
            outputList = [];
            s = inputList[inputList.length - 1]; //last on the input list
            for (var i in inputList) {
                e = inputList[i];
                if (inside(e)) {
                    if (!inside(s)) {
                        outputList.push(intersection());
                    }
                    outputList.push(e);
                }
                else if (inside(s)) {
                    outputList.push(intersection());
                }
                s = e;
            }
            cp1 = cp2;
        }

        return outputList
    }

    static roundNumber(number, digits) {
        return Math.round(number * Math.pow(10, digits)) / Math.pow(10, digits);
    }

    static roundToPrecision(number, precision) {
        let maxFraction = Math.pow(2, precision);
        return Math.round(number * maxFraction) / maxFraction;
    }

    /* will return a clean string down to 1/16" */
    static toConstructionFormat(num,maxPrecision  = 4) {
        let maxFraction = Math.pow(2,maxPrecision);
        const wholePart = Math.floor(num);
        const decimalPart = num - wholePart;
        const fractionNumerator = Math.round(decimalPart * maxFraction);

        if (fractionNumerator === 0) {
            return `${wholePart}"`;
        } else if (fractionNumerator === maxFraction) {
            return `${wholePart + 1}"`;
        } else {
            let simplifiedNumerator = fractionNumerator;
            let denominator = maxFraction;

            // Reduce the fraction to its simplest form
            for (var i = maxPrecision - 1; i > 0; i--) {
                if (fractionNumerator % Math.pow(2,i) === 0) {
                    simplifiedNumerator = fractionNumerator / Math.pow(2,i);
                    denominator = maxFraction / Math.pow(2,i);
                    break;
                }
            }

            // if (fractionNumerator % 8 === 0) {
            //     simplifiedNumerator = fractionNumerator / 8;
            //     denominator = 2;
            // } else if (fractionNumerator % 4 === 0) {
            //     simplifiedNumerator = fractionNumerator / 4;
            //     denominator = 4;
            // } else if (fractionNumerator % 2 === 0) {
            //     simplifiedNumerator = fractionNumerator / 2;
            //     denominator = 8;
            // }

            const fractionString = simplifiedNumerator + '/' + denominator;
            return `${wholePart}"${fractionString}`;
        }
    }


    static returnCylinder(vstart, vend, radius, material, edges = 4) {
        let zAxis = vend.clone().addScaledVector(vstart, -1);
        let origin = vstart.clone().add(vend).multiplyScalar(0.5);
        var cylLength = zAxis.length();
        var cylGeom = new THREE.CylinderGeometry(radius, radius, cylLength, edges);
        cylGeom.rotateX(Math.PI / 2);
        zAxis.normalize();
        return this.returnObjAtDetailedCoord(cylGeom, material, origin, undefined, undefined, zAxis);
    }

    static disposeHierarchy(node, callback = this.disposeNode) {
        if (node != undefined) {
            for (var i = node.children.length - 1; i >= 0; i--) {
                var child = node.children[i];
                this.disposeHierarchy(child, callback);
                callback(child);
            }
            callback(node);
        }
    }

    static downloadJSON(json, fileName = "building") {
        const blob = new Blob([json], { type: 'application/json' });  // Create a blob from the JSON
        const url = URL.createObjectURL(blob);  // Create a URL for the blob
        const a = document.createElement('a');  // Create an anchor element
        a.href = url;  // Set the URL of the anchor element to the blob URL
        a.download = fileName + ".json";  // Set the desired file name
        document.body.appendChild(a);  // Temporarily add the anchor to the document
        a.click();  // Trigger a click to download the file
        document.body.removeChild(a);  // Remove the anchor from the document
        URL.revokeObjectURL(url);  // Clean up the blob URL
    }

    static replacer(key, value) {
        if (value instanceof THREE.Vector3) {
            return { x: value.x, y: value.y, z: value.z, isVector3: true };
        }
        return value;
    }

    static reviver(key, value) {
        if (value && value.isVector3) {
            return new THREE.Vector3(value.x, value.y, value.z);
        }
        return value;
    }


    static disposeNode(node) {
        if (node.isObject3D) {
            if (node.geometry) {
                node.geometry.dispose();
            }
            //interactionManager.remove(node);
            node.removeFromParent();
            //node.dispose();

            // if (node.material)
            // {
            //     if (node.material instanceof THREE.MeshFaceMaterial)
            //     {
            //         $.each (node.material.materials, function (idx, mtrl)
            //         {
            //             if (mtrl.map)               mtrl.map.dispose ();
            //             if (mtrl.lightMap)          mtrl.lightMap.dispose ();
            //             if (mtrl.bumpMap)           mtrl.bumpMap.dispose ();
            //             if (mtrl.normalMap)         mtrl.normalMap.dispose ();
            //             if (mtrl.specularMap)       mtrl.specularMap.dispose ();
            //             if (mtrl.envMap)            mtrl.envMap.dispose ();
            //             if (mtrl.alphaMap)          mtrl.alphaMap.dispose();
            //             if (mtrl.aoMap)             mtrl.aoMap.dispose();
            //             if (mtrl.displacementMap)   mtrl.displacementMap.dispose();
            //             if (mtrl.emissiveMap)       mtrl.emissiveMap.dispose();
            //             if (mtrl.gradientMap)       mtrl.gradientMap.dispose();
            //             if (mtrl.metalnessMap)      mtrl.metalnessMap.dispose();
            //             if (mtrl.roughnessMap)      mtrl.roughnessMap.dispose();

            //             mtrl.dispose ();    // disposes any programs associated with the material
            //         });
            //     }
            //     else
            //     {
            //         if (node.material.map)              node.material.map.dispose ();
            //         if (node.material.lightMap)         node.material.lightMap.dispose ();
            //         if (node.material.bumpMap)          node.material.bumpMap.dispose ();
            //         if (node.material.normalMap)        node.material.normalMap.dispose ();
            //         if (node.material.specularMap)      node.material.specularMap.dispose ();
            //         if (node.material.envMap)           node.material.envMap.dispose ();
            //         if (node.material.alphaMap)         node.material.alphaMap.dispose();
            //         if (node.material.aoMap)            node.material.aoMap.dispose();
            //         if (node.material.displacementMap)  node.material.displacementMap.dispose();
            //         if (node.material.emissiveMap)      node.material.emissiveMap.dispose();
            //         if (node.material.gradientMap)      node.material.gradientMap.dispose();
            //         if (node.material.metalnessMap)     node.material.metalnessMap.dispose();
            //         if (node.material.roughnessMap)     node.material.roughnessMap.dispose();

            //         node.material.dispose ();   // disposes any programs associated with the material
            //     }
            // }
        }
        // if(node.isObject3D) {
        //     node.removeFromParent();
        // }
    }   // disposeNode


}