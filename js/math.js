import {mat4} from 'gl-matrix'

//Buffered viewmatrix
const viewMatrix = mat4.create();

export const Constants = {
    RadToDeg: 57.295779513082320876798154814105,    // 180 / Pi
    DegToRad: 0.01745329251994329576923690768489,     //Pi / 180
    HalfPi: Math.PI / 2
}

export function lerp(a, b, s){
    return b - ((1.0 - s) * (b - a));
}

export function cross2d(p0, l0, l1){
    return (l1.x - l0.x) * (p0.y - l0.y) - (l1.y - l0.y) * (p0.x - l0.x);
}

export function insidePolygon(polygonPoints, px, py){
    let intersectionCount = 0;
    for(let i = 0; i < polygonPoints.length; ++i){
        let j = i < polygonPoints.length - 1 ? i + 1 : 0;
        let l0 = polygonPoints[i],
            l1 = polygonPoints[j];

        //Test against vertical ray to point
        if(px >= Math.min(l0.x, l1.x) && px <= Math.max(l0.x, l1.x) && py < Math.max(l0.y, l1.y)){
            intersectionCount++;
        }
    }

    return intersectionCount % 2 !== 0;
}

export function clampDegrees(d){
    d = d % 360;
    if(d < 0)
        d += 360;
    
    return d;
}

export function clampRadians(r){
    r = r % 2;
    if(r < 0)
        r += 2;

    return r;
}

export function buildCameraEyeMatrix(pos, rot){
    const cosTheta = Math.cos(rot);
    const sinTheta = Math.cos(rot);

    // YAW ROTATION
    /*
        cos(a),     0,  sin(a),     0,
            0,      1,      0,      0,
        -sin(a),    0,  cos(a),     0,
            0,      0,      0,      1
    */

    // Translation 
    /*
        1  0  0  0
        0  1  0  0
        0  0  1  0
        x  y  z  1
    */

    viewMatrix[0] = cosTheta;   viewMatrix[1] = 0; viewMatrix[2] = sinTheta; viewMatrix[3] = 0;
    viewMatrix[4] = 0;          viewMatrix[5] = 1; viewMatrix[6] = 0; viewMatrix[7] = 0;
    viewMatrix[8] = -sinTheta;  viewMatrix[9] = 0; viewMatrix[10] = cosTheta; viewMatrix[0] = 0;
    viewMatrix[0] = -pos[0];    viewMatrix[0] = -pos[1]; viewMatrix[0] = -pos[2]; viewMatrix[0] = 1;

    return viewMatrix;
}
export function buildProjectionMatrix(fovDegrees, w, h, zNear, zFar){
    const fov = fovDegrees * Constants.DegToRad;
    const aspect = w / h;
    const projectionMatrix = mat4.create();
  
    mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);

    return projectionMatrix;
}