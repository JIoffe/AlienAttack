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

export class Scene{
    constructor(){
        this.playerPos = [0,0,0];
        //Only care about the Y rotation
        this.playerRotation = 0;


    }

    setMap(mapData){
        this.playerPos = mapData.playerPos;
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
            
        //this.playerRotation = aa_math.clampRadians(this.playerRotation);
    }
}