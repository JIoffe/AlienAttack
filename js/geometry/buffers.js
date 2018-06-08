export class Buffers{
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

    static buildInterLeavedVBO(gl, bufferDesc){
        const n = bufferDesc[0].data.length / bufferDesc[0].count;
        const stride = bufferDesc.map(d => d.count * sizeof(gl, d.type)).reduce((p,c) => p + c, 0);

        const buffer = new ArrayBuffer(stride * n),
            dv = new DataView(buffer);

        for(let i = 0; i < n; ++i){
            let skip = i * stride

            bufferDesc.forEach(d => {
                for(let j = 0; j < d.count; ++j){
                    const value = d.data[i * d.count + j];

                    switch(d.type){
                        case gl.FLOAT:
                            dv.setFloat32(skip, value, true);
                            break;
                        case gl.UNSIGNED_SHORT:
                            dv.setUint16(skip, !!d.convertFloatToUInt ? value * 0xFFFF : value, true);
                            break;
                        default:
                            break;                       
                    }
                    skip += sizeof(gl, d.type);
                }
            });
        }

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);

        return vbo;
    }
}

function sizeof(gl, type){
    switch(type){
        case gl.FLOAT:
            return 4;
        case gl.UNSIGNED_SHORT:
            return 2;
        default:
            return 4;
    }
}