import {mat3, mat4, vec4, vec3, quat} from 'gl-matrix'
import {VertexShaders, FragmentShaders, ShaderProgram} from './shaders';
import * as aa_math from './math';
import * as art from './art';
import { Skybox } from './geometry/skybox';
import { TextureUtils } from './utils/texture.utils';
import { Laser } from './geometry/fx/laser';
import { ObjReader } from './io/obj-reader';
import { ParticleSystem } from './physics/particle-system';

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
        this.projectileGeometries = [
          Laser.renderable  
        ];

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

            const promises = [
                this.initializeTextures(),
                this.initializeModels()
            ];

            Promise.all(promises)
                .then(() => resolve());
        });
    }

    initializeTextures(){
        return new Promise((resolve, reject) => {
            TextureUtils
                .initCubemap(this.gl, TextureUtils.getCubemapPaths(art.skyBox))
                .then(skyboxTex => {
                    this.skyboxTex = skyboxTex;

                    return TextureUtils.initCubemap(this.gl, TextureUtils.getCubemapPaths(art.envMap));
                })
                .then(envTex => {
                    this.envTex = envTex;
                    return TextureUtils.initTextures2D(this.gl, art.wallTextures, true, true);
                })
                .then(textures => {
                    this.wallTextures = textures;
                    console.log(`Loaded ${textures.length} map textures`);

                    return TextureUtils.initTextures2D(this.gl, art.mesh_texture_list, true, true);
                    // return this.guiSpriteBatch.setSpriteSheet(this.gl, art.gui);
                })
                // .then(() => TextureUtils.initTextures2D(this.gl, art.mesh_texture_list, true, true))
                .then(meshTextures => {
                    this.meshTextures = meshTextures;

                    return TextureUtils.initTextures2D(this.gl, art.particleTextures, true, true);
                })
                .then(particleTextures => {
                    this.particleTextures = particleTextures;

                    resolve();
                });
        });
    }

    initializeModels(){
        return new Promise((resolve, reject) => {
            const objReader = new ObjReader();
            
            const promises = art.mesh_list.map(path => objReader.readUrl(this.gl, path));

            Promise.all(promises).then(meshes => {
                this.meshes = meshes;
                resolve();
            });
        });
    }

    get isReady(){
        return !!this.gl 
            && (!!this.shaderPrograms && this.shaderPrograms.every(p => p.isReady));
    }

    renderFrame(scene, time){
        const gl = this.gl;
        gl.clear(gl.DEPTH_BUFFER_BIT);

        aa_math.buildCameraEyeMatrix(this.modelViewMatrix, scene.player.pos, scene.player.rot);

        //The 3x3 inverse transpose of the MV matrix can transform normals
        mat4.transpose(this.invTranspose, this.modelViewMatrix);
        mat3.fromMat4(this.normalMatrix, this.invTranspose);

        //Pre-multiply the projection matrix
        mat4.multiply(this.modelViewMatrix, this.projectionMatrix, this.modelViewMatrix);

        //Now that we have our View/Projection matrix we're able to clip portals against clip space...
        this.skybox.draw(gl, this.shaderPrograms[0], this.skyboxTex, this.modelViewMatrix, this.normalMatrix);
        scene.map.draw(gl, this.modelViewMatrix, this.shaderPrograms[1], this.wallTextures);

        if(scene.nProjectiles > 0){
            const shaderProgram = this.shaderPrograms[4];
            gl.useProgram(shaderProgram.program);

            const renderable = this.projectileGeometries[scene.projectiles[0].type];
            gl.bindBuffer(gl.ARRAY_BUFFER, renderable.buffers.vertices);
            gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

            gl.uniform4fv(shaderProgram.attribLocations.color, renderable.color);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.buffers.indices);
            
            for(let i = 0; i < scene.nProjectiles; ++i){
                let p = scene.projectiles[i];

                mat4.fromRotationTranslation(this.dynamicModelViewMatrix, p.rot, p.pos);
                mat4.multiply(this.dynamicModelViewMatrix, this.modelViewMatrix, this.dynamicModelViewMatrix);
                gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, this.dynamicModelViewMatrix);

                gl.drawElements(gl.TRIANGLES, renderable.indexCount, gl.UNSIGNED_SHORT, 0)
            }
        }
        
        gl.depthMask(false);
        scene.decalSystem.draw(gl, this.modelViewMatrix, this.shaderPrograms[6], this.particleTextures[0]);
        //Shinies and other effects
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
        scene.particleSystem.draw(gl, this.shaderPrograms[3], this.particleTextures[0], this.modelViewMatrix);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);

        //Draw FPS weapon
        {
            gl.clear(gl.DEPTH_BUFFER_BIT);
            let p = this.shaderPrograms[5];
            gl.useProgram(p.program);

            mat4.fromRotationTranslation(this.dynamicModelViewMatrix, scene.weaponRecoil, scene.weaponOffset);
            mat4.multiply(this.dynamicModelViewMatrix, this.projectionMatrix, this.dynamicModelViewMatrix);

            quat.multiply(aa_math.QUAT_TEMP, scene.weaponRecoil, scene.player.rot);
            mat4.fromQuat(this.invTranspose, aa_math.QUAT_TEMP);
            mat3.fromMat4(this.normalMatrix, this.invTranspose);

            this.meshes[0].draw(gl, p, this.meshTextures[0], this.envTex, this.dynamicModelViewMatrix, this.normalMatrix);
        }
        //Draw GUI - weapon, health, etc.
        // gl.disable(gl.DEPTH_TEST);
        // this.guiSpriteBatch.draw(gl, this.shaderPrograms[2], scene.guiSprites);
        // gl.enable(gl.DEPTH_TEST);
    }
    
    //Utility Methods
    initializeShaders(){
        const gl = this.gl;

        this.shaderPrograms = [
            new ShaderProgram(gl, VertexShaders.skybox, FragmentShaders.skybox),
            new ShaderProgram(gl, VertexShaders.walls, FragmentShaders.walls),
            new ShaderProgram(gl, VertexShaders.gui, FragmentShaders.gui),
            new ShaderProgram(gl, VertexShaders.particle, FragmentShaders.particle),
            new ShaderProgram(gl, VertexShaders.notex, FragmentShaders.solidcolor),
            new ShaderProgram(gl, VertexShaders.texturedWithNormals, FragmentShaders.reflective),
            new ShaderProgram(gl, VertexShaders.decal, FragmentShaders.decal)
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