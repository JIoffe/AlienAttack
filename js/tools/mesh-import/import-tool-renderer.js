import { RendererBase } from "../../rendering/renderer.base";
import * as aa_math from '../../math';
import { mat4, quat } from "gl-matrix";
import { ShaderProgram, VertexShaders, FragmentShaders } from "../../shaders";
import { MeshBatch } from "../../geometry/mesh-batch";
import { TextureUtils } from "../../utils/texture.utils";
import { AnimatedMesh } from "../../geometry/animated-mesh";

const fov = 60;
const near = 0.1;
const far = 100;

let p;

export class ImportToolRenderer extends RendererBase{
    constructor(canvas){
        super(canvas);

        this.setClearColor(0.65,0.65,0.8);
        this.initializeShaders();
        this.tex = null;

        //Our view never changes
        this.projectionMatrix = super.buildProjectionMatrix(this.gl, fov, near, far);

        const q = quat.create();
        aa_math.buildCameraEyeMatrix(this.modelViewMatrix, [0,0,0], q);
        mat4.multiply(this.modelViewMatrix, this.projectionMatrix, this.modelViewMatrix);
    }

    renderFrame(scene, time){
        const gl = this.gl;
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

        mat4.fromRotationTranslation(this.dynamicModelViewMatrix, scene.rot, scene.translation);
        mat4.multiply(this.dynamicModelViewMatrix, this.modelViewMatrix, this.dynamicModelViewMatrix);

        if(!!this.meshBatch){
            p = this.shaderPrograms[0];
            gl.useProgram(p.program);
 
            if(!!this.tex){
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.tex);
                gl.uniform1i(p.uniformLocations.sampler, 0);
            }

            this.meshBatch.bind(gl, p);
            this.meshBatch.draw(gl, p, 0, this.dynamicModelViewMatrix);
        }else if(!!this.animatedMesh){
            this.animatedMesh.advanceFrame(time);
            
            p = this.shaderPrograms[1];
            gl.useProgram(p.program);

            if(!!this.tex){
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.tex);
                gl.uniform1i(p.uniformLocations.sampler, 0);
            }

            this.animatedMesh.draw(gl, p, this.dynamicModelViewMatrix);
        }
    }

    setClearColor(r,g,b){
        this.gl.clearColor(r,g,b,1.0);
    }

    initializeShaders(){
        const gl = this.gl;

        this.shaderPrograms = [
            new ShaderProgram(gl, VertexShaders.unlit, FragmentShaders.gui),
            new ShaderProgram(gl, VertexShaders.skinnedUnlit, FragmentShaders.gui)
        ];
    }

    setMesh(mesh){
        if(!!mesh.isAnimated){
            this.animatedMesh = new AnimatedMesh(this.gl, mesh);
            this.meshBatch = null;
        }else{
            this.meshBatch = new MeshBatch(this.gl, [mesh]);
            this.animatedMesh = null;
        }
    }

    buildImage(src){
        TextureUtils.initTexture2D(this.gl, src, true, true)
            .then(tex => {
                // if(!!this.tex)
                //     this.gl.deleteTexture(this.tex);

                this.tex = tex;
            });
    }
}