import * as aa_math from '../math';
import { mat4, mat3 } from 'gl-matrix';

export class RendererBase{
    constructor(canvas){
        this.gl = this.getRenderingContext(canvas);
        this.onResize(canvas.getAttribute('width'), canvas.getAttribute('height'));
        this.initializeRenderState(this.gl);

        //These float32 buffer matrices are used for camera transforms
        this.modelViewMatrix = mat4.create();
        this.dynamicModelViewMatrix = mat4.create();
        this.invTranspose = mat4.create();
        this.normalMatrix = mat3.create();

        //Always enable essential attributes for position and texCoords
        this.gl.enableVertexAttribArray(0);
        this.gl.enableVertexAttribArray(1);
    }

    getRenderingContext(canvas){
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if(!gl){
            console.error('Canvas does not support WebGL');
            return null;
        }

        return gl;
    }

    onResize(w, h){
        this.gl.viewportWidth = w;
        this.gl.viewportHeight = h;
        this.gl.viewport(0, 0, w, h);
    }

    initializeRenderState(gl){
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    buildProjectionMatrix(gl, fov, near, far){
        const w = this.gl.viewportWidth;
        const h = this.gl.viewportHeight;

        return aa_math.buildProjectionMatrix(fov, w, h, near, far);
    }
}