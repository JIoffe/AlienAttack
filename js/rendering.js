import {mat3, mat4} from 'gl-matrix'
import {VertexShaders, FragmentShaders, ShaderProgram} from './shaders';
import {MapGeometry} from './geometry/map-geometry';
import * as aa_math from './math';
import * as art from './art';
import { Skybox } from './geometry/skybox';
import { TextureUtils } from './utils/texture.utils';

const MAX_SECTORS_DRAWN = 64;
const MAX_RENDER_QUEUE_SIZE = 128;

//View Frustum
const fov = 45;
const near = 0.1;
const far = 100;
const far_squared = far * far;
const frustum_dot = Math.cos(aa_math.Constants.DegToRad * fov);
const frustum_half_dot = Math.cos(aa_math.Constants.DegToRad * (fov/2));

const VEC3_UP = new Float32Array([0, 1, 0]);

const cullingEpsilon = 0.05;
const cullingDot = frustum_half_dot - cullingEpsilon;

export class Renderer{
    constructor(canvas){
        this.gl = this.getGLRenderingContext(canvas);
        const w = this.gl.viewportWidth;
        const h = this.gl.viewportHeight;
        this.projectionMatrix = aa_math.buildProjectionMatrix(fov, w, h, near, far);

        this.skybox = new Skybox(this.gl, art.skyBox);
        this.sectorRenderQueue = new Int32Array(MAX_SECTORS_DRAWN);
        this.pvsSectorSet = new Set();
        this.nSectorsToDraw = 0;

        //These float32 buffer matrices are used for camera transforms
        this.modelViewMatrix = mat4.create();
        this.invTranspose = mat4.create();
        this.normalMatrix = mat3.create();
        this.cameraPos = new Float32Array(3);
    }

    initialize(){
        return new Promise((resolve, reject) => {
            this.initializeShaders();
            this.initializeTextures(art.wallTextures)
                .then(() => console.log('Renderer Initialized') || resolve());
        });
    }

    get isReady(){
        return !!this.gl 
            && (!!this.shaderPrograms && this.shaderPrograms.every(p => p.isReady));
    }

    setMap(mapData){
        this.mapGeometry = new MapGeometry(this.gl, mapData);
    }

    determineRenderQueue(scene){
        if(scene.playerSectorIndex < 0){
            //We're out of bounds - don't draw anything. An alternative would be to draw everything :)
            this.nSectorsToDraw = 0;
            return;
        }

        this.pvsSectorSet.clear();

        const walls = scene.mapData.walls,
            sectors = scene.mapData.sectors,
            _this = this;

        //Determine -view normal
        let viewNormX = -Math.sin(scene.playerRotation),
            viewNormZ = -Math.cos(scene.playerRotation);

        //We most likely want to draw the sector we're in :)
        let i = 1;
        this.sectorRenderQueue[0] = scene.playerSectorIndex;

        traversePVSNeighbors(sectors[scene.playerSectorIndex]);

        function traversePVSNeighbors(sector){
            let neighbors = sector.getNeighboringSectors(walls);
            for(let k = neighbors.length - 1; k >= 0; --k){
                let neighbor = neighbors[k];
                if(_this.pvsSectorSet.has(neighbor))
                    continue;

                //Mark this as traversed
                _this.pvsSectorSet.add(neighbor);
                
                let bounds = sectors[neighbor].getBounds(walls);
    
                //Is the AABB of the sector within the (clipped) viewing cone?
                for(let l = bounds.points.length - 1; l >= 0; --l){
                    let viewToPointX = bounds.points[l].x - scene.playerPos[0],
                    viewToPointZ = bounds.points[l].y - scene.playerPos[2];
    
                    let w = Math.sqrt(viewToPointX*viewToPointX + viewToPointZ*viewToPointZ);
                    viewToPointX /= w;
                    viewToPointZ /= w;
    
                    if(viewToPointX * viewNormX + viewToPointZ * viewNormZ >= cullingDot){
                        _this.sectorRenderQueue[i++] = neighbor;
                        traversePVSNeighbors(sectors[neighbor]);
                        break;
                    }
                }
            }
        }
        
        this.nSectorsToDraw = i;
    }
    renderFrame(scene){
        this.determineRenderQueue(scene);

        const gl = this.gl;
        gl.clear(gl.DEPTH_BUFFER_BIT);
        
        this.cameraPos[0] = -scene.playerPos[0];
        this.cameraPos[1] = -scene.playerPos[1];
        this.cameraPos[2] = -scene.playerPos[2];
        mat4.fromRotation(this.modelViewMatrix, -scene.playerRotation, VEC3_UP)
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, this.cameraPos);

        //The 3x3 inverse transpose of the MV matrix can transform normals
        mat4.transpose(this.invTranspose, this.modelViewMatrix);
        mat4.invert(this.invTranspose, this.invTranspose);
        mat3.fromMat4(this.normalMatrix, this.invTranspose);

        //Draw Skybox
        gl.disable(gl.DEPTH_TEST);
        this.draw(this.skybox.renderable, null, this.skybox.renderable.texture);
        gl.enable(gl.DEPTH_TEST);
        

        //Draw all the (potentially) visible sectors - walls first. Walls are more likely to occlude floors/ceilings
        for(let i = this.nSectorsToDraw - 1; i >= 0; --i){
            let sector = this.mapGeometry.sectors[this.sectorRenderQueue[i]],
                r;

            for(let j = sector.renderableWalls.length - 1; j >= 0; --j){
                r = sector.renderableWalls[j];
                this.draw(r, this.wallTextures[r.picnum]);
            }

            r = sector.renderableFloor;
            this.draw(r, this.wallTextures[r.picnum]);

            r = sector.renderableCeiling;
            this.draw(r, this.wallTextures[r.picnum]);
        }
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

        return new Promise((resolve, reject) => {
            let imgPromises = wallImages
                .map(path => {
                    return new Promise((resolve, reject) => {
                        const tex = gl.createTexture();

                        let image = new Image();
                        image.onload = () =>{
                            gl.bindTexture(gl.TEXTURE_2D, tex);
                            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                            // Uncomment for mipmapping
                            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);					
                            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                            // gl.generateMipmap(gl.TEXTURE_2D);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);					
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                            gl.bindTexture(gl.TEXTURE_2D, null); 
                            
                            gl.bindTexture(gl.TEXTURE_2D, null); 
                            
                            resolve(tex);
                        }

                        image.src = path;
                    });
                });

            Promise.all(imgPromises)
                .then(result => {
                    console.log(result);
                    this.wallTextures = result;
                    resolve();
                });
        });
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
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        //Set clear color to black even though it will likely never be used
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        return gl;
    }
}