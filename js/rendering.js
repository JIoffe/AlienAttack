import {mat3, mat4, vec4, vec3, quat} from 'gl-matrix'
import {VertexShaders, FragmentShaders, ShaderProgram} from './shaders';
import * as aa_math from './math';
import * as art from './art';
import { Skybox } from './geometry/skybox';
import { TextureUtils } from './utils/texture.utils';
import { Laser } from './geometry/fx/laser';
import { MeshReader } from './io/mesh-reader';
import { addAnimatedGeometry } from './geometry/animated-mesh-repository';
import { RendererBase } from './rendering/renderer.base';
import { Renderable } from './geometry/renderable';
import { MeshBatch } from './geometry/mesh-batch';

const MAX_SECTORS_DRAWN = 64;
const MAX_RENDER_QUEUE_SIZE = 128;

//SHADOW MAP SETTINGS
const SHADOWMAP_WIDTH = 1024;
const SHADOWMAP_HEIGHT = 1024;
const SHADOWMAP_RANGE = 15;

//View Frustum
const fov = 60;
const near = 0.1;
const far = 100;

//Iterator variables
var projectile, program, enemy;
let i;

var gl;

export class Renderer extends RendererBase{
    constructor(canvas){
        super(canvas);
        this.projectionMatrix = this.buildProjectionMatrix(this.gl, fov, near, far);

        this.shadowMapProjectionMatrix = mat4.create();
        this.shadowMapViewMatrix = mat4.create();
        mat4.ortho(this.shadowMapProjectionMatrix, -SHADOWMAP_RANGE, SHADOWMAP_RANGE, -SHADOWMAP_RANGE, SHADOWMAP_RANGE, 1, 100);

        this.skybox = new Skybox(this.gl);
        this.sectorRenderQueue = new Int32Array(MAX_SECTORS_DRAWN);
        this.pvsSectorSet = new Set();
        this.nSectorsToDraw = 0;
        
        //Initialize static buffers - TODO will be to batch
        Laser.initializeGeometry(this.gl);
        this.projectileGeometries = [
          Laser.renderable  
        ];

        this.meshReader = new MeshReader();

        this.meshBatches = [];

        gl = this.gl;
    }

    initialize(){
        return new Promise((resolve, reject) => {
            this.initializeShaders();
            this.initializeShadowMapFrameBuffer();

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
            const promises = [
                this.initializePOVWeaponMeshes(art.player_weapons),
                this.downloadAnimatedMeshes(art.scene_mesh_list),
                this.downloadMeshBatch(art.prop_batch_mesh_list)
                    .then(mb => this.propBatch = mb)
            ];
            Promise.all(promises)
                .then(() => {
                    delete this.meshReader;
                    resolve();
                });
        });
    }

    initializePOVWeaponMeshes(weaponDefinitions){
        this.povWeaponTex = weaponDefinitions
            .map(def => def.povMesh.tex);

        return new Promise((resolve, reject) => {
            var promises = weaponDefinitions
                .map(def => this.meshReader.download(def.povMesh)
                    .then(m => new Renderable(this.gl, m.vertices, m.indices, m.texCoords, m.normals)));

            Promise.all(promises)
                .then(povMeshRenderables => {
                    this.povWeaponMeshes = povMeshRenderables;
                    resolve();
                });
        });
    }

    downloadMeshBatch(batch){
        return new Promise((resolve, reject) => {
            const promises = batch.map(def => this.meshReader.download(def));
            
            Promise.all(promises)
                .then(meshes => {
                    resolve(new MeshBatch(gl, meshes));
                });
        });
    }

    downloadAnimatedMeshes(animatedMeshList){
        return new Promise((resolve, reject) => {
            const promises = animatedMeshList.map(def => this.meshReader.download(def));

            Promise.all(promises).then(meshes => {
                meshes.forEach(m => addAnimatedGeometry(gl, m));
                resolve();
            });
        });
    }

    initializeMeshList(listName){
        return new Promise((resolve, reject) => {
            const promises = art[listName].map(meshDef => this.meshReader.read(gl, meshDef));

            Promise.all(promises).then(meshes => {
                this[listName] = meshes;
                resolve();
            });
        });        
    }

    get isReady(){
        return !!this.gl 
            && (!!this.shaderPrograms && this.shaderPrograms.every(p => p.isReady));
    }

    renderFrame(scene, time){
        //Draw shadow map first
        this.renderShadowMap(scene);

        //Continue with primary rendering
        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        aa_math.buildCameraEyeMatrix(this.modelViewMatrix, scene.player.eye, scene.player.rot);

        //The 3x3 inverse transpose of the MV matrix can transform normals
        mat4.transpose(this.invTranspose, this.modelViewMatrix);
        mat3.fromMat4(this.normalMatrix, this.invTranspose);

        //Pre-multiply the projection matrix
        mat4.multiply(this.modelViewMatrix, this.projectionMatrix, this.modelViewMatrix);

        //Now that we have our View/Projection matrix we're able to clip portals against clip space...
        this.skybox.draw(gl, this.shaderPrograms[0], this.skyboxTex, this.modelViewMatrix, this.normalMatrix);
        scene.map.draw(gl, this.modelViewMatrix, this.shaderPrograms[1], this.wallTextures, this.shadowMapViewMatrix, this.shadowFB.frameBufferDepthTex);

        if(scene.enemies.length > 0){
            program = this.shaderPrograms[7];
            gl.useProgram(program.program);

            for(i = 0; i < scene.enemies.length; ++i){
                enemy = scene.enemies[i];
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.meshTextures[enemy.enemyDefinition.tex]);
                gl.uniform1i(program.uniformLocations.sampler, 0);

                mat4.fromRotationTranslation(this.dynamicModelViewMatrix, enemy.rot, enemy.pos);
                mat4.multiply(this.dynamicModelViewMatrix, this.modelViewMatrix, this.dynamicModelViewMatrix);
                enemy.draw(gl, program, this.dynamicModelViewMatrix);
            }
        }

        if(scene.props.length > 0){
            program = this.shaderPrograms[9];
            gl.useProgram(program.program);

            this.propBatch.bind(gl, program);

            for(i = 0; i < scene.props.length; ++i){
                let prop = scene.props[i];

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.meshTextures[art.prop_batch_mesh_list[prop.i].tex]);
                gl.uniform1i(program.uniformLocations.sampler, 0);

                mat4.fromRotationTranslation(this.dynamicModelViewMatrix, prop.rot, prop.pos);
                mat4.multiply(this.dynamicModelViewMatrix, this.modelViewMatrix, this.dynamicModelViewMatrix);
                this.propBatch.draw(gl, program, prop.i, this.dynamicModelViewMatrix);
            }
        }

        if(scene.nProjectiles > 0){
            program = this.shaderPrograms[4];
            gl.useProgram(program.program);

            const renderable = this.projectileGeometries[scene.projectiles[0].type];
            gl.bindBuffer(gl.ARRAY_BUFFER, renderable.buffers.vertices);
            gl.vertexAttribPointer(program.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

            gl.uniform4fv(program.attribLocations.color, renderable.color);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.buffers.indices);
            
            for(i = 0; i < scene.nProjectiles; ++i){
                projectile = scene.projectiles[i];

                mat4.fromRotationTranslation(this.dynamicModelViewMatrix, projectile.rot, projectile.pos);
                mat4.multiply(this.dynamicModelViewMatrix, this.modelViewMatrix, this.dynamicModelViewMatrix);
                gl.uniformMatrix4fv(program.uniformLocations.modelViewProj, false, this.dynamicModelViewMatrix);

                gl.drawElements(gl.TRIANGLES, renderable.indexCount, gl.UNSIGNED_SHORT, 0)
            }
        }
        
        //Particles and decales do not write to the depth buffer
        gl.depthMask(false);
        scene.decalSystem.draw(gl, this.modelViewMatrix, this.shaderPrograms[6], this.particleTextures[0]);

        //Shinies and other effects
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
        scene.particleSystem.draw(gl, this.shaderPrograms[3], this.particleTextures[0], this.modelViewMatrix);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);

        //Draw FPS weapon
        gl.clear(gl.DEPTH_BUFFER_BIT);
        program = this.shaderPrograms[5];
        gl.useProgram(program.program);

        mat4.fromRotationTranslation(this.dynamicModelViewMatrix, scene.weaponRecoil, scene.weaponOffset);
        mat4.multiply(this.dynamicModelViewMatrix, this.projectionMatrix, this.dynamicModelViewMatrix);

        quat.multiply(aa_math.QUAT_TEMP, scene.weaponRecoil, scene.player.rot);
        mat4.fromQuat(this.invTranspose, aa_math.QUAT_TEMP);
        mat3.fromMat4(this.normalMatrix, this.invTranspose);

        this.povWeaponMeshes[scene.player.activeWeapon]
            .draw(gl, program, this.meshTextures[this.povWeaponTex[scene.player.activeWeapon]], this.envTex, this.dynamicModelViewMatrix, this.normalMatrix);
        //Draw GUI - weapon, health, etc.
        // gl.disable(gl.DEPTH_TEST);
        // this.guiSpriteBatch.draw(gl, this.shaderPrograms[2], scene.guiSprites);
        // gl.enable(gl.DEPTH_TEST);
    }

    renderShadowMap(scene){
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFB.frameBuffer);
        gl.viewport(0, 0, SHADOWMAP_WIDTH, SHADOWMAP_HEIGHT);

        //Only clear the depth buffer since we're directly referencing it for shadows
        gl.clear(gl.DEPTH_BUFFER_BIT);

        var pos = scene.player.pos;
        mat4.lookAt(this.shadowMapViewMatrix, [20 + pos[0], 35 + pos[1], 36 + pos[2]], [pos[0],pos[1]+5,pos[2]], [0,1,0]);       
        mat4.multiply(this.shadowMapViewMatrix, this.shadowMapProjectionMatrix, this.shadowMapViewMatrix);

        program = this.shaderPrograms[8];
        gl.useProgram(program.program);

        for(i = 0; i < scene.enemies.length; ++i){
            enemy = scene.enemies[i];
            mat4.fromRotationTranslation(this.dynamicModelViewMatrix, enemy.rot, enemy.pos);
            mat4.multiply(this.dynamicModelViewMatrix, this.shadowMapViewMatrix, this.dynamicModelViewMatrix);
            enemy.draw(gl, program, this.dynamicModelViewMatrix);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    //Utility Methods
    initializeShaders(){
        this.shaderPrograms = [
            new ShaderProgram(gl, VertexShaders.skybox, FragmentShaders.skybox),
            new ShaderProgram(gl, VertexShaders.walls, FragmentShaders.walls),
            new ShaderProgram(gl, VertexShaders.gui, FragmentShaders.gui),
            new ShaderProgram(gl, VertexShaders.particle, FragmentShaders.particle),
            new ShaderProgram(gl, VertexShaders.notex, FragmentShaders.solidcolor),
            new ShaderProgram(gl, VertexShaders.texturedWithNormals, FragmentShaders.reflective),
            new ShaderProgram(gl, VertexShaders.decal, FragmentShaders.decal),
            new ShaderProgram(gl, VertexShaders.skinnedUnlit, FragmentShaders.gui),
            new ShaderProgram(gl, VertexShaders.skinnedUnlit, FragmentShaders.no_output),  //For rendering to shadowmap
            new ShaderProgram(gl, VertexShaders.unlit, FragmentShaders.gui)
        ];
    }

    initializeShadowMapFrameBuffer(){
        this.shadowFB = this.buildShadowMapFrameBuffer(this.gl, SHADOWMAP_WIDTH, SHADOWMAP_HEIGHT);
    }
}