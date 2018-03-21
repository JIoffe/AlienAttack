import {mat3, mat4, vec4} from 'gl-matrix'
import {VertexShaders, FragmentShaders, ShaderProgram} from './shaders';
import {MapGeometry} from './geometry/map-geometry';
import * as aa_math from './math';
import * as art from './art';
import { Skybox } from './geometry/skybox';
import { TextureUtils } from './utils/texture.utils';
import { SpriteBatch } from './geometry/sprite-batch';
import { Laser } from './geometry/fx/laser';

const MAX_SECTORS_DRAWN = 64;
const MAX_RENDER_QUEUE_SIZE = 128;

//View Frustum
const fov = 60;
const near = 0.1;
const far = 100;

const VEC3_UP = new Float32Array([0, 1, 0]);

const clipLeft = -1.0;
const clipRight = 1.0;
const cullp0 = vec4.create();

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
        
        //Initialize static buffers - TODO will be to batch
        Laser.initializeGeometry(this.gl);

        //Sprite Batch for GUI elements - not that many really
        this.guiSpriteBatch = new SpriteBatch(this.gl, 32);

        //These float32 buffer matrices are used for camera transforms
        this.modelViewMatrix = mat4.create();
        this.dynamicModelViewMatrix = mat4.create();
        this.invTranspose = mat4.create();
        this.normalMatrix = mat3.create();
        this.cameraPos = new Float32Array(3);
    }

    initialize(){
        return new Promise((resolve, reject) => {
            this.initializeShaders();
            TextureUtils.initTextures2D(this.gl, art.wallTextures)
                .then(textures => {
                    this.wallTextures = textures;
                    console.log(`Loaded ${textures.length} map textures`);

                    return this.guiSpriteBatch.setSpriteSheet(this.gl, art.gui);
                })
                .then(() => resolve());
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

        //This process is intentionally simple
        //Javascript is slow. Overly aggressive culling will cost more than just drawing everything
        this.pvsSectorSet.clear();

        const walls = scene.mapData.walls,
            sectors = scene.mapData.sectors,
            _this = this;


        //We most likely want to draw the sector we're in :)
        let i = 1;
        this.sectorRenderQueue[0] = scene.playerSectorIndex;
        this.pvsSectorSet.add(scene.playerSectorIndex);
        traversePVSNeighbors(scene.playerSectorIndex)

        function traversePVSNeighbors(sectorIndex){
            let sector = sectors[sectorIndex];
            //Fetch interesting sectors 
            let neighbors = sector.getNeighboringSectors(walls);
            for(let k = neighbors.length - 1; k >= 0; --k){
                let neighborIndex = neighbors[k];
                if(_this.pvsSectorSet.has(neighborIndex))
                    continue;

                let neighbor = sectors[neighborIndex],
                    isPV = false;

                //Transform relevant portals to clip space
                for(let j = neighbor.wallptr + neighbor.wallnum - 1; j >= neighbor.wallptr; --j){
                    let wall = walls[j];
                    if(wall.nextsector !== sectorIndex)
                        continue;

                    cullp0[0] = wall.x; cullp0[1] = scene.playerPos[1]; cullp0[2] = wall.y; cullp0[3] = 1.0;
                    vec4.transformMat4(cullp0, cullp0, _this.modelViewMatrix);

                    let clip0x = cullp0[0] / cullp0[3],
                        clip0w = cullp0[3];

                    let nextWall = walls[wall.point2];
                    cullp0[0] = nextWall.x; cullp0[1] = scene.playerPos[1]; cullp0[2] = nextWall.y; cullp0[3] = 1.0;
                    vec4.transformMat4(cullp0, cullp0, _this.modelViewMatrix);

                    let clip1x = cullp0[0] / cullp0[3];

                    if(clip0w > 0 || cullp0[3] > 0){
                        isPV = true;
                        break;
                    }
                }

                if(isPV){
                    _this.sectorRenderQueue[i++] = neighborIndex;
                    _this.pvsSectorSet.add(neighborIndex);
                    traversePVSNeighbors(neighborIndex);
                }
            }
        }

        this.nSectorsToDraw = i;
    }
    renderFrame(scene){
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

        //Pre-multiply the projection matrix
        mat4.multiply(this.modelViewMatrix, this.projectionMatrix, this.modelViewMatrix);

        //Now that we have our View/Projection matrix we're able to clip portals against clip space
        this.determineRenderQueue(scene);

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

        //Draw sprites and effects
        for(let i = scene.laserBlasts.length - 1; i >= 0; --i){
            let lb = scene.laserBlasts[i];
            mat4.fromRotationTranslation(this.dynamicModelViewMatrix, lb.rot, lb.pos);
            mat4.multiply(this.dynamicModelViewMatrix, this.modelViewMatrix, this.dynamicModelViewMatrix);
            this.draw(Laser.renderable, this.wallTextures[0], null, true);
        }

        //Draw GUI - weapon, health, etc.
        gl.disable(gl.DEPTH_TEST);
        this.guiSpriteBatch.draw(gl, this.shaderPrograms[2], scene.guiSprites);
        gl.enable(gl.DEPTH_TEST);
    }

    draw(renderable, texture, cubemap, dynamic){
        const gl = this.gl,
              shaderProgram = this.shaderPrograms[renderable.shader];
              
        gl.useProgram(shaderProgram.program);
        if(shaderProgram.uniformLocations.modelViewProj != null)
            gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, !!dynamic ? this.dynamicModelViewMatrix : this.modelViewMatrix);
        
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

        if(!!renderable.color)
            gl.uniform4fv(shaderProgram.attribLocations.color, renderable.color);

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
            new ShaderProgram(gl, VertexShaders.walls, FragmentShaders.walls),
            new ShaderProgram(gl, VertexShaders.gui, FragmentShaders.gui),
            new ShaderProgram(gl, VertexShaders.particle, FragmentShaders.gui),
            new ShaderProgram(gl, VertexShaders.notex, FragmentShaders.solidcolor)
        ];
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