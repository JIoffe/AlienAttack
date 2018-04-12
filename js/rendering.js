import {mat3, mat4, vec4, vec3} from 'gl-matrix'
import {VertexShaders, FragmentShaders, ShaderProgram} from './shaders';
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

        this.skybox = new Skybox(this.gl);
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

        //Always enable essential attributes for position and texCoords
        this.gl.enableVertexAttribArray(0);
        this.gl.enableVertexAttribArray(1);
    }

    initialize(){
        return new Promise((resolve, reject) => {
            this.initializeShaders();

            TextureUtils
                .initCubemap(this.gl, TextureUtils.getCubemapPaths(art.skyBox))
                .then(skyboxTex => {
                    this.skyboxTex = skyboxTex;

                    return TextureUtils.initTextures2D(this.gl, art.wallTextures, true, true);
                })
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

    renderFrame(scene){
        const gl = this.gl;
        gl.clear(gl.DEPTH_BUFFER_BIT);

        aa_math.buildCameraEyeMatrix(this.modelViewMatrix, scene.playerPos, scene.playerRotation);

        //The 3x3 inverse transpose of the MV matrix can transform normals
        mat4.transpose(this.invTranspose, this.modelViewMatrix);
        mat4.invert(this.invTranspose, this.invTranspose);
        mat3.fromMat4(this.normalMatrix, this.invTranspose);

        //Pre-multiply the projection matrix
        mat4.multiply(this.modelViewMatrix, this.projectionMatrix, this.modelViewMatrix);

        //Now that we have our View/Projection matrix we're able to clip portals against clip space...
        this.skybox.draw(gl, this.shaderPrograms[0], this.skyboxTex, this.modelViewMatrix, this.normalMatrix);
        scene.map.draw(gl, this.modelViewMatrix, this.shaderPrograms[1], this.wallTextures);


        //Draw sprites and effects
        // for(let i = scene.laserBlasts.length - 1; i >= 0; --i){
        //     let lb = scene.laserBlasts[i];
        //     mat4.fromRotationTranslation(this.dynamicModelViewMatrix, lb.rot, lb.pos);
        //     mat4.multiply(this.dynamicModelViewMatrix, this.modelViewMatrix, this.dynamicModelViewMatrix);
        //     this.draw(Laser.renderable, this.wallTextures[0], null, true);
        // }

        //Draw GUI - weapon, health, etc.
        gl.disable(gl.DEPTH_TEST);
        this.guiSpriteBatch.draw(gl, this.shaderPrograms[2], scene.guiSprites);
        gl.enable(gl.DEPTH_TEST);
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

        return gl;
    }
}