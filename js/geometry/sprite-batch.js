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

        this.positionData = new Float32Array(size * 6 * 2);
        this.texCoordData = new Float32Array(size * 6 * 2);

        this.positionBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();

        this.sprites = new Array(size);
        this.nSprites = 0;
    }

    setSpriteSheet(gl, sheet){
        console.log(sheet);
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
        gl.useProgram(shaderProgram.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);

        this.nSprites = sprites.length;
        for(let i = sprites.length - 1; i >= 0; --i){
            let s = sprites[i];
            this.setSpritePosition(0, s.x, s.y, s.scale);
            this.setSpriteTexture(0, s.img);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoordData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attribLocations.texPosition);

        gl.drawArrays(gl.TRIANGLES, 0, 6 * this.nSprites);
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
        pd[j+2] = left; pd[j+3] = down;
        pd[j+4] = right; pd[j+5] = down;

        pd[j+6] = right; pd[j+7] = down;
        pd[j+8] = right; pd[j+9] = up;
        pd[j+10] = left; pd[j+11] = up;        
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
        tD[j+2] = left; tD[j+3] = bottom;
        tD[j+4] = right; tD[j+5] = bottom;

        tD[j+6] = right; tD[j+7] = bottom;
        tD[j+8] = right; tD[j+9] = top;
        tD[j+10] = left; tD[j+11] = top;
    }
}