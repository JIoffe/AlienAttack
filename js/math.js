import {mat4, vec3} from 'gl-matrix'

export const VEC3_TEMP = new Float32Array([0,0,0]);
export const VEC3_FORWARD = new Float32Array([0, 0, 1]);
export const VEC3_BACK = new Float32Array([0, 0, -1]);
export const VEC3_UP = new Float32Array([0,1,0]);

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

export function buildCameraEyeMatrix(out, pos, rot){
    vec3.transformQuat(VEC3_TEMP, VEC3_FORWARD, rot);

    VEC3_TEMP[0] += pos[0];
    VEC3_TEMP[1] += pos[1];
    VEC3_TEMP[2] += pos[2];

    mat4.lookAt(out, pos, VEC3_TEMP, VEC3_UP);
}

export function buildProjectionMatrix(fovDegrees, w, h, zNear, zFar){
    const fov = fovDegrees * Constants.DegToRad;
    const aspect = w / h;
    const projectionMatrix = mat4.create();
  
    mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);

    return projectionMatrix;
}