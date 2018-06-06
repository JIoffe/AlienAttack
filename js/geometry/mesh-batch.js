import { Buffers } from "./buffers";

/**
 * Batches a group of meshes to share data buffers
 */
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
            if(!!mesh.vertices && !!mesh.vertices.length){
                vertices = vertices.concat(mesh.vertices);
            }else{
                console.error('Missing vertex position data ', mesh);
            }

            if(!!mesh.indices && !!mesh.indices.length){
                indexRanges.push(mesh.indices.length, indices.length);
                indices = indices.concat(mesh.indices);
            }else{
                console.error('Missing face index data ', mesh);
            }

            if(!!mesh.texCoords && !!mesh.texCoords.length){
                texCoords = texCoords.concat(mesh.texCoords);
            }

            // if(!!mesh.normals && !!mesh.normals.length){
            //     normals = normals.concat(mesh.normals);
            // }
        });

        this.buffers = [
            Buffers.buildDataBuffer(gl, vertices),
            Buffers.buildDataBuffer(gl, texCoords),
            Buffers.buildIndexBuffer(gl, indices)
        ];

        this.indexRanges = new Int32Array(indexRanges);
    }

    /**
     * Binds the geometry data of this batch to WebGL. Must be called before drawing.
     * @param {WebGLRenderingContext} gl 
     * @param {WebGLShader} shaderProgram 
     */
    bind(gl, shaderProgram){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[1]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[2]);
    }

    /**
     * Renders the mesh at the specified index of the batch.
     * Must be called after bind().
     */
    draw(gl, shaderProgram, index, modelViewMatrix){
        const i = index * 2;
        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);
        gl.drawElements(gl.TRIANGLES, this.indexRanges[i], gl.UNSIGNED_SHORT, this.indexRanges[i+1]);
    }
}