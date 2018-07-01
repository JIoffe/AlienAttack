import { vec3, quat, vec2 } from 'gl-matrix';
import { Time } from '../gameplay/time';
import * as aa_math from '../math';
import * as physics from './physics';
import { LevelMap } from '../io/map.struct';


//Reduce Webpack lookup calls
const circleLineTest = aa_math.circleLineSegmentIntersection;
const QTemp = aa_math.QUAT_TEMP;
const VTemp = aa_math.VEC3_TEMP;
const VForward = aa_math.VEC3_FORWARD;
const VLeft = aa_math.VEC3_LEFT;
const VUp = aa_math.VEC3_UP;

//Rigidbody state constants
const IS_ALIVE = 1;
const IS_AIRBORNE = 2;

const STEP_HEIGHT = 1;

var px,py,pz;
var nextX, nextY, nextZ;
var r;

var dt;
var floorHeight;

var wall, point2;
var d = vec3.create();

export class RigidBody{
    constructor(){
        this.pos = vec3.create();
        this.rot = quat.create();
        this.velocity = vec3.create();
        this.state = IS_ALIVE;
        this.sectorPtr = 0;
    }    

    update(time, map){
        px = this.pos[0]; py = this.pos[1]; pz = this.pos[2];

        if((this.sectorPtr = map.determineSector(this.sectorPtr, px, pz)) < 0){
            this.pos[0] = nextX;
            this.pos[1] = nextY;
            this.pos[2] = nextZ;
            return;
        }

        dt = time.secondsSinceLastFrame;

        nextX = px + this.velocity[0] * dt;
        nextY = py + this.velocity[1] * dt;
        nextZ = pz + this.velocity[2] * dt;

        r = this.radius;

        //Check against walls
        //Limit the search to sectors that the rigid body volume intersects
        const walls = map.walls,
            cd = LevelMap.collisionDataBuffer[0],
            visitedSectorSet = LevelMap.visitedSectorSet,
            pendingSectorStack = LevelMap.pendingSectorStack;

        visitedSectorSet.clear();
        pendingSectorStack.n = 0;

        let sectorPtr = this.sectorPtr;

        do{
            if(visitedSectorSet.has(sectorPtr)){
                sectorPtr = pendingSectorStack.pop();
                continue;
            }

            const sector = map.sectors[sectorPtr],
                end = sector.wallptr + sector.wallnum;

            let nCollisions = 0, collisionDisplacementX = 0, collisionDisplacementY = 0;

            for(let i = 0; i < end; ++i){
                wall = walls[i];                  
                point2 = walls[wall.point2];
    
                circleLineTest(cd, nextX, nextZ, r, wall.x, wall.y, point2.x, point2.y);
                if(cd.hasCollision){
                    //Check if this collision should block the player or not
                    let blocking = wall.nextsector === -1;
                    
                    if(!blocking){
                        floorHeight = map.sectors[wall.nextsector].getFloorHeight(cd.point[0], cd.point[2]);
                        if(floorHeight - nextY > STEP_HEIGHT){
                            blocking = true;
                        }else{
                            if(map.sectors[wall.nextsector].getCeilingHeight(cd.point[0], cd.point[2]) < nextY + this.height){
                                blocking = true;
                            }else{
                                nextY = Math.max(floorHeight, nextY);
                            }
                        }
                    }

                    if(blocking){
                        collisionDisplacementX += cd.point[0] + cd.surfaceNormal[0] * r;
                        collisionDisplacementY += cd.point[2] + cd.surfaceNormal[2] * r;
                        ++nCollisions;
                    }else if(wall.nextsector !== -1){
                        //Overallping into another sector and we need to check walls there too.
                        //It's not likely to have too many walls in a particular sector, so it's not a big deal
                        pendingSectorStack.push(wall.nextsector);
                    }
                }
            }

            if(nCollisions > 0){
                collisionDisplacementX /= nCollisions;
                collisionDisplacementY /= nCollisions;

                nextX = collisionDisplacementX;
                nextZ = collisionDisplacementY;
            }
            
            visitedSectorSet.add(sectorPtr);
            sectorPtr = pendingSectorStack.pop();
        }while(sectorPtr >= 0);        

        floorHeight = map.sectors[this.sectorPtr].getFloorHeight(px, pz);
        if(nextY <= floorHeight){
            nextY = floorHeight;
            this.velocity[1] = 0;
            this.state &= ~IS_AIRBORNE;
        }else{
            //recycling variables...
            this.state |= IS_AIRBORNE;
            // floorHeight = map.sectors[this.sectorPtr].getCeilingHeight(px, pz);
            // if(floorHeight < nextY + this.height){
            //     nextY = floorHeight - this.height;
            //     this.velocity[1] = 0;
            // }
        }

        
        this.pos[0] = nextX;
        this.pos[1] = nextY;
        this.pos[2] = nextZ;
        this.velocity[1] -= dt * physics.GRAVITY;
    }

    //Property getters - override in implementations
    get radius(){
        return this.r || 1;
    }

    get height(){
        return 1;
    }

    get forward(){
        vec3.transformQuat(VTemp, VForward, this.rot);
        return VTemp;
    }

    /**
     * Propels the rigid body forward instantly without residual effects. Meant for user controlled objects.
     * @param {number} velocity 
     * @param {Time} time 
     */
    moveForward2d(velocity){
        vec3.transformQuat(VTemp, VForward, this.rot);
        VTemp[1] = 0;
        vec3.normalize(VTemp, VTemp);

        this.velocity[0] = VTemp[0] * velocity;
        this.velocity[2] = VTemp[2] * velocity;
    }

    /**
     * Propels the rigid body sideways instantly without residual effects. Meant for user controlled objects. Use after moveForward2d
     * @param {number} velocity 
     * @param {Time} time 
     */
    strafe2d(velocity){
        vec3.transformQuat(VTemp, VLeft, this.rot);
        VTemp[1] = 0;
        vec3.normalize(VTemp, VTemp);

        this.velocity[0] += VTemp[0] * velocity;
        this.velocity[2] += VTemp[2] * velocity;
    }

    /**
     * Instantly rotates this rigid body by the specified amount around the Y axis
     * @param {number} amount rotation in radians
     */
    rotateY(amount){
        quat.rotateY(this.rot, this.rot, amount);
    }

    /**
     * Turn to face a point along the Y axis
     * @param {vec3} point 
     */
    facePoint(point){
        d[0] = point[0] - this.pos[0];
        d[1] = point[2] - this.pos[2];
        vec2.normalize(d,d);

        quat.setAxisAngle(this.rot, VUp, Math.atan2(-d[1], d[0]) + 1.5707963267948966);
    }

    /**
     * Slerp towards a rotation facing the given point
     * @param {vec3} point 
     * @param {number} s 
     */
    turnTowardsPoint(point, s){
        d[0] = point[0] - this.pos[0];
        d[1] = point[2] - this.pos[2];
        vec2.normalize(d,d);

        quat.setAxisAngle(QTemp, VUp, Math.atan2(-d[1], d[0]) + 1.5707963267948966);
        quat.slerp(this.rot, this.rot, QTemp, s);
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