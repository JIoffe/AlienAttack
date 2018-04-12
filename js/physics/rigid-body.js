import { vec3, quat } from 'gl-matrix';
import { Time } from '../gameplay/time';
import * as aa_math from '../math';

//Rigidbody state constants
const IS_AIRBORNE = 1;

export class RigidBody{
    constructor(){
        this.pos = vec3.create();
        this.rot = quat.create();
        this.velocity = vec3.create();
        this.state = 0;
        this.sectorPtr = 0;
    }    

    /**
     * Propels the rigid body forward instantly without residual effects. Meant for user controlled objects.
     * @param {number} velocity 
     * @param {Time} time 
     */
    moveForward2d(velocity, time){
        const d = time.secondsSinceLastFrame * velocity;
    
        vec3.transformQuat(aa_math.VEC3_TEMP, aa_math.VEC3_FORWARD, this.rot);
        this.pos[0] += aa_math.VEC3_TEMP[0] * d;
        this.pos[1] += aa_math.VEC3_TEMP[1] * d;
        this.pos[2] += aa_math.VEC3_TEMP[2] * d;
    }

    /**
     * Propels the rigid body sideways instantly without residual effects. Meant for user controlled objects.
     * @param {number} velocity 
     * @param {Time} time 
     */
    strafe2d(velocity, time){
        const d = time.secondsSinceLastFrame * velocity;
    
        vec3.transformQuat(aa_math.VEC3_TEMP, aa_math.VEC3_RIGHT, this.rot);
        this.pos[0] += aa_math.VEC3_TEMP[0] * d;
        this.pos[1] += aa_math.VEC3_TEMP[1] * d;
        this.pos[2] += aa_math.VEC3_TEMP[2] * d;
    }

    /**
     * Instantly rotates this rigid body by the specified amount around the Y axis
     * @param {number} amount rotation in radians
     */
    rotateY(amount){
        quat.rotateY(this.rot, this.rot, amount);
    }
}