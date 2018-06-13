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
import { AnimatedMesh } from '../geometry/animated-mesh';

//AKA the game state
const PLAYER_MOVEMENT_SPEED = 5;
const PLAYER_TURN_SPEED = 65.4; //Degrees per second

const PLAYER_COLLISION_RADIUS = 1.0;
const PLAYER_HEIGHT = 2.25;
const PLAYER_HEIGHT_PADDING = 0.25;

const GRAVITY = 15;

const FIRE_ANIM_DELAY = 200;

var fireAnimTime = 0;
var firedSemiAuto = false;

const LASER_SPEED = 50;

//Projectile Constants
const MAX_PROJECTILES = 64;
const MAX_PARTICLES = 512;
const MAX_DECALS = 64;

const WEAPON_DEFAULT_ROTATION = quat.create();
quat.fromEuler(WEAPON_DEFAULT_ROTATION, 0, 15, 0);

export class Scene{
    constructor(){
        this.player = new RigidBody();
        this.player.radius = PLAYER_COLLISION_RADIUS;

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

        this.activeWeapon = 0;
    }

    setMap(map){
        this.map = map;
        this.player.pos = map.startingPlayerPos;
        quat.fromEuler(this.player.rot, 0, map.startingPlayerRotation, 0);

        this.player.sectorPtr = map.startingPlayerSector;
    }

    setEnemies(enemies){
        this.enemies = enemies.map(e => {
            const def = art.enemy_definitions[e.def];
            const m = new AnimatedMesh(def.mesh);
            vec3.copy(m.pos, e.pos);

            m.hp = (Math.random() * 0.5 + 0.5) * def.hp;

            return m;
        });

        // //We can drop the extra list of enemies
        // art.enemies = [];
    }

    update(time, input){
        const player = this.player;
        const map = this.map;

        /*
            PLAYER MOVEMENT - Forward, Back, Strafe
        */
        if(input.action){
            console.log(player.pos, this.map.sectors[player.sectorPtr].getFloorHeight(player.pos[0], player.pos[2]));
        }
        let isMoving = false;
        if(input.moveForward){
            player.moveForward2d(PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }else if(input.moveBackward){
            player.moveForward2d(-PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }else{
            //Negate forward/backward velocity. Player stops on a dime!
            player.velocity[0] = 0;
            player.velocity[2] = 0;
        }

        if(input.strafeLeft){
            player.strafe2d(-PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }else if(input.strafeRight){
            player.strafe2d(PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }

        //Turning can be either from keys or mouse
        if(input.turnLeft)
            input.mouseX += PLAYER_TURN_SPEED * time.secondsSinceLastFrame;
        else if(input.turnRight)
            input.mouseX -= PLAYER_TURN_SPEED * time.secondsSinceLastFrame;

        quat.fromEuler(player.rot, input.mouseY, input.mouseX, 0);

        this.weaponOffset[0] = 1.7;
        this.weaponOffset[1] = -2;
        this.weaponOffset[2] = -4.2;

        isMoving = true;
        if(isMoving){
            this.weaponOffset[0] += 0;//(time.elapsedMS % 200 - 100) / 100 * 0.3;
            this.weaponOffset[1] += 0;//time.elapsedMS % 200 * 0.035;
        }else{
            player.velocity[0] = 0;
            player.velocity[2] = 0;
        }

        if(input.jump)
            player.velocity[1] = 5;

        if(input.semiAutoFire){
            this.firePrimaryWeapon();
        }

        player.update(time, map);

        //Recover from recoil
        quat.slerp(this.weaponRecoil, this.weaponRecoil, WEAPON_DEFAULT_ROTATION, 4 * time.secondsSinceLastFrame);

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
            //TODO - ... recycle like the others? the player can cancel out a barrage by unleashing his own!
            return;
        }

        //Figure out where the user's looking and adjust the projectile accordingly
        const playerForward = this.player.forward;

        // const collisionData = this.map.rayTrace(this.player.pos[0], this.player.pos[1], this.player.pos[2], playerForward[0], playerForward[1], playerForward[2], this.player.sectorPtr);
        // const targetPosition = collisionData.point;
        // if(!collisionData.hasCollision){
        //     //How can this happen? We must be floating around aimlessly in space
        //     targetPosition[0] = 0;
        //     targetPosition[1] = 0;
        //     targetPosition[2] = -10;

        //     vec3.transformQuat(targetPosition, targetPosition, this.player.rot);
        //     vec3.add(targetPosition, targetPosition, this.player.pos);
        // }


        //throw back the weapon
        quat.fromEuler(this.weaponRecoil, 45, 15, 0);

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
        projectile.pos[2] = 2.0;

        vec3.transformQuat(projectile.pos, projectile.pos, this.player.rot);
        vec3.add(projectile.pos, projectile.pos, this.player.pos);
        projectile.sectorPtr = this.map.determineSector(this.player.sectorPtr, projectile.pos[0], projectile.pos[2]);

        //        aa_math.lookAtRotation(projectile.rot, startingPosition, targetPosition);

    }

    getDamageDecal(picnum){
        switch(picnum){
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
                return Math.random() > 0.5 ? 2 : 3;
            case 5:
                return 6;
            default:
                return 4;
        }
    }

    get bloodDecal(){
        return Math.random() > 0.5 ? 0 : 1;
    }
}