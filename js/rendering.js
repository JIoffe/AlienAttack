import {mat3, mat4} from 'gl-matrix'
import {VertexShaders, FragmentShaders, ShaderProgram} from './shaders';
import {MapGeometry} from './geometry/map-geometry';
import * as aa_math from './math';
import * as art from './art';
import { Skybox } from './geometry/skybox';
import { TextureUtils } from './utils/texture.utils';

class Renderer{
    constructor(canvas){
        this.gl = this.getGLRenderingContext(canvas);
        this.initializeShaders();
        this.initializeTextures(art.wallTextures);

        const w = this.gl.viewportWidth;
        const h = this.gl.viewportHeight;
        this.projectionMatrix = aa_math.buildProjectionMatrix(45, w, h, 0.1, 1000);

        this.skybox = new Skybox(this.gl, art.skyBox);
    }

    get isReady(){
        return !!this.gl 
            && (!!this.shaderPrograms && this.shaderPrograms.every(p => p.isReady));
    }

    setMap(mapData){
        this.mapGeometry = new MapGeometry(this.gl, mapData);
        this.renderQueue = this.mapGeometry
            .sectors
            .reduce((a,c) => a.concat(c.renderableWalls), []);

        this.mapGeometry.sectors.forEach(s => {
            if(!!s.renderableFloor)
                this.renderQueue.push(s.renderableFloor);

            if(!!s.renderableCeiling)
                this.renderQueue.push(s.renderableCeiling);
        });
    }

    renderFrame(scene){
        const gl = this.gl;
        gl.clear(gl.DEPTH_BUFFER_BIT);
        
        //Extract "View matrix" based on player position and orientation
        this.modelViewMatrix = mat4.create();
        //const modelViewMatrix = aa_math.buildCameraEyeMatrix(scene.playerPos, scene.playerRotation);
        mat4.rotateY(this.modelViewMatrix, this.modelViewMatrix, -scene.playerRotation);
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [
            -scene.playerPos[0],
            -scene.playerPos[1],
            -scene.playerPos[2]
        ]);

        //The 3x3 inverse transpose of the MV matrix can transform normals
        let invTranspose = mat4.create();
        mat4.transpose(invTranspose, this.modelViewMatrix);
        //mat4.invert(invTranspose, invTranspose);

        this.normalMatrix = mat3.create();
        mat3.fromMat4(this.normalMatrix, invTranspose);


        //Draw Skybox
        gl.disable(gl.DEPTH_TEST);
        this.draw(this.skybox.renderable, null, this.skybox.renderable.texture);
        gl.enable(gl.DEPTH_TEST);

        if(!this.renderQueue)
            return;
        

        this.renderQueue.forEach(renderable => {
            let texture = this.wallTextures[renderable.picnum];
            this.draw(renderable, texture); 
        });
    }

    draw(renderable, texture, cubemap){
        const gl = this.gl,
              shaderProgram = this.shaderPrograms[renderable.shader];
              
        gl.useProgram(shaderProgram.program);
        if(shaderProgram.uniformLocations.projectionMatrix != null)
            gl.uniformMatrix4fv(shaderProgram.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        
        if(shaderProgram.uniformLocations.modelViewMatrix != null)
            gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewMatrix, false, this.modelViewMatrix);
        
        if(shaderProgram.uniformLocations.normalMatrix != null)
            gl.uniformMatrix3fv(shaderProgram.uniformLocations.normalMatrix, false, this.normalMatrix);

        if(shaderProgram.uniformLocations.shade != null)
            gl.uniform1f(shaderProgram.uniformLocations.shade, renderable.shade);

        gl.bindBuffer(gl.ARRAY_BUFFER, renderable.buffers.vertices);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attribLocations.vertexPosition);

        if(!!renderable.buffers.texCoords){
            gl.bindBuffer(gl.ARRAY_BUFFER, renderable.buffers.texCoords);
            gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shaderProgram.attribLocations.texPosition);
        }

        if(!!renderable.buffers.normals){
            gl.bindBuffer(gl.ARRAY_BUFFER, renderable.buffers.normals);
            gl.vertexAttribPointer(shaderProgram.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shaderProgram.attribLocations.normalPosition);
        }

        gl.activeTexture(gl.TEXTURE0);
        if(!!cubemap){
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap);
            gl.uniform1i(shaderProgram.uniformLocations.samplerCube, 0);
        }

        if(!!texture){
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.buffers.indices);
        gl.drawElements(gl.TRIANGLES, renderable.indexCount, gl.UNSIGNED_SHORT, 0)
    }
    
    //Utility Methods
    initializeShaders(){
        const gl = this.gl;

        this.shaderPrograms = [
            new ShaderProgram(gl, VertexShaders.skybox, FragmentShaders.skybox),
            new ShaderProgram(gl, VertexShaders.walls, FragmentShaders.walls)
        ];
    }

    initializeTextures(wallImages){
        const gl = this.gl;

        this.wallTextures = new Array(wallImages.length);
        for(let i = 0; i < wallImages.length; ++i){
            const tex = gl.createTexture();
            this.wallTextures[i] = tex;

            let image = new Image();
            image.onload = () =>{
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);					
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                gl.generateMipmap(gl.TEXTURE_2D);
                
                gl.bindTexture(gl.TEXTURE_2D, null);                
            }
            image.src = wallImages[i];
        }
    }

    getGLRenderingContext(canvas){
        var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if(!gl){
            return null;
        }

        gl.viewportWidth = canvas.getAttribute('width');
        gl.viewportHeight = canvas.getAttribute('height');
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // gl.enable(gl.CULL_FACE);
        // gl.cullFace(gl.BACK);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        return gl;
    }
}

export {Renderer}