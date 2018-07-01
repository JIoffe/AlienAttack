import { Buffers } from "./buffers";

/**
 * Batches a group of meshes to share data buffers
 */
var i;

export class MeshBatch{
    constructor(gl, meshes){
        this.batch(gl, meshes);
    }

    batch(gl, meshes){
        if(!meshes || !meshes.length){
            console.error('Bad mesh input!');
            return;
        }

        let vertices = [],
            texCoords = [],
            //normals = [],
            indices = [],
            indexRanges = [];

        meshes.forEach(mesh => {
            if(!mesh.vertices || !mesh.indices || !mesh.texCoords){
                console.error('Missing geometric data for mesh ', mesh);
                return;
            }

            let currentVertexCount = vertices.length / 3;
            indexRanges.push(mesh.indices.length, indices.length * 2);
            indices = indices.concat(mesh.indices.map(ind => ind + currentVertexCount));

            vertices = vertices.concat(mesh.vertices);
            texCoords = texCoords.concat(mesh.texCoords);
        });

        const bufferDesc = [
            {data: vertices, count: 3, type: gl.FLOAT},
            {data: texCoords, count: 2, type: gl.UNSIGNED_SHORT, convertFloatToUInt: true}
        ];

        this.buffers = [
            Buffers.buildInterLeavedVBO(gl, bufferDesc),
            Buffers.buildIndexBuffer(gl, indices)
        ];

        this.indexRanges = new Int16Array(indexRanges);
    }

    /**
     * Binds the geometry data of this batch to WebGL. Must be called before drawing.
     * @param {WebGLRenderingContext} gl 
     * @param {WebGLShader} shaderProgram 
     */
    bind(gl, shaderProgram){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.UNSIGNED_SHORT, false, 16, 12);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[1]);
    }

    /**
     * Renders the mesh at the specified index of the batch.
     * Must be called after bind().
     */
    draw(gl, shaderProgram, index, modelViewMatrix){
        i = index * 2;
        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);
        gl.drawElements(gl.TRIANGLES, this.indexRanges[i], gl.UNSIGNED_SHORT, this.indexRanges[i+1]);
    }
}