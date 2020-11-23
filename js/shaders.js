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
            gl_Position.xy -= 1.0;

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
            vTextureCoords = aTexCoords / 65535.0;
        }        
        `,
    particle:
        `
        attribute vec4 aVertexPosition;      
        uniform mat4 uModelViewProj;

        varying float vLife;

        void main(void) {
            gl_Position = uModelViewProj * vec4(aVertexPosition.xyz, 1.0);
            vLife = aVertexPosition.w;
            gl_PointSize = clamp(vLife, 0.0, 1.0) * 4.0;
        }                
        `,
    decal:
        `
        attribute vec4 aVertexPosition;    
        attribute vec2 aTexCoords;  
        uniform mat4 uModelViewProj;

        varying float depth;
        varying vec2 vTextureCoords;

        void main(void) {
            gl_Position = uModelViewProj * aVertexPosition;
            depth = gl_Position.w;
            vTextureCoords = aTexCoords  / 65535.0;
        }                
        `,
    texturedWithNormals:
        `
        attribute vec4 aVertexPosition;
        attribute vec2 aTexCoords;
        attribute vec3 aNormal;
        
        uniform mat4 uModelViewProj;
        uniform mat3 uNormalMatrix;

        varying vec2 vTextureCoords;
        varying vec3 vNormal;
        varying vec3 vReflect;
        
        void main(void) {
            gl_Position = uModelViewProj * aVertexPosition;

            //Approximate eye v from transformed position
            vec3 eye = normalize(aVertexPosition.xyz);

            vNormal = normalize(uNormalMatrix * aNormal);
            vReflect = reflect(eye, vNormal);

            vTextureCoords = aTexCoords;
        }                
        `,
    unlit:
        `
        attribute vec4 aVertexPosition;
        attribute vec2 aTexCoords;

        uniform mat4 uModelViewProj;
        varying vec2 vTextureCoords;

        void main(void){
            gl_Position = uModelViewProj * aVertexPosition;
            vTextureCoords = aTexCoords / 65535.0;
        }

        `,
    skinnedUnlit:
        `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexPositionB;
        attribute vec2 aTexCoords;

        uniform mat4 uModelViewProj;
        uniform float s;

        varying vec2 vTextureCoords;

        void main(void){
            gl_Position = uModelViewProj * mix(aVertexPosition, aVertexPositionB, s);
            vTextureCoords = aTexCoords;
        }

        `,
    walls:
        `        
        attribute vec4 aVertexPosition;
        attribute vec2 aTexCoords;

        uniform mat4 uModelViewProj;
        uniform mat4 uLightViewProj;

        varying vec4 vPositionLightSpace;
        varying vec2 vTextureCoords;
        varying float vShade;

        void main() {
            vec4 pos = vec4(aVertexPosition.xyz, 1.0);
            gl_Position = uModelViewProj * pos;
            vPositionLightSpace = uLightViewProj * pos;

            vTextureCoords = aTexCoords;
            vShade = aVertexPosition.w;
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
    no_output:
    `
    precision mediump float;
    
    void main(void) {
        gl_FragColor = vec4(1,1,1,1);
    }  
    `,
    particle:
        `
        precision mediump float;
        uniform sampler2D uSampler;

        varying float vLife;

        void main(void) {                
            gl_FragColor = texture2D(uSampler, gl_PointCoord);
            gl_FragColor.a *= clamp(vLife, 0.0, 1.0);
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
    decal:
        `
        precision mediump float;

        uniform sampler2D uSampler;

        varying float depth;
        varying vec2 vTextureCoords;

        void main(void) {                
            float lighting = max(1.0 - depth / 25.0, 0.25);
            gl_FragColor = texture2D(uSampler, vTextureCoords);
            gl_FragColor.xyz *= lighting;
        }  
        `,
    skybox:
        `
        precision mediump float;

        uniform samplerCube uSamplerCube;
        varying highp vec3 vNorm;
        void main(void) {                
            gl_FragColor = textureCube(uSamplerCube, vNorm);
        }        
        `,
    reflective:
        `
        precision mediump float;

        uniform sampler2D uSampler;
        uniform samplerCube uSamplerCube;

        varying vec3 vNormal;
        varying vec3 vReflect;
        varying vec2 vTextureCoords;

        void main(void) {                
            vec4 diffuse = texture2D(uSampler, vTextureCoords);
            vec4 reflection = textureCube(uSamplerCube, normalize(vReflect));

            float s = diffuse.a;
            if(s < 0.25)
                s = 0.0;

            gl_FragColor = mix(diffuse, reflection, s);
            gl_FragColor.a = 1.0;
        }  
        `,
    walls:
        `
        precision mediump float;

        uniform sampler2D uSampler;
        uniform sampler2D uShadowSampler;

        varying vec4 vPositionLightSpace;
        varying vec2 vTextureCoords;
        varying float vShade;

        void main() {
            float lighting = clamp((30.0 - 1.0 / gl_FragCoord.w) / 30.0, 0.35, 1.0) * vShade;
            vec3 positionLightSpace = vPositionLightSpace.xyz / vPositionLightSpace.w;
            positionLightSpace = positionLightSpace * 0.5 + 0.5;

            float shadowDepth = texture2D(uShadowSampler, positionLightSpace.xy).r;

            if(shadowDepth < positionLightSpace.z){
                lighting *= 0.5;
            }

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
            vertexPositionB: gl.getAttribLocation(program, 'aVertexPositionB'),
            texPosition: gl.getAttribLocation(program, 'aTexCoords'),
            normalPosition: gl.getAttribLocation(program, 'aNormal'),
            shade: gl.getAttribLocation(program, 'aShade')
        };

        this.uniformLocations = {
            modelViewProj: gl.getUniformLocation(program, 'uModelViewProj'),
            lightViewProj: gl.getUniformLocation(program, 'uLightViewProj'),
            projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(program, 'uNormalMatrix'),
            sampler: gl.getUniformLocation(program, 'uSampler'),
            shadowSampler: gl.getUniformLocation(program, 'uShadowSampler'),
            samplerCube: gl.getUniformLocation(program, 'uSamplerCube'),
            cameraPos: gl.getUniformLocation(program, 'uCameraPos'),
            color: gl.getUniformLocation(program, 'uColor'),
            s: gl.getUniformLocation(program, 's')
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