import { Buffers } from "./buffers";

export class Renderable{
    constructor(gl, vertices, indices, texCoords, normals){
        this.vertexCount = vertices.length / 3;
        this.indexCount = indices.length;

        this.buffers = {
            vertices: Buffers.buildDataBuffer(gl, vertices),
            texCoords: Buffers.buildDataBuffer(gl, texCoords),
            normals: Buffers.buildDataBuffer(gl, normals),
            indices: Buffers.buildIndexBuffer(gl, indices)
        };
    }

    draw(gl, shaderProgram, texture, cubemap, modelViewMatrix, normalMatrix){
        gl.enableVertexAttribArray(2);
        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);
        gl.uniformMatrix3fv(shaderProgram.uniformLocations.normalMatrix, false, normalMatrix);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertices);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoords);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normals);
        gl.vertexAttribPointer(shaderProgram.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap);
        gl.uniform1i(shaderProgram.uniformLocations.samplerCube, 1);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
        gl.disableVertexAttribArray(2);
    }
}