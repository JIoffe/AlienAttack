import { vec3, quat } from 'gl-matrix';
import { Time } from '../gameplay/time';
import * as aa_math from '../math';
import * as physics from './physics';

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

    update(time){
        this.pos[0] += this.velocity[0] * time.secondsSinceLastFrame;
        this.pos[1] += this.velocity[1] * time.secondsSinceLastFrame;
        this.pos[2] += this.velocity[2] * time.secondsSinceLastFrame;

        this.velocity[1] -= time.secondsSinceLastFrame * physics.GRAVITY;
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

    clipAgainstMap(map){
        this.sectorPtr = map.determineSector(this.sectorPtr, this.pos[0], this.pos[2]);
        if(this.sectorPtr >= 0){
            const floorHeight = map.sectors[this.sectorPtr].getFloorHeight(this.pos[0], this.pos[2]) + 2.25;

            if(this.pos[1] <= floorHeight){
                this.pos[1] = floorHeight;
                this.velocity[1] = 0;
                this.state |= IS_AIRBORNE;
            }else{
                this.state &= ~IS_AIRBORNE;
            }
        }
    }
}