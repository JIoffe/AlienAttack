///
// SCENE
// Exposes all renderable and interactive content currently in play.
// Includes the level geometry, player location, and props
///

import * as aa_math from '../math';
import * as physics from './physics';
import * as art from '../art';
import { quat, vec3, mat4 } from 'gl-matrix';
import { MapCollisionSolver } from '../collision/map-collision.solver';

//AKA the game state
const PLAYER_MOVEMENT_SPEED = 5;
const PLAYER_TURN_SPEED = 1.4; //RADIANS PER S

const PLAYER_HEIGHT = 2.25;
const PLAYER_HEIGHT_PADDING = 0.25;

const GRAVITY = 15;

const FIRE_ANIM_DELAY = 200;

var fireAnimTime = 0;
var firedSemiAuto = false;

const LASER_SPEED = 25;

export class Scene{
    constructor(){
        //TODO - abstract into rigid body
        this.playerPos = [0,0,0];
        //Only care about the Y rotation
        this.playerRotation = 0;
        this.playerIsAirborne = false;
        this.playerYVelocity = 0;

        //Deep copy of sprite definitions in case we need to move things around later
        this.guiSprites = art.gui_sprites.map(s => {
            return{
                x: s.x,
                y: s.y,
                scale: s.scale,
                img: s.img
            };
        })

        //Lasers are a special kind of particle, enlongated
        this.laserBlasts = [];
    }

    setMap(mapData){
        this.mapData = mapData;
        this.playerPos = mapData.playerPos;
        this.playerSectorIndex = mapData.playerSectorIndex;
    }

    update(time, input){
        const playerMovementDelta = time.secondsSinceLastFrame * PLAYER_MOVEMENT_SPEED;
        let isMoving = false;

        if(input.moveForward){
            physics.apply2DThrust(this.playerPos, this.playerRotation, playerMovementDelta);
            isMoving = true;
        }else if(input.moveBackward){
            physics.apply2DThrust(this.playerPos, this.playerRotation, -playerMovementDelta);
            isMoving = true;
        }

        if(isMoving){
            //Update gun bobbing effect
            this.guiSprites[0].x = art.gui_sprites[0].x + Math.sin(time.elapsedSeconds * 3.5) * 0.02;
            this.guiSprites[0].y = art.gui_sprites[0].y + Math.abs(Math.cos(time.elapsedSeconds * 2.5)) * 0.05;
        }else{
            this.guiSprites[0].x = art.gui_sprites[0].x;
            this.guiSprites[0].y = art.gui_sprites[0].y;
        }

        //If gun is firing...
        if(firedSemiAuto){
            if(!input.fire)
                firedSemiAuto = false;
        }else if(input.fire && fireAnimTime <= 0){
            this.firePrimaryWeapon();
        }

        if(fireAnimTime <= 0){
            this.guiSprites[0].img = 0;
        }else{
            this.guiSprites[0].img = 3;
            fireAnimTime -= time.msSinceLastFrame;
        }

        // if(input.strafeLeft)
        //     this.playerPos[0] -= playerMovementDelta;
        // else if(input.strafeRight)
        //     this.playerPos[0] += playerMovementDelta;

        //Turning can be either from keys or mouse
        if(input.turnLeft)
            this.playerRotation += PLAYER_TURN_SPEED * time.secondsSinceLastFrame;
        else if(input.turnRight)
            this.playerRotation -= PLAYER_TURN_SPEED * time.secondsSinceLastFrame;

        if(input.jump && !this.playerIsAirborne)
            this.playerYVelocity = 5;
        // else if(input.crouch)
        //     this.playerPos[1] -= playerMovementDelta;
            

        //Update player collision
        this.playerSectorIndex = this.determinePlayerSector();

        if(this.playerSectorIndex >= 0){
            //Only apply gravity if we're not floating in space...
            this.playerYVelocity -= GRAVITY * time.secondsSinceLastFrame;
            this.playerPos[1] += this.playerYVelocity * time.secondsSinceLastFrame;

            let floorHeight = this.mapData.sectors[this.playerSectorIndex].getFloorHeight(this.playerPos[0], this.playerPos[2]) + PLAYER_HEIGHT;
            if(this.playerPos[1] <= floorHeight){
                this.playerIsAirborne = false;
                this.playerPos[1] = floorHeight;
            }else{
                let ceilingHeight = this.mapData.sectors[this.playerSectorIndex].getCeilingHeight(this.playerPos[0], this.playerPos[2]) - PLAYER_HEIGHT_PADDING;
                if(this.playerPos[1] > ceilingHeight){
                    this.playerYVelocity = 0;
                    this.playerPos[1] = ceilingHeight;
                }

                this.playerIsAirborne = true;
            }
        }

        //update player projectiles
        const laserDisplacement = LASER_SPEED * time.secondsSinceLastFrame;
        for(let i = this.laserBlasts.length - 1; i >= 0; --i){
            const lb = this.laserBlasts[i];
            lb.pos[0] += lb.forward[0] * laserDisplacement;
            lb.pos[1] += lb.forward[1] * laserDisplacement;
            lb.pos[2] += lb.forward[2] * laserDisplacement;

            if(this.collidesWithMap(lb.sectorIndex, lb.pos[0], lb.pos[2])){
                console.log('KABOOM!');
            }
        }
    }

    firePrimaryWeapon(){
        let playerMatrix = mat4.create();
        let playerQuat = quat.create();
        quat.setAxisAngle(playerQuat, [0,1,0], this.playerRotation);
        mat4.fromRotationTranslation(playerMatrix, playerQuat, this.playerPos);

        let targetPosition = [0,0,-10];
        vec3.transformMat4(targetPosition, targetPosition, playerMatrix);

        let startingPos = [0.12,-0.12,-1.1];
        vec3.transformMat4(startingPos, startingPos, playerMatrix);

        
        let playerNorm = [
            -Math.sin(this.playerRotation),
            0,
            -Math.cos(this.playerRotation)
        ];

        let targetDirection = vec3.create();
        vec3.sub(targetDirection, targetPosition, startingPos);
        vec3.normalize(targetDirection, targetDirection);

        let rot = quat.create();
        quat.setAxisAngle(rot, [0,1,0], this.playerRotation);

        this.laserBlasts.push({
            pos: startingPos,
            rot: rot,
            forward: targetDirection,
            sectorIndex: this.playerSectorIndex
        });
        fireAnimTime = FIRE_ANIM_DELAY;
        firedSemiAuto = true;
    }

    determinePlayerSector(){
        return this.determineSector(this.playerSectorIndex, this.playerPos[0], this.playerPos[2]);
    }

    determineSector(previousSector, x, y){
        //Assume that objects generally don't move much between frames
        //and stay within the same sector or a neighboring sector
        if(previousSector < 0){
            //The user got out of bounds somehow... We have nothing to go on, so search everywhere
            //In gameplay the camera should always be in the sector, so this should be extremely rare
            return this.searchForSectorIndex(x, y);
        }

        //Simplifies sector location a bit as everything will be resolved as a neighbor anyway
        if(this.isInSector(previousSector, x, y))
            return previousSector;

        let neighbors = this.mapData.sectors[previousSector].getNeighboringSectors(this.mapData.walls);
        for(let i = neighbors.length - 1; i >= 0; --i){
            let j = neighbors[i];
            if(this.isInSector(j, x, y)){
                return j;
            }
        }

        //This scenario should be extremely rare, if it happens at all.
        //Instead of a BFS just go linearly over the whole list.
        //It's possible that the player went out of bounds.
        return this.searchForSectorIndex(x, y);
    }

    isInSector(i, x, y){
        let bounds = this.mapData.sectors[i].getWallLoops(this.mapData.walls)[0];
        return aa_math.insidePolygon(bounds, x, y);
    }

    searchForSectorIndex(x, y){
        for(let i = 0; i < this.mapData.sectors.length; ++i){
            let bounds = this.mapData.sectors[i].getWallLoops(this.mapData.walls)[0];

            if(aa_math.insidePolygon(bounds, x, y)){
                return i;
            }
        }

        return -1;
    }

    //Collision
    collidesWithMap(previousSector, x, y){
        let currentSector = this.determineSector(previousSector, x, y);
        return MapCollisionSolver.collidesWithMap(this.mapData, x, y, currentSector);
    }
}