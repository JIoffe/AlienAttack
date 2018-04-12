import * as aa_math from '../math';
import { vec3, quat } from 'gl-matrix';

/**
 * 
 * @param {vec3} pos 
 * @param {quat} rot 
 * @param {number} velocity 
 * @param {*} time 
 */
export function apply2DThrust(pos, rot, velocity, time){
    const d = time.secondsSinceLastFrame * velocity;

    vec3.transformQuat(aa_math.VEC3_TEMP, aa_math.VEC3_FORWARD, rot);
    pos[0] += aa_math.VEC3_TEMP[0] * d;
    pos[1] += aa_math.VEC3_TEMP[1] * d;
    pos[2] += aa_math.VEC3_TEMP[2] * d;
}

export function apply2DStrafe(pos, rot, velocity, time){
    const d = time.secondsSinceLastFrame * velocity;

    vec3.transformQuat(aa_math.VEC3_TEMP, aa_math.VEC3_RIGHT, rot);
    pos[0] -= aa_math.VEC3_TEMP[0] * d;
    pos[1] -= aa_math.VEC3_TEMP[1] * d;
    pos[2] -= aa_math.VEC3_TEMP[2] * d;
}