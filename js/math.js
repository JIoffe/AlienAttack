import {mat4, vec3, quat, mat3} from 'gl-matrix'

export const MAT3_TEMP = mat3.create();
export const MAT4_TEMP = mat4.create();
export const VEC3_TEMP = new Float32Array([0,0,0]);
export const VEC3_TEMPB = vec3.create();
export const VEC3_FORWARD = new Float32Array([0, 0, 1]);
export const VEC3_RIGHT = new Float32Array([1, 0, 0]);
export const VEC3_BACK = new Float32Array([0, 0, -1]);
export const VEC3_UP = new Float32Array([0,1,0]);

export const QUAT_IDENTITY = (() => {
    let q = quat.create();
    quat.identity(q);
    return q;
})();

export const QUAT_TEMP = quat.create();

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

    return intersectionCount & 1 !== 0;
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

export function orientToNormal(out, pos, normal){
    quat.rotationTo(QUAT_TEMP, VEC3_FORWARD, normal);
    vec3.transformQuat(out, pos, QUAT_TEMP);
}

export function lookAtRotation(out, a, b){
    mat4.targetTo(MAT4_TEMP, a, b, VEC3_UP);
    mat3.fromMat4(MAT3_TEMP, MAT4_TEMP);
    quat.fromMat3(out, MAT3_TEMP);
}

export function lineSegmentIntersection(out, l0x0, l0y0, l0x1, l0y1, l1x0, l1y0, l1x1, l1y1){
    //Project the ends onto each other, assume that the first operand is the testee,
    //eg. a flying projectile path and the second one is more static

    //Determine the vector components,
    // imagine the segments are [A, B] and [C, D]
    //then R = B - A => B = A + R
    //and S = D - C  => D = C + S
    const rx = l0x1 - l0x0,
        ry = l0y1 - l0y0,
        sx = l1x1 - l1x0,
        sy = l1y1 - l1y0;


    //Find scalars t, u such that:
    // l0p0 + tR == l1p0 + uS
    //Solve for t by multiplying both sides by S to remove u
    //(l0p0 + tR) X S == (l1p0 + uS) X S
    //l0p0 X S + tR X S == l1p0 X S + uS X S
    //l0p0 X S + tR X S == l1p0 X S
    //tR X S == l1p0 X S - l0p0 X S
    // t == (l1p0 X S - l0p0 X S) / (R X S)
    const RxS = (rx * sy - ry * sx);
    const t = ((l1x0 * sy - l1y0 * sx) - (l0x0 * sy - l0y0 * sx)) / RxS;

    if(t < 0 || t > 1.0){
        out.hasCollision = false;
        return;
    }

    //Solve for u by multiplying both sides by R to remove t
    //(l0p0 + tR) X R == (l1p0 + uS) X R
    //l0p0 X R + t(R X R) == l1p0 X R + u(S X R)
    //l0p0 X R = l1p0 X R + u(S X R)
    //u(S X R) = l0p0 X R - l1p0 X R
    //u = (l0p0 X R - l1p0 X R) / (S X R)

    const u = ((l0x0 * ry - l0y0 * rx) - (l1x0 * ry - l1y0 * rx)) / -RxS;
    if(u < 0 || u > 1.0){
        out.hasCollision = false;
        return;
    }

    out.point[0] = l0x0 + t * rx;
    out.point[1] = 0;
    out.point[2] = l0y0 + t * ry;

    out.surfaceNormal[0] = -sy;
    out.surfaceNormal[1] = 0;
    out.surfaceNormal[2] = sx;

    vec3.normalize(out.surfaceNormal, out.surfaceNormal);
    
    out.hasCollision = true;
}