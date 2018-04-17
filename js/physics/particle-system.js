import { RigidBody } from "./rigid-body";
import { vec3, quat } from "gl-matrix";

import * as aa_math from '../math';
import * as array_utils from '../utils/array.utils';

/**
 * Particle System manages all the particles in the entire scene
 */

const PARTICLE_GRAVITY = 10;
const PARTICLE_DRAG = 0.99;

export class ParticleSystem{
    constructor( maxParticles){
        this.maxParticles = maxParticles;
    }

    initialize(gl){
        const maxParticles = this.maxParticles;

        this.particles = new Array(maxParticles);
        for(var i = 0; i < maxParticles; ++i){
            this.particles[i] = new Particle();
        }

        this.nParticles = 0;

        this.buffers = new Array(1);
        this.buffers[0] = gl.createBuffer();

        //Point sprites only need 16 bytes per entry
        this.particleData = new Float32Array(4 * maxParticles);
    }

    update(time){
        //Update the simulation and draw at once
        for(let i = this.nParticles - 1; i >= 0; --i){
            const particle = this.particles[i];
            // if(particle.life <= 0){
            //     array_utils.swapDeadElements(this.particles, i, this.nParticles--);
            //     continue;
            // }
            
            const j = i * 4;

            // particle.velocity[0] *= PARTICLE_DRAG * time.secondsSinceLastFrame;
            particle.velocity[1] -= PARTICLE_GRAVITY * time.secondsSinceLastFrame;
            // particle.velocity[2] *= PARTICLE_DRAG * time.secondsSinceLastFrame;

            particle.pos[0] += particle.velocity[0] * time.secondsSinceLastFrame;
            particle.pos[1] += particle.velocity[1] * time.secondsSinceLastFrame;
            particle.pos[2] += particle.velocity[2] * time.secondsSinceLastFrame;

            particle.life -= 0.5 * time.secondsSinceLastFrame;

            this.particleData[j] = particle.pos[0];
            this.particleData[j + 1] = particle.pos[1];
            this.particleData[j + 2] = particle.pos[2];
            this.particleData[j + 3] = particle.life;
        }
    }

    draw(gl, shaderProgram, texture, modelViewMatrix){
        if(this.nParticles === 0)
            return;

        gl.useProgram(shaderProgram.program);
 
        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]);
        gl.bufferData(gl.ARRAY_BUFFER, this.particleData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 4, gl.FLOAT, false, 0, 0);
 
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);
 
        gl.drawArrays(gl.POINTS, 0, this.nParticles);
    }

    addBurst(pos, forceVector, angleVariance, count){
        //If we went over our budget, we will have to kill older particles
        if((this.nParticles + count) >= this.maxParticles){
            for(let i = 0; i < count; ++i){
                const temp = this.particles[i];
                this.particles[i] = this.particles[this.nParticles - 1 - i];
                this.particles[this.nParticles - 1 - i] = temp;
            }
            this.nParticles -= count;
        }

        const doubleVariance = angleVariance * 2;

        const end = this.nParticles + count;
        for(let i = this.nParticles; i < end; ++i){
            const particle = this.particles[i];

            //Spread it against the angleVariance (radians)
            quat.fromEuler(aa_math.QUAT_TEMP, Math.random() * doubleVariance - angleVariance, Math.random() * doubleVariance - angleVariance, Math.random() * doubleVariance - angleVariance);
            vec3.transformQuat(particle.velocity, forceVector, aa_math.QUAT_TEMP);
            vec3.copy(particle.pos, pos);

            particle.life = 1;
        }

        this.nParticles = end;
    }
}

class Particle{
    constructor(){
        this.pos = vec3.create();
        this.velocity = vec3.create();

        this.life = 1;
    }
}