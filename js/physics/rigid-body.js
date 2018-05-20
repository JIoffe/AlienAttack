import { vec3, quat } from 'gl-matrix';
import { Time } from '../gameplay/time';
import * as aa_math from '../math';
import * as physics from './physics';
import { LevelMap } from '../io/map.struct';

//Rigidbody state constants
const IS_ALIVE = 1;
const IS_AIRBORNE = 2;


export class RigidBody{
    constructor(){
        this.pos = vec3.create();
        this.rot = quat.create();
        this.velocity = vec3.create();
        this.state = IS_ALIVE;
        this.sectorPtr = 0;
        this.radius = 1;
    }    

    update(time, map){
        const px = this.pos[0], py = this.pos[1], pz = this.pos[2];
        const stepUp = py - 1.5;
        const headOffset = 0.25;

        let nextX = px + this.velocity[0] * time.secondsSinceLastFrame,
            nextY = py + this.velocity[1] * time.secondsSinceLastFrame,
            nextZ = pz + this.velocity[2] * time.secondsSinceLastFrame;

        if((this.sectorPtr = map.determineSector(this.sectorPtr, px, pz)) >= 0){
            const floorHeight = map.sectors[this.sectorPtr].getFloorHeight(px, pz) + 2.25;

            if(nextY <= floorHeight){
                nextY = floorHeight;
                this.velocity[1] = 0;
                this.state &= ~IS_AIRBORNE;
            }else{
                this.state |= IS_AIRBORNE;
                const ceilingHeight = map.sectors[this.sectorPtr].getCeilingHeight(px, pz);
                if(ceilingHeight < py + headOffset){
                    nextY = ceilingHeight - headOffset;
                    this.velocity[1] = 0;
                }
            }

            
            //Check against walls
            //Limit the search to sectors that the rigid body volume intersects
            // const walls = map.walls,
            //     cd = LevelMap.collisionDataBuffer[0],
            //     visitedSectorSet = LevelMap.visitedSectorSet,
            //     pendingSectorStack = LevelMap.pendingSectorStack;

            // visitedSectorSet.clear();
            // pendingSectorStack.n = 0;

            // let sectorPtr = this.sectorPtr;

            // do{
            //     if(visitedSectorSet.has(sectorPtr)){
            //         sectorPtr = pendingSectorStack.pop();
            //         continue;
            //     }

            //     const sector = map.sectors[sectorPtr],
            //         end = sector.wallptr + sector.wallnum;

            //     let nCollisions = 0, collisionDisplacementX = 0, collisionDisplacementY = 0;

            //     for(let i = 0; i < end; ++i){
            //         const wall = walls[i];                  
            //         const point2 = walls[wall.point2];
        
            //         aa_math.circleLineSegmentIntersection(cd, nextX, nextZ, this.radius, wall.x, wall.y, point2.x, point2.y);
            //         if(cd.hasCollision){
            //             //Check if this collision should block the player or not
            //             let blocking = wall.nextsector === -1;
                        
            //             if(!blocking){
            //                 const stepHeight = map.sectors[wall.nextsector].getFloorHeight(cd.point[0], cd.point[2]);
            //                 if(stepHeight > stepUp){
            //                     blocking = true;
            //                 }else{
            //                     const overhangDepth = map.sectors[wall.nextsector].getCeilingHeight(cd.point[0], cd.point[2]);
            //                     if(overhangDepth < nextY + headOffset){
            //                         blocking = true;
            //                     }else{
            //                         nextY = Math.max(stepHeight + 2.25, nextY);
            //                     }
            //                 }
            //             }
    
            //             if(blocking){
            //                 collisionDisplacementX += cd.point[0] + cd.surfaceNormal[0] * this.radius;
            //                 collisionDisplacementY += cd.point[2] + cd.surfaceNormal[2] * this.radius;
            //                 ++nCollisions;
            //             }else if(wall.nextsector !== -1){
            //                 //Overallping into another sector and we need to check walls there too.
            //                 //It's not likely to have too many walls in a particular sector, so it's not a big deal
            //                 pendingSectorStack.push(wall.nextsector);
            //             }
            //         }
            //     }
    
            //     if(nCollisions > 0){
            //         collisionDisplacementX /= nCollisions;
            //         collisionDisplacementY /= nCollisions;
    
            //         nextX = collisionDisplacementX;
            //         nextZ = collisionDisplacementY;
            //     }
                
            //     visitedSectorSet.add(sectorPtr);
            //     sectorPtr = pendingSectorStack.pop();
            // }while(sectorPtr >= 0);
        }
        
        this.pos[0] = nextX;
        this.pos[1] = nextY;
        this.pos[2] = nextZ;
        this.velocity[1] -= time.secondsSinceLastFrame * physics.GRAVITY;
    }

    get forward(){
        vec3.transformQuat(aa_math.VEC3_TEMP, aa_math.VEC3_FORWARD, this.rot);
        return aa_math.VEC3_TEMP;
    }

    /**
     * Propels the rigid body forward instantly without residual effects. Meant for user controlled objects.
     * @param {number} velocity 
     * @param {Time} time 
     */
    moveForward2d(velocity){
        vec3.transformQuat(aa_math.VEC3_TEMP, aa_math.VEC3_FORWARD, this.rot);
        aa_math.VEC3_TEMP[1] = 0;
        vec3.normalize(aa_math.VEC3_TEMP, aa_math.VEC3_TEMP);

        this.velocity[0] = aa_math.VEC3_TEMP[0] * velocity;
        this.velocity[2] = aa_math.VEC3_TEMP[2] * velocity;
    }

    /**
     * Propels the rigid body sideways instantly without residual effects. Meant for user controlled objects. Use after moveForward2d
     * @param {number} velocity 
     * @param {Time} time 
     */
    strafe2d(velocity){
        vec3.transformQuat(aa_math.VEC3_TEMP, aa_math.VEC3_LEFT, this.rot);
        aa_math.VEC3_TEMP[1] = 0;
        vec3.normalize(aa_math.VEC3_TEMP, aa_math.VEC3_TEMP);

        this.velocity[0] += aa_math.VEC3_TEMP[0] * velocity;
        this.velocity[2] += aa_math.VEC3_TEMP[2] * velocity;
    }

    /**
     * Instantly rotates this rigid body by the specified amount around the Y axis
     * @param {number} amount rotation in radians
     */
    rotateY(amount){
        quat.rotateY(this.rot, this.rot, amount);
    }

    enable(){
        this.state |= IS_ALIVE;
    }
    kill(){
        this.state &= ~IS_ALIVE;
    }

    get isAlive(){
        return !!(this.state & IS_ALIVE);
    }
}