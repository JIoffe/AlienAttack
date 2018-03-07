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

class Buffers{
    static buildDataBuffer(gl, data){
        if(!data)
            return null;

        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data),gl.STATIC_DRAW);
        return buffer;
    }

    static buildIndexBuffer(gl, indices){
        if(!indices)
            return null;

        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        return buffer;
    }
}