import { TextureUtils } from "../utils/texture.utils";

export class SpriteBatch{
    /**
     * Initializes a sprite batch with the given maximum size
     * @param {*} gl 
     * @param {number} size 
     */
    constructor(gl, size){
        this.displayRatio = gl.viewportWidth / gl.viewportHeight;
        this.size = size;

        this.positionData = new Float32Array(size * 4 * 2);
        this.texCoordData = new Float32Array(size * 4 * 2);

        this.positionBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();

        this.sprites = new Array(size);
        this.nSprites = 0;

        this.ibo = this.generateIndexBufferObject(gl, size);
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

    draw(gl, shaderProgram, sprites){
        const n = sprites.length;

        gl.useProgram(shaderProgram.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);

        for(let i = n - 1; i >= 0; --i){
            const s = sprites[i];
            this.setSpritePosition(0, s.x, s.y, s.scale);
            this.setSpriteTexture(0, s.img);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoordData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
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