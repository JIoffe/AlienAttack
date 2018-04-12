import { Buffers } from "./buffers";

export class Skybox{
    constructor(gl){        
        let vertices = [-1.0, 1.0, -1.0,
                        1.0, 1.0, -1.0,
                        1.0, -1.0, -1.0,
                        -1.0, -1.0, -1.0];
        
        let normals = [-1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0];


        let indices = [2,1,0,0,3,2];

        this.buffers = new Array(3);
        this.buffers[0] = Buffers.buildDataBuffer(gl, vertices);
        this.buffers[1] = Buffers.buildDataBuffer(gl, normals);
        this.buffers[2] = Buffers.buildIndexBuffer(gl, indices);
    }

    draw(gl, shaderProgram, cubemap, modelViewMatrix, normalMatrix){
        const bo = this.buffers;

        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(shaderProgram.program);
        gl.uniformMatrix3fv(shaderProgram.uniformLocations.normalMatrix, false, normalMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, bo[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, bo[1]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap);
        gl.uniform1i(shaderProgram.uniformLocations.samplerCube, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bo[2]);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
        gl.enable(gl.DEPTH_TEST);
    }
}