export class TextureUtils{
    static initCubemap(gl, texPaths){
        return new Promise((resolve, reject) => {
            let texture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            let faceTargets = [gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
                gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];

            let imgPromises = texPaths
                .map((path, i) => new Promise((resolve, reject) => {
                    let img = new Image();
                    img.onload = () => {
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                        
                        gl.texImage2D(faceTargets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);   
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                        resolve();
                    }
                    img.src = path;
                }));

            Promise.all(imgPromises).then(() => resolve(texture));
        });
    }

    static initTextures2D(gl, texPaths){
        return new Promise((resolve, reject) => {
            let imgPromises = texPaths.map(path => this.initTexture2D(gl, path));
            Promise.all(imgPromises).then(results => resolve(results));
        });
    }

    static initTexture2D(gl, texPath){
        return new Promise((resolve, reject) => {
            const tex = gl.createTexture(),
                  image = new Image();
                  
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.getMirroredImageData(image));
                // Uncomment for mipmapping
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);					
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                // gl.generateMipmap(gl.TEXTURE_2D);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);					
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.bindTexture(gl.TEXTURE_2D, null); 
                
                gl.bindTexture(gl.TEXTURE_2D, null); 
                
                resolve(tex);
            };

            image.src = texPath;
        });
    }

    /**
     * Flips image data along the Y axis to fit WebGL better
     * @param {HTMLImageElement} image 
     */
    static getMirroredImageData(image){
        const canvas = document.getElementById('cbuffer');
        const w = image.width,
            h = image.height;
        
        canvas.setAttribute('width', w + '');
        canvas.setAttribute('height', h + '');

        const ctx = canvas.getContext('2d');
        ctx.translate(0, h);
        ctx.scale(1, -1);
        ctx.drawImage(image, 0, 0);

        let id = ctx.getImageData(0, 0, w, h);
        console.log(id);
        return id;
    }
}