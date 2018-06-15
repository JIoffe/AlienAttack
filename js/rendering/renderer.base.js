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

        this.EXT_DepthTexture = this.gl.getExtension('WEBGL_depth_texture') || gl.getExtension("WEBKIT_WEBGL_depth_texture");
        if(!this.EXT_DepthTexture){
            console.warn('Browser does not support WEBGL_depth_texture! Cannot render shadow map.');
        }
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
    }

    initializeRenderState(gl){
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

    buildProjectionMatrix(gl, fov, near, far){
        const w = gl.viewportWidth;
        const h = gl.viewportHeight;

        return aa_math.buildProjectionMatrix(fov, w, h, near, far);
    }

    buildShadowMapFrameBuffer (gl, w, h){
        const fb = gl.createFramebuffer();
        const colorTex = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, colorTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const depthTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return {
            frameBuffer: fb,
            frameBufferTex: colorTex,
            frameBufferDepthTex: depthTex
        };
    }
}