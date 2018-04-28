import { TextureUtils } from "../utils/texture.utils";

export class SpriteBatch{
    constructor(size, vDataSize = 2){
        this.size = size;

        this.positionData = new Float32Array(size * 4 * vDataSize);
        this.texCoordData = new Float32Array(size * 4 * 2);

        this.nSprites = 0;
    }

    initialize(gl){
        this.displayRatio = gl.viewportWidth / gl.viewportHeight;

        this.buffers = [
            gl.createBuffer(),
            gl.createBuffer(),
            this.generateIndexBufferObject(gl, this.size)
        ];
    }
    generateIndexBufferObject(gl, size){;
        const indices = new Array(size * 6);
        for(let i = 0; i < size; ++i){
            const indexStride = i * 6;
            const vertexStride = i * 4;
            
            indices[indexStride] = vertexStride + 2;
            indices[indexStride+1] = vertexStride + 1;
            indices[indexStride+2] = vertexStride;
            indices[indexStride+3] = vertexStride + 3;
            indices[indexStride+4] = vertexStride + 2;
            indices[indexStride+5] = vertexStride;
        }

        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        return ibo;
    }

    setSpriteSheet(gl, sheet){
        let keys = Object.keys(sheet.def.images);
        let images = keys.map(k => sheet.def.images[k]);

        this.def = {
            keys: keys,
            images: images
        }

        return new Promise((resolve, reject) => {
            TextureUtils.initTexture2D(gl, sheet.path)
                .then(tex => {
                    this.tex = tex;
                    resolve();
                })
        });
    }

    draw(gl, modelViewMatrix, shaderProgram, texture){
        if(this.nSprites === 0)
            return;

        gl.useProgram(shaderProgram.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);

        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]);
        gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[1]);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoordData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[2]);
        gl.drawElements(gl.TRIANGLES, this.size * 6, gl.UNSIGNED_SHORT, 0);
    }

    setSpritePosition(i, x, y, scale){
        const j = i * 12,
            pd = this.positionData;
        
        const xOffset = scale / 2,
            yOffset = xOffset * this.displayRatio,
            up = y + yOffset,
            down = y - yOffset,
            right = x + xOffset,
            left = x - xOffset;

        pd[j] = left; pd[j+1] = up;
        pd[j+2] = right; pd[j+3] = up;
        pd[j+4] = right; pd[j+5] = down;
        pd[j+6] = left; pd[j+7] = down;     
    }

    setSpriteTexture(i, tex){
        const j = i * 12,
            img = this.def.images[tex],
            tD = this.texCoordData,
            left = img.xStart,
            right = img.xEnd,
            top = img.yStart,
            bottom = img.yEnd;

        tD[j] = left; tD[j+1] = top;
        tD[j+2] = right; tD[j+3] = top;
        tD[j+4] = right; tD[j+5] = bottom;
        tD[j+6] = left; tD[j+7] = bottom;
    }
}