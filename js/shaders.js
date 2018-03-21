const VertexShaders = {
    notex:
    `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewProj;

    void main(void) {
        gl_Position = uModelViewProj * aVertexPosition;
    }     
    `,
    skybox:
        `
        attribute vec4 aVertexPosition;
        attribute vec3 aNormal;
        
        uniform mat3 uNormalMatrix;
        varying highp vec3 vNorm;
        void main(void) {
            gl_Position = aVertexPosition;
            vNorm = normalize(uNormalMatrix*aNormal);
        }        
        `,
    gui:
        `
        attribute vec4 aVertexPosition;
        attribute vec2 aTexCoords;
        
        varying vec2 vTextureCoords;
        void main(void) {
            gl_Position = aVertexPosition;
            vTextureCoords = aTexCoords;
        }        
        `,
    particle:
        `
        attribute vec4 aVertexPosition;
        attribute vec2 aTexCoords;
        
        uniform mat4 uModelViewProj;

        varying vec2 vTextureCoords;
        void main(void) {
            gl_Position = uModelViewProj * aVertexPosition;
            vTextureCoords = aTexCoords;
        }                
        `,
    walls:
        `        
        attribute vec4 aVertexPosition;
        attribute vec2 aTexCoords;
        attribute vec3 aNormal;

        uniform mat4 uModelViewProj;
        uniform float uShade;

        varying vec2 vTextureCoords;
        varying vec3 vNorm;
        varying float vShade;

        varying float depth;

        void main() {
            vNorm = normalize(aNormal);
            vShade = 1.0 - uShade / 20.0;
            vTextureCoords = aTexCoords;
            gl_Position = uModelViewProj * aVertexPosition;
            depth = gl_Position.w;
        }
        `    
}

const FragmentShaders = {
    solidcolor:
    `
    precision mediump float;

    uniform vec4 uColor;

    void main(void) {                
        gl_FragColor = vec4(1,0.7,0,1);
    }  
    `,
    gui:
        `
        precision mediump float;

        uniform sampler2D uSampler;
        varying vec2 vTextureCoords;

        void main(void) {                
            gl_FragColor = texture2D(uSampler, vTextureCoords);
        }  
        `,
    skybox:
        `
        precision mediump float;

        uniform samplerCube uSamplerCube;
        varying highp vec3 vNorm;
        void main(void) {                
            gl_FragColor = textureCube(uSamplerCube, normalize(vNorm));
        }        
        `,
    walls:
        `
        precision mediump float;

        uniform sampler2D uSampler;

        varying vec2 vTextureCoords;
        varying vec3 vNorm;
        varying float vShade;

        varying float depth;

        void main() {
            //vec3 norm = normalize(vNorm);
            //gl_FragColor = vec4(abs(norm.x), 0.0, abs(norm.z), 1.0);
            float lighting = max(1.0 - depth / 25.0, 0.25)  * vShade;
            vec4 diffuse = texture2D(uSampler, vTextureCoords);
            diffuse.rgb *= lighting;

            gl_FragColor = diffuse;
        }
        `
}

/*
* Encapsulates a compiled shader program with attribute locations
*/
class ShaderProgram{
    constructor(gl, vsSource, fsSource){
        const program = this.loadShaderProgram(gl, vsSource, fsSource);

        this.program = program;
        this.attribLocations = {
            vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
            texPosition: gl.getAttribLocation(program, 'aTexCoords'),
            normalPosition: gl.getAttribLocation(program, 'aNormal')
        };

        this.uniformLocations = {
            modelViewProj: gl.getUniformLocation(program, 'uModelViewProj'),
            projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(program, 'uNormalMatrix'),
            sampler: gl.getUniformLocation(program, 'uSampler'),
            samplerCube: gl.getUniformLocation(program, 'uSamplerCube'),
            cameraPos: gl.getUniformLocation(program, 'uCameraPos'),
            shade: gl.getUniformLocation(program, 'uShade'),
            color: gl.getUniformLocation(program, 'uColor')
        };
    }

    get isReady(){
        return !!this.program;
    }

    loadShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
      
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
          console.error('Could not load shader program: ' + gl.getProgramInfoLog(shaderProgram));
          return null;
        }
      
        return shaderProgram;
    }

    loadShader(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);
      
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Could not compile shader: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
      
        return shader;
    }        
}

export {VertexShaders, FragmentShaders, ShaderProgram}