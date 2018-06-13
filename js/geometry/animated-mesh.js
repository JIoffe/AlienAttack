import { getAnimatedGeometry } from "./animated-mesh-repository";
import { vec3, quat } from "gl-matrix";

var i, stride;

export class AnimatedMesh{
    constructor(i){
        this.definition = getAnimatedGeometry(i);
        this.currentAnimation = this.definition.animations[0];
        this.stop();

        this.pos = vec3.create();
        this.rot = quat.create();
    }

    setAnimationByLabel(label){
        this.currentAnimation = this.definition.animations.find(a => a.label === label) || this.currentAnimation;
    }
    
    setAnimation(index){
        this.currentAnimation = this.definition.animations[index];
    }

    advanceFrame(time){
        if(this.currentAnimation.loop){
            this.currentFrame = (this.currentFrame + this.currentAnimation.speed * time.secondsSinceLastFrame) % this.currentAnimation.nFrames;
            this.currentFrameuInt = Math.floor(this.currentFrame);
            this.nextFrameUInt = this.currentFrameuInt < this.currentAnimation.nFrames - 1 ? this.currentFrameuInt + 1 : 0;
        }else{
            this.currentFrame = Math.min(this.currentAnimation.nFrames - 1, this.currentFrame + this.currentAnimation.speed * time.secondsSinceLastFrame);
            this.currentFrameuInt = Math.floor(this.currentFrame);
            this.nextFrameUInt = this.currentFrameuInt < this.currentAnimation.nFrames - 1 ? this.currentFrameuInt + 1 : this.currentFrameuInt;
        }

        this.s = this.currentFrame - this.currentFrameuInt;
    }

    stop(){
        this.currentFrame = 0;
        this.currentFrameuInt = 0;
        this.nextFrameUInt = 0;
        this.s = 0;
    }

    draw(gl, shaderProgram, modelViewMatrix){
        stride = this.definition.stride;

        gl.enableVertexAttribArray(2);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.definition.primaryBuffers[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.definition.primaryBuffers[1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.currentAnimation.frames);    
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, this.currentFrameuInt * stride);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPositionB, 3, gl.FLOAT, false, 0, this.nextFrameUInt * stride);

        gl.uniform1f(shaderProgram.uniformLocations.s, this.s);

        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);
        gl.drawElements(gl.TRIANGLES, this.definition.nIndices, gl.UNSIGNED_SHORT, 0);
    }
}