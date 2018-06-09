import { Buffers } from "./buffers";

var i;

export class AnimatedMesh{
    constructor(gl, meshData){
        this.currentFrame = 0;
        this.currentFrameuInt = 0;
        this.s = 0;

        this.primaryBuffers = [
            Buffers.buildDataBuffer(gl, meshData.texCoords),
            Buffers.buildIndexBuffer(gl, meshData.indices)
        ];

        this.nIndices = meshData.indices.length;

        this.animations = meshData.animations
            .map(animation => {
                return {
                    nFrames: animation.nFrames,
                    frames: Buffers.buildDataBuffer(gl, animation.frames),
                    speed: animation.speed
                }
            });

        this.stride = meshData.vcount * 12;
        this.currentAnimation = this.animations[0];
    }

    setAnimation(index){
        this.currentAnimation = this.animations[index];
    }

    advanceFrame(time){
        this.currentFrame = (this.currentFrame + this.currentAnimation.speed * time.secondsSinceLastFrame) % this.currentAnimation.nFrames;
        this.currentFrameuInt = Math.floor(this.currentFrame);
        this.nextFrameUInt = this.currentFrameuInt < this.currentAnimation.nFrames - 1 ? this.currentFrameuInt + 1 : 0;
        this.s = this.currentFrame - this.currentFrameuInt;
    }

    draw(gl, shaderProgram, modelViewMatrix){
        gl.enableVertexAttribArray(2);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.primaryBuffers[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.primaryBuffers[1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.currentAnimation.frames);    
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, this.currentFrameuInt * this.stride);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPositionB, 3, gl.FLOAT, false, 0, this.nextFrameUInt * this.stride);

        gl.uniform1f(shaderProgram.uniformLocations.s, this.s);

        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);
        gl.drawElements(gl.TRIANGLES, this.nIndices, gl.UNSIGNED_SHORT, 0);
    }
}