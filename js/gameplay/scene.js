///
// SCENE
// Exposes all renderable and interactive content currently in play.
// Includes the level geometry, player location, and props
///

import * as aa_math from '../math';
import * as physics from './physics';

//AKA the game state
const PLAYER_MOVEMENT_SPEED = 5;
const PLAYER_TURN_SPEED = 1.4; //RADIANS PER S

var i = 0;

export class Scene{
    constructor(){
        this.playerPos = [0,0,0];
        //Only care about the Y rotation
        this.playerRotation = 0;
    }

    setMap(mapData){
        this.mapData = mapData;
        this.playerPos = mapData.playerPos;
        this.playerSectorIndex = mapData.playerSectorIndex;
    }

    update(time, input){
        const playerMovementDelta = time.secondsSinceLastFrame * PLAYER_MOVEMENT_SPEED;

        if(input.moveForward)
            physics.apply2DThrust(this.playerPos, this.playerRotation, playerMovementDelta);
        else if(input.moveBackward)
            physics.apply2DThrust(this.playerPos, this.playerRotation, -playerMovementDelta);

        if(input.strafeLeft)
            this.playerPos[0] -= playerMovementDelta;
        else if(input.strafeRight)
            this.playerPos[0] += playerMovementDelta;

        //Turning can be either from keys or mouse
        if(input.turnLeft)
            this.playerRotation += PLAYER_TURN_SPEED * time.secondsSinceLastFrame;
        else if(input.turnRight)
            this.playerRotation -= PLAYER_TURN_SPEED * time.secondsSinceLastFrame;

        if(input.jump)
            this.playerPos[1] += playerMovementDelta;
        else if(input.crouch)
            this.playerPos[1] -= playerMovementDelta;
            
        this.playerSectorIndex = this.determinePlayerSector();
    }


    determinePlayerSector(){
        //Assume that objects generally don't move much between frames
        //and stay within the same sector or a neighboring sector
        if(this.playerSectorIndex < 0){
            //The user got out of bounds somehow... We have nothing to go on, so search everywhere
            //In gameplay the camera should always be in the sector, so this should be extremely rare
            return this.searchForSectorIndex(this.playerPos[0], this.playerPos[2]);
        }

        //Simplifies sector location a bit as everything will be resolved as a neighbor anyway
        let previousSector = this.playerSectorIndex;
        if(this.isInSector(previousSector, this.playerPos[0], this.playerPos[2]))
            return previousSector;

        let neighbors = this.mapData.sectors[previousSector].getNeighboringSectors(this.mapData.walls);
        for(let i = neighbors.length - 1; i >= 0; --i){
            let j = neighbors[i];
            if(this.isInSector(j, this.playerPos[0], this.playerPos[2])){
                return j;
            }
        }

        //This scenario should be extremely rare, if it happens at all.
        //Instead of a BFS just go linearly over the whole list.
        //It's possible that the player went out of bounds.
        return this.searchForSectorIndex(this.playerPos[0], this.playerPos[2]);
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
}