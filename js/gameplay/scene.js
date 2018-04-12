///
// SCENE
// Exposes all renderable and interactive content currently in play.
// Includes the level geometry, player location, and props
///

import * as aa_math from '../math';
import * as art from '../art';
import { quat, vec3, mat4 } from 'gl-matrix';
import { RigidBody } from '../physics/rigid-body';

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

//Projectile Constants
const MAX_PROJECTILES = 128;

export class Scene{
    constructor(){
        this.player = new RigidBody();

        //Deep copy of sprite definitions in case we need to move things around later
        this.guiSprites = art.gui_sprites.map(s => {
            return{
                x: s.x,
                y: s.y,
                scale: s.scale,
                img: s.img
            };
        })

        this.projectiles = new Array(MAX_PROJECTILES);
    }

    setMap(map){
        this.map = map;
        this.player.pos = map.startingPlayerPos;
        quat.fromEuler(this.player.rot, 0, map.startingPlayerRotation, 0);

        this.player.sectorPtr = map.startingPlayerSector;
    }

    update(time, input){
        const player = this.player;
        const map = this.map;

        /*
            PLAYER MOVEMENT - Forward, Back, Strafe
        */
        let isMoving = false;
        if(input.moveForward){
            player.moveForward2d(PLAYER_MOVEMENT_SPEED, time);
            isMoving = true;
        }else if(input.moveBackward){
            player.moveForward2d(-PLAYER_MOVEMENT_SPEED, time);
            isMoving = true;
        }

        if(input.strafeLeft){
            player.strafe2d(-PLAYER_MOVEMENT_SPEED, time);
            isMoving = true;
        }else if(input.strafeRight){
            player.strafe2d(PLAYER_MOVEMENT_SPEED, time);
            isMoving = true;
        }

            //Turning can be either from keys or mouse
        if(input.turnLeft)
            player.rotateY(PLAYER_TURN_SPEED * time.secondsSinceLastFrame);
        else if(input.turnRight)
            player.rotateY(-PLAYER_TURN_SPEED * time.secondsSinceLastFrame);

        if(isMoving){
            //Update gun bobbing effect
            this.guiSprites[0].x = art.gui_sprites[0].x + Math.sin(time.elapsedSeconds * 3.5) * 0.02;
            this.guiSprites[0].y = art.gui_sprites[0].y + Math.abs(Math.cos(time.elapsedSeconds * 2.5)) * 0.05;
        }else{
            this.guiSprites[0].x = art.gui_sprites[0].x;
            this.guiSprites[0].y = art.gui_sprites[0].y;
        }

        if(input.jump)
            player.velocity[1] = 5;

        player.update(time);
        player.clipAgainstMap(map);
        //If gun is firing...
        // if(firedSemiAuto){
        //     if(!input.fire)
        //         firedSemiAuto = false;
        // }else if(input.fire && fireAnimTime <= 0){
        //     this.firePrimaryWeapon();
        // }

        // if(fireAnimTime <= 0){
        //     this.guiSprites[0].img = 0;
        // }else{
        //     this.guiSprites[0].img = 3;
        //     fireAnimTime -= time.msSinceLastFrame;
        // }

            


        // //Update player collision
        // this.playerSectorIndex = this.determinePlayerSector();

        // if(this.playerSectorIndex >= 0){
        //     //Only apply gravity if we're not floating in space...
        //     this.playerYVelocity -= GRAVITY * time.secondsSinceLastFrame;
        //     this.playerPos[1] += this.playerYVelocity * time.secondsSinceLastFrame;

        //     let floorHeight = this.mapData.sectors[this.playerSectorIndex].getFloorHeight(this.playerPos[0], this.playerPos[2]) + PLAYER_HEIGHT;
        //     if(this.playerPos[1] <= floorHeight){
        //         this.playerIsAirborne = false;
        //         this.playerPos[1] = floorHeight;
        //     }else{
        //         let ceilingHeight = this.mapData.sectors[this.playerSectorIndex].getCeilingHeight(this.playerPos[0], this.playerPos[2]) - PLAYER_HEIGHT_PADDING;
        //         if(this.playerPos[1] > ceilingHeight){
        //             this.playerYVelocity = 0;
        //             this.playerPos[1] = ceilingHeight;
        //         }

        //         this.playerIsAirborne = true;
        //     }
        // }

        // //update player projectiles
        // const laserDisplacement = LASER_SPEED * time.secondsSinceLastFrame;
        // for(let i = this.laserBlasts.length - 1; i >= 0; --i){
        //     const lb = this.laserBlasts[i];
        //     lb.pos[0] += lb.forward[0] * laserDisplacement;
        //     lb.pos[1] += lb.forward[1] * laserDisplacement;
        //     lb.pos[2] += lb.forward[2] * laserDisplacement;

        //     if(this.collidesWithMap(lb.sectorIndex, lb.pos[0], lb.pos[2])){
        //         //console.log('KABOOM!');
        //     }
        // }
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
}