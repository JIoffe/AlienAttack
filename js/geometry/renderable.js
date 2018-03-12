import { Buffers } from "./buffers";

export class Renderable{
    constructor(gl, vertices, indices, texCoords, normals ){
        this.vertexCount = vertices.length / 3;
        this.indexCount = indices.length;

        this.buffers = {
            vertices: Buffers.buildDataBuffer(gl, vertices),
            texCoords: Buffers.buildDataBuffer(gl, texCoords),
            normals: Buffers.buildDataBuffer(gl, normals),
            indices: Buffers.buildIndexBuffer(gl, indices)
        };
    }
}