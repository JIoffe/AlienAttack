import { Buffers } from "./buffers";

export class Skybox{
    constructor(gl){        
        const vertices = [0, 2,
                        2, 2,
                        2, 0,
                        0, 0];
        
        const normals = [1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0];

        const bufferDesc = [
            {data: vertices, count: 2, type: gl.UNSIGNED_SHORT},
            {data: normals, count: 3, type: gl.FLOAT}
        ];

        const indices = [2,1,0,0,3,2];

        this.buffers = [
            Buffers.buildInterLeavedVBO(gl, bufferDesc),
            Buffers.buildIndexBuffer(gl, indices)
        ];
    }

    draw(gl, shaderProgram, cubemap, modelViewMatrix, normalMatrix){
        const bo = this.buffers;

        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(shaderProgram.program);
        gl.uniformMatrix3fv(shaderProgram.uniformLocations.normalMatrix, false, normalMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, bo[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 2, gl.UNSIGNED_SHORT, false, 16, 0);
        gl.vertexAttribPointer(shaderProgram.attribLocations.normalPosition, 3, gl.FLOAT, false, 16, 4);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap);
        gl.uniform1i(shaderProgram.uniformLocations.samplerCube, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bo[1]);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
        gl.enable(gl.DEPTH_TEST);
    }
}