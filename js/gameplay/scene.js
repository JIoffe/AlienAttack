///
// SCENE
// Exposes all renderable and interactive content currently in play.
// Includes the level geometry, player location, and props
///

import * as aa_math from '../math';
import * as art from '../art';
import * as array_utils from '../utils/array.utils';

import { quat, vec3, mat4 } from 'gl-matrix';
import { RigidBody } from '../physics/rigid-body';
import { Projectile, ProjectileTypes } from './projectile';
import { ParticleSystem } from '../physics/particle-system';
import { DecalSystem } from '../geometry/decal-system';

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
const MAX_PROJECTILES = 64;
const MAX_PARTICLES = 512;
const MAX_DECALS = 64;

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
        this.nProjectiles = 0;

        for(let i = 0; i < MAX_PROJECTILES; ++i){
            this.projectiles[i] = new Projectile();
        }

        this.weaponOffset = vec3.create();
        this.weaponRecoil = quat.create();

        this.particleSystem = new ParticleSystem(MAX_PARTICLES);
        this.decalSystem = new DecalSystem(MAX_DECALS);
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

        this.weaponOffset[0] = 1.6;
        this.weaponOffset[1] = -2;
        this.weaponOffset[2] = -4.2;
        if(isMoving){
            this.weaponOffset[0] += Math.sin(time.elapsedSeconds * 3.5) * 0.2;
            this.weaponOffset[1] += Math.abs(Math.cos(time.elapsedSeconds * 4.5)) * 0.35;
        }

        if(input.jump)
            player.velocity[1] = 5;

        if(input.semiAutoFire){
            this.firePrimaryWeapon();
        }

        player.update(time);
        player.clipAgainstMap(map);

        //Recover from recoil
        quat.slerp(this.weaponRecoil, this.weaponRecoil, aa_math.QUAT_IDENTITY, 4 * time.secondsSinceLastFrame);


        for(let i = this.nProjectiles - 1; i >= 0; --i){
            const projectile = this.projectiles[i];
            projectile.update(time, this);
            if(!projectile.isAlive){
                array_utils.swapDeadElements(this.projectiles, i, this.nProjectiles--);
            }
        }

        this.particleSystem.update(time);
    }

    firePrimaryWeapon(){
        if(this.nProjectiles >= MAX_PROJECTILES){
            return;
        }

        quat.fromEuler(this.weaponRecoil, 45, 0, 0);

        //TODO - avoid allocations here

        //Our view of the primary weapon is offset,
        //so we have to compensate to make it appear that 
        //projectiles are going towards where the user is looking...

        const projectile = this.projectiles[this.nProjectiles++];
        
        projectile.enable();
        projectile.type = ProjectileTypes.laser;
        quat.copy(projectile.rot, this.player.rot);
        projectile.setSpeed(LASER_SPEED);

        projectile.pos[0] = -0.45;
        projectile.pos[1] = -0.25;
        projectile.pos[2] = 2.5;

        //Target 10 units in front of us
        const targetPosition = new Float32Array([0,0,-10]);

        vec3.transformQuat(targetPosition, targetPosition, this.player.rot);
        vec3.transformQuat(projectile.pos, projectile.pos, this.player.rot);

        vec3.add(targetPosition, targetPosition, this.player.pos);
        vec3.add(projectile.pos, projectile.pos, this.player.pos);
        projectile.sectorPtr = this.map.determineSector(-1, projectile.pos[0], projectile.pos[2]);

        //        aa_math.lookAtRotation(projectile.rot, startingPosition, targetPosition);

    }
}