// written by David St-Hilaire (https://github.com/sthilaid)

function makeLitShader(gl) {
        const vsSource = `#version 300 es

    layout(std140, column_major) uniform;
    
    in vec4 aVertexPosition;
    in vec4 aVertexNormal;
    in vec2 aTexCoord;
    in vec4 aVertexColor;

    out vec4 vVertexPos;
    out vec4 vVertexNormal;
    out vec2 vTexCoord;
    out vec4 vertexColor;

    uniform bool uUseTexture;
    uniform mat4 uModelToWorld;
    uniform mat4 uWorldToProjection;

    void main() {
        vVertexPos      = uModelToWorld * aVertexPosition;
        gl_Position     = normalize(uWorldToProjection * vVertexPos);
        vVertexPos      = normalize(vVertexPos);
        vVertexNormal   = normalize(uModelToWorld * aVertexNormal);
        vTexCoord       = aTexCoord;
        vertexColor     = aVertexColor;
    }
  `;

    const fsSource = `#version 300 es
    precision highp float;
    layout(std140, column_major) uniform;
    
    in vec4 vVertexPos;
    in vec4 vVertexNormal;
    in vec2 vTexCoord;
    in vec4 vertexColor;

    out vec4 vFragmentColor;

    uniform bool uUseTexture;
    uniform sampler2D uTexture;

    struct Light {
        vec3 pos;
        vec3 dir;
        int type; // [0: dir, 1: omni, 2: spot]
        float r0; // ideal distance (omni, spot)
    };

    uniform Light uLights[5];
    uniform int uLightCount;
    uniform vec3 uViewPosition;

    vec4 unlit(vec3 n, vec3 v) {
        return vec4(0.1, 0.1, 0.1, 1.0);
    }

    vec4 getLightColor(int type, float r0, vec3 deltaFragToLight) {
        if (type == 0) {
            // --- directional ----
            return vec4(1.0, 1.0, 1.0, 1.0);
        }
        else if (type == 1) {
            // --- omni ----
            float r = length(deltaFragToLight);
            float attenuation = r0 * r0 / max(r*r, 1.0);
            return attenuation * vec4(1.0, 1.0, 1.0, 1.0);
        } else if (type == 2) {
            // --- spot ----
            return vec4(1.0, 1.0, 1.0, 1.0);
        }
        return vec4(1.0, 1.0, 1.0, 1.0); // fallback
    }

    void main() {
        vec4 fragBaseColor = vec4(1.0, 1.0, 1.0, 1.0);
        if (uUseTexture) {
            fragBaseColor = texture(uTexture, vTexCoord);
        } else {
            fragBaseColor = vertexColor;
        }

        vec3 fragToView     = normalize(uViewPosition - vVertexPos.xyz).xyz;
        vec3 fragNormal     = normalize(vVertexNormal).xyz;
        vFragmentColor      = unlit(fragNormal, fragToView);

        for(int i=0; i<uLightCount; ++i) {
            vec3 deltaFragToLight   = uLights[i].pos - vVertexPos.xyz;
            vec3 fragToLight        = normalize(deltaFragToLight).xyz;
            vec4 lightColor         = getLightColor(uLights[i].type, uLights[i].r0, deltaFragToLight);
            vFragmentColor          += clamp(dot(fragToLight, fragNormal), 0.0, 1.0) * lightColor * fragBaseColor;
            vFragmentColor[3]       = 1.0;
        }
    }
  `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const shaderObject  = new ShaderObject(shaderProgram)
    shaderObject.attribLocations.vertexPosition     = gl.getAttribLocation(shaderProgram,  'aVertexPosition')
    shaderObject.attribLocations.vertexNormal       = gl.getAttribLocation(shaderProgram,  'aVertexNormal')
    shaderObject.attribLocations.texCoord           = gl.getAttribLocation(shaderProgram,  'aTexCoord')
    shaderObject.attribLocations.vertexColor        = gl.getAttribLocation(shaderProgram,  'aVertexColor')
    shaderObject.uniformLocations.worldToProjection = gl.getUniformLocation(shaderProgram, 'uWorldToProjection')
    shaderObject.uniformLocations.modelToWorld      = gl.getUniformLocation(shaderProgram, 'uModelToWorld')
    shaderObject.uniformLocations.useTexture        = gl.getUniformLocation(shaderProgram, 'uUseTexture')
    shaderObject.uniformLocations.texture           = gl.getUniformLocation(shaderProgram, 'uTexture')
    shaderObject.uniformLocations.viewPosition      = gl.getUniformLocation(shaderProgram, 'uViewPosition')

    var lights = []
    for (var i=0; i<5; ++i) {
        var light = new Object()
        light.pos   = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].pos')
        light.dir   = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].dir')
        light.type  = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].type')
        light.r0  = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].r0')
        lights = lights.concat(light)
    }
    shaderObject.uniformLocations.lights            = lights
    shaderObject.uniformLocations.lightCount        = gl.getUniformLocation(shaderProgram,      'uLightCount')
    test = shaderObject
    return shaderObject
}
var test=null

function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    initGL(gl);

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 1.0;
    const zFar = 10000.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
                      fieldOfView,
                      aspect,
                      zNear,
                      zFar);

    const cameraUpdate = function() {
        return function(dt){}
        // const targetToTarget = vec3.fromValues(0,0,-5)
        // const latDisplacement = 3
        // const v = 2 * Math.PI / 30
        // var theta = 0.0
        // return function(cameraMatrix, dt) {
        //     pos = vec3.fromValues(Math.cos(theta) * latDisplacement, 0.0, 0.0)
        //     mat4.targetTo(cameraMatrix, pos, targetToTarget, vec3.fromValues(0,1,0))
        //     theta += v * dt
        // }
    }()

    const lightTarget   = vec3.fromValues(0, 0, -15)
    var lightMat        = mat4.create()
    mat4.targetTo(lightMat, vec3.fromValues(0, 10, 10), lightTarget, vec3.fromValues(0, 1, 0))
    const lightUpdate   = function() {
        var angle           = 0.0
        const amplitude     = 5.0
        const radialSpeed   = Math.PI * 0.2
        const baseDepth     = -15
        const height        = 0
        const up            = vec3.fromValues(0, 1, 0)
        return function(lightMat, dt) {
            const x = amplitude * Math.cos(angle)
            const z = baseDepth + amplitude * Math.sin(angle)
            const pos = vec3.fromValues(x, height, z)
            mat4.targetTo(lightMat, pos, lightTarget, up)
            angle += radialSpeed * dt
        }
        // return function(lightMat, dt) {
        //     const pos = vec3.fromValues(amplitude*Math.cos(angle), 5, baseDepth + amplitude*Math.sin(angle))
        //     mat4.targetTo(lightMat, pos, lightTarget, vec3.fromValues(0, 1, 0))
        //     angle += radialSpeed * dt
        // }

    }()
    var light   = new Light(lightMat, LightTypes.omni, lightUpdate)
    light.r0    = 10.0

    const litShader     = makeLitShader(gl)

    const planeBuffers  = WebGLMesh.initPlaneBuffers(gl)
    const cubeBuffers   = WebGLMesh.initCubeBuffers(gl, 3)
    const catBuffers    = WebGLMesh.initMeshBuffers(gl, catMeshData)
    const sphereBuffers = WebGLMesh.initSphereBuffers(gl, 1.0, 2)
    const groundPlaneBuffers = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(0.8, 0.8, 0.8, 1.0))
    const redWallPlaneBuffers = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(1.0, 0.0, 0.0, 1.0))
    const greenWallPlaneBuffers = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(0.0, 1.0, 0.0, 1.0))
    const blueWallPlaneBuffers = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(0.0, 0.0, 1.0, 1.0))

    const makeRotationUpdate = function(axis, angularSpeed = Math.PI * 0.25) {
        var angle           = 0
        return function(sceneObj, dt) {
            deltaAngle  = angularSpeed * dt
            var rot     = mat4.create()
            mat4.rotate(sceneObj.modelToWorld,
                        sceneObj.modelToWorld,
                        deltaAngle,
                        axis)
        }
    }

    // const sunRotAxis = vec3.normalize(vec3.create(), [0,0,1])
    // const sunSquare = new SceneObject("sunSquare", litShader, planeBuffers, makeRotationUpdate(sunRotAxis, Math.PI * 0.05))
    // sunSquare.texture = loadTexture(gl, "sun.jpg")
    // mat4.fromRotationTranslationScale(sunSquare.modelToWorld, quat.create(),
    //                                   [-0.0, 0.0, -6.0], [1,1,1])

    // const smallSquareRotAxis = vec3.normalize(vec3.create(), [0,1,-1])
    // const smallSquare = new SceneObject("smallSquare", litShader, planeBuffers, makeRotationUpdate(smallSquareRotAxis, Math.PI * 0.1))
    // mat4.fromRotationTranslationScale(smallSquare.modelToWorld, quat.create(),
    //                                   [0.5, -0.3, -3.0], [0.25, 0.25, 1])

    const cube = new SceneObject("cube", litShader, cubeBuffers, function(dt){})
    mat4.fromRotationTranslationScale(cube.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), -Math.PI*0.25),
                                      [-2.0, -3, -15.0], [1, 1, 1])

    const sphereRotAxis = vec3.normalize(vec3.create(), vec3.fromValues(1, 1, 1))
    const sphere = new SceneObject("sphere", litShader, sphereBuffers, makeRotationUpdate(sphereRotAxis,
                                                                                          Math.PI * 0.1))
    mat4.fromRotationTranslationScale(sphere.modelToWorld, quat.create(),
                                      [3, 2, -15.0], [1,1,1])

    const groundPlane = new SceneObject("groundPlane", litShader, groundPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(groundPlane.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(1,0,0), -Math.PI*0.5),
                                      [0, -5, -15.0], [1.0, 1.0, 1.0])

    const backPlane = new SceneObject("backPlane", litShader, redWallPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(backPlane.modelToWorld, quat.create(),
                                      [0, 0, -20.0], [1.0, 1.0, 1.0])

    const leftPlane = new SceneObject("leftPlane", litShader, greenWallPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(leftPlane.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), Math.PI*0.5),
                                      [-5, 0, -15.0], [1.0, 1.0, 1.0])

    const rightPlane = new SceneObject("rightPlane", litShader, blueWallPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(rightPlane.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), -Math.PI*0.5),
                                      [5, 0, -15.0], [1.0, 1.0, 1.0])

    const lightSphere = new SceneObject("lightSphere", litShader, sphereBuffers,
                                        function(so, dt) { lightUpdate(so.modelToWorld, dt) })
    
    const scene = new Scene(new Camera(mat4.create(), projectionMatrix, cameraUpdate),
                            [groundPlane, backPlane, leftPlane, rightPlane,
                             sphere, cube, lightSphere],
                            [light])
    var then = 0;
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            scene.update(deltaTime)
            scene.render(gl)
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main()
