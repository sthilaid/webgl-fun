// written by David St-Hilaire (https://github.com/sthilaid)

function makeShadowShader(gl) {
    const vsSource = `#version 300 es
    layout(std140, column_major) uniform;
    
    in vec4 aVertexPosition;

    uniform mat4 uModelToWorld;
    uniform mat4 uWorldToProjection;

    vec4 getSphericalDepthProjection(vec4 localPos) {
        float eps = 0.001;
        float thetaXY = 0.0;
        if (abs(localPos.x) > eps || abs(localPos.y) > eps) {
            vec3 localPosXY = normalize(vec3(localPos.x, localPos.y, 0.0));
            thetaXY = dot(vec3(1,0,0), localPosXY);
        }
        float thetaXZ = 0.0;
        if (abs(localPos.x) > eps || abs(localPos.z) > eps) {
            vec3 localPosXZ = normalize(vec3(localPos.x, 0.0, localPos.z));
            thetaXZ = dot(vec3(1,0,0), localPosXZ);
        }
        float depth = length(localPos) / 5.0;
        return vec4(thetaXY, thetaXZ, depth, 1.0);
    }

    void main() {
        vec4 pos = uWorldToProjection * uModelToWorld * aVertexPosition;
        gl_Position = getSphericalDepthProjection(pos);
    }
`
    const fsSource = `#version 300 es
    precision highp float;
    layout(std140, column_major) uniform;

    out vec4 fFragmentDepthColor;

    void main() {
        fFragmentDepthColor = vec4(vec3(gl_FragCoord.z), 1.0);
    }
`
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const shaderObject  = new ShaderObject(shaderProgram)
    shaderObject.attribLocations.vertexPosition     = gl.getAttribLocation(shaderProgram,  'aVertexPosition')
    shaderObject.uniformLocations.worldToProjection = gl.getUniformLocation(shaderProgram, 'uWorldToProjection')
    shaderObject.uniformLocations.modelToWorld      = gl.getUniformLocation(shaderProgram, 'uModelToWorld')
    return shaderObject
}

function makeUnlitShader(gl) {
    const vsSource = `#version 300 es

    layout(std140, column_major) uniform;
    
    in vec4 aVertexPosition;
    in vec4 aVertexColor;
    out vec4 vVertexColor;

    uniform mat4 uModelToWorld;
    uniform mat4 uWorldToProjection;

    void main() {
        vVertexColor = aVertexColor;
        gl_Position = uWorldToProjection * uModelToWorld * aVertexPosition;
    }
`
    const fsSource = `#version 300 es
    precision highp float;
    layout(std140, column_major) uniform;

    in vec4 vVertexColor;
    out vec4 vFragmentColor;

    void main() {
        vFragmentColor = vVertexColor;
    }
`
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const shaderObject  = new ShaderObject(shaderProgram)
    shaderObject.attribLocations.vertexPosition     = gl.getAttribLocation(shaderProgram,  'aVertexPosition')
    shaderObject.attribLocations.vertexColor        = gl.getAttribLocation(shaderProgram,  'aVertexColor')
    shaderObject.uniformLocations.worldToProjection = gl.getUniformLocation(shaderProgram, 'uWorldToProjection')
    shaderObject.uniformLocations.modelToWorld      = gl.getUniformLocation(shaderProgram, 'uModelToWorld')
    return shaderObject
}

function makeProjSpaceTexturedShader(gl) {
    const vsSource = `#version 300 es

    layout(std140, column_major) uniform;
    
    in vec4 aVertexPosition;
    in vec2 aUVCoord;
    out vec2 vUVCoord;

    void main() {
        vUVCoord = aUVCoord;
        gl_Position = aVertexPosition; // no projection!
    }
`
    const fsSource = `#version 300 es
    precision highp float;
    layout(std140, column_major) uniform;

    in vec2 vUVCoord;
    out vec4 vFragmentColor;

    uniform sampler2D uTexture;

    void main() {
        vFragmentColor = texture(uTexture, vUVCoord);
    }
`
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const shaderObject  = new ShaderObject(shaderProgram)
    shaderObject.attribLocations.vertexPosition     = gl.getAttribLocation(shaderProgram,  'aVertexPosition')
    shaderObject.attribLocations.texCoord           = gl.getAttribLocation(shaderProgram,  'aUVCoord')
    shaderObject.uniformLocations.texture           = gl.getUniformLocation(shaderProgram, 'uTexture')
    return shaderObject
}


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
        gl_Position     = uWorldToProjection * vVertexPos;
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
        mat4        worldToLightProj;
        sampler2D   shadowMap;
        vec3        pos;
        vec3        dir;
        vec3        color;
        int         type;           // [0: dir, 1: omni, 2: spot]
        float       r0;             // ideal distance (omni, spot)
        float       umbraAngle;     // spot
        float       penumbraAngle;  // spot
    };

    uniform Light uLights[5];
    uniform int uLightCount;
    uniform vec3 uViewPosition;
    uniform bool uCastShadows;

    vec4 unlit(vec3 n, vec3 v) {
        return vec4(0.1, 0.1, 0.1, 1.0);
    }

    float distanceAttenuation(float r0, float r) {
        float attenuationSqr = r0 / max(r, 0.1);
        return attenuationSqr * attenuationSqr;
    }
    float directionAttenuation(vec3 lightDir, vec3 lightToFragDir, float umbraAngle, float penumbraAngle) {
        float cosLightDirFragAngle = dot(lightDir, lightToFragDir);
        float t = clamp((cosLightDirFragAngle - cos(umbraAngle)) / (cos(penumbraAngle) - cos(umbraAngle)), 0.0, 1.0);
        return t * t;
    }

    vec4 getSphericalDepthProjection(vec4 localPos) {
        float eps = 0.00001;
        float thetaXY = 0.0;
        if (abs(localPos.x) > eps || abs(localPos.y) > eps) {
            vec3 localPosXY = normalize(vec3(localPos.x, localPos.y, 0.0));
            thetaXY = dot(vec3(1,0,0), localPosXY);
        }
        float thetaXZ = 0.0;
        if (abs(localPos.x) > eps || abs(localPos.z) > eps) {
            vec3 localPosXZ = normalize(vec3(localPos.x, 0.0, localPos.z));
            thetaXZ = dot(vec3(1,0,0), localPosXZ);
        }
        float depth = length(localPos) / 5.0;
        return vec4(thetaXY, thetaXZ, depth, 1.0);
    }

    vec4 getLightColor(Light light, vec3 deltaFragToLight) {
        float shadowIntensity   = 1.0;
        vec4 localLightPos      = light.worldToLightProj * vVertexPos;
        vec4 lightProj          = getSphericalDepthProjection(localLightPos);
        vec2 shadowMapCoord     = vec2(lightProj.x * 0.5 + 0.5,
                                       lightProj.y * 0.5 + 0.5);
        float shadowMapDepthValue   = texture(light.shadowMap, shadowMapCoord).z;
        float currentDepthValue     = min(lightProj.z, 1.0);
        float bias                  = 0.0;
        bool isInShadow = (currentDepthValue - bias) > shadowMapDepthValue;
        if (isInShadow) {
            shadowIntensity = 0.1; // if further from light, fragment lies in shadow
            //return vec4(vec3(shadowMapDepthValue), 1.0);
        }
        if (light.type == 0) {
            // --- directional ----
            return shadowIntensity * vec4(light.color, 1.0);
        }
        else if (light.type == 1) {
            // --- omni ----
            float r = length(deltaFragToLight);
            return shadowIntensity * distanceAttenuation(light.r0, r) * vec4(light.color, 1.0);
            //return vec4(shadowIntensity, shadowIntensity, shadowIntensity, 1.0);
        } else if (light.type == 2) {
            // --- spot ----
            float r = length(deltaFragToLight);
            float distAttenuation   = distanceAttenuation(light.r0, r);
            vec3 lightToFragDir     = -deltaFragToLight / r;
            float dirAttenuation    = directionAttenuation(light.dir, lightToFragDir, light.umbraAngle, light.penumbraAngle);
            return shadowIntensity * distAttenuation * dirAttenuation * vec4(light.color, 1.0);
        }
        return shadowIntensity * vec4(light.color, 1.0); // fallback
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
            vec4 lightColor         = getLightColor(uLights[i], deltaFragToLight);
            vFragmentColor          += clamp(dot(fragToLight, fragNormal), 0.0, 1.0) * lightColor * fragBaseColor;
            //vFragmentColor          = lightColor;
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
    shaderObject.uniformLocations.castShadows       = gl.getUniformLocation(shaderProgram, 'uCastShadows')

    var lights = []
    for (var i=0; i<5; ++i) {
        var light = new Object()
        light.worldToLightProj  = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].worldToLightProj')
        light.shadowMap         = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].shadowMap')
        light.pos               = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].pos')
        light.dir               = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].dir')
        light.color             = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].color')
        light.type              = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].type')
        light.r0                = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].r0')
        light.umbraAngle        = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].umbraAngle')
        light.penumbraAngle     = gl.getUniformLocation(shaderProgram, 'uLights['+i+'].penumbraAngle')
        lights = lights.concat(light)
    }
    shaderObject.uniformLocations.lights            = lights
    shaderObject.uniformLocations.lightCount        = gl.getUniformLocation(shaderProgram, 'uLightCount')

    return shaderObject
}

var gLight=null
function getLightRadialSpeed() {
    var input = document.getElementById("lightSpeed")
    if (input) {
        if (!input.value) {
            input.value = Math.PI * 0.2
        }
        return input.value
    } else {
        return Math.PI * 0.2
    }
}

function getLightIdealDistance() {
    var input = document.getElementById("lightR0")
    if (input) {
        if (!input.value) {
            input.value = 5.0
        }
        return input.value
    } else {
        return 5.0
    }
}

function getLightSpotAngles() {
    var paInput = document.getElementById("lightPA")
    var uaInput = document.getElementById("lightUA")
    var penumbra    = paInput ? glMatrix.toRadian(paInput.value) : 0.0
    var umbra       = uaInput ? glMatrix.toRadian(uaInput.value) : 0.0
    return {penumbra: penumbra, umbra: umbra}
}

function getLightType() {
    var typeSelect = document.getElementById("lightType")
    if (typeSelect) {
        return typeSelect.selectedIndex
    } else {
        return LightTypes.omni
    }
}

function getShouldShowShadowMap() {
    var typeSelect = document.getElementById("shadowMapView")
    if (typeSelect) {
        return typeSelect.value
    } else {
        return false
    }
}

function getLightColor() {
    function hexToRgb(hex) {
        // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb/5624139
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? vec3.fromValues(parseInt(result[1], 16) / 256.0,
                                        parseInt(result[2], 16) / 256.0,
                                        parseInt(result[3], 16) / 256.0)
            : vec3.fromValues(1.0, 1.0, 1.0)
    }
    
    var colorPicker = document.getElementById("lightColor")
    if (colorPicker) {
        const colorValue = colorPicker.value
        const color = hexToRgb(colorValue)
        return color
    } else {
        return vec3.fromValues(1.0, 1.0, 1.0)
    }
}

var gShadowMapViewPlane = null
function toggleShapwMapView(isActive) {
    if (gShadowMapViewPlane == null)
        return

    gShadowMapViewPlane.isActive = isActive
}


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

    const lightTarget   = vec3.fromValues(0, -5, -15)
    const lightUpdate   = function() {
        var angle           = 0.0
        const amplitude     = 4.0
        const baseDepth     = -15
        const height        = 5.0
        const up            = vec3.fromValues(0, 1, 0)
        // return function(_, __){}
        return function(light, dt) {
            const radialSpeed   = getLightRadialSpeed()
            const x = amplitude * Math.cos(angle)
            const z = baseDepth + amplitude * Math.sin(angle)
            const pos = vec3.fromValues(x, height, z)
            //mat4.targetTo(light.localToWorld, pos, lightTarget, up)
            mat4.identity(light.localToWorld)
            mat4.translate(light.localToWorld, light.localToWorld, pos)
            angle += radialSpeed * dt

            light.r0    = getLightIdealDistance()
            light.type  = getLightType()
            light.color = getLightColor()

            const spotAngles = getLightSpotAngles()
            light.penumbraAngle = spotAngles.penumbra
            light.umbraAngle    = spotAngles.umbra
        }

    }()
    var light           = new Light(mat4.create(), LightTypes.omni, lightUpdate)

    const shadowsShader         = makeShadowShader(gl)
    const unlitShader           = makeUnlitShader(gl)
    const projSpaceTexShader    = makeProjSpaceTexturedShader(gl)
    const litShader             = makeLitShader(gl)

    const planeBuffers          = WebGLMesh.initPlaneBuffers(gl, 1, 1)
    const cubeBuffers           = WebGLMesh.initCubeBuffers(gl, 3)
    const catBuffers            = WebGLMesh.initMeshBuffers(gl, catMeshData)
    const sphereBuffers         = WebGLMesh.initSphereBuffers(gl, 1.0, 2)
    const smallSphereBuffers    = WebGLMesh.initSphereBuffers(gl, 0.1, 1, vec4.fromValues(1,1,1,1))
    const groundPlaneBuffers    = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(0.8, 0.8, 0.8, 1.0))
    const redWallPlaneBuffers   = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(1.0, 0.0, 0.0, 1.0))
    const greenWallPlaneBuffers = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(0.0, 1.0, 0.0, 1.0))
    const blueWallPlaneBuffers  = WebGLMesh.initPlaneBuffers(gl, 5.0, 5.0, vec4.fromValues(0.0, 0.0, 1.0, 1.0))
    loadTexture(gl); // load 1x1 texture to avoid errors in shader

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

    const cube = new SceneObject("cube", litShader, cubeBuffers, function(dt){})
    mat4.fromRotationTranslationScale(cube.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), -Math.PI*0.25),
                                      //[-2.0, -3.5, -15.0], [1, 1, 1])
                                      [-2.0, 1.5, -15.0], [1, 1, 1])
    cube.castShadows = false

    const sphereRotAxis = vec3.normalize(vec3.create(), vec3.fromValues(1, 1, 1))
    const sphere = new SceneObject("sphere", litShader, sphereBuffers, makeRotationUpdate(sphereRotAxis,
                                                                                          Math.PI * 0.1))
    mat4.fromRotationTranslationScale(sphere.modelToWorld, quat.create(),
                                      [3, 2, -15.0], [1,1,1])
    sphere.castShadows = true

    const groundPlane = new SceneObject("groundPlane", litShader, groundPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(groundPlane.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(1,0,0), -Math.PI*0.5),
                                      [0, -5, -15.0], [1.0, 1.0, 1.0])
    groundPlane.castShadows = false

    const backPlane = new SceneObject("backPlane", litShader, redWallPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(backPlane.modelToWorld, quat.create(),
                                      [0, 0, -20.0], [1.0, 1.0, 1.0])
    backPlane.castShadows = false

    const leftPlane = new SceneObject("leftPlane", litShader, greenWallPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(leftPlane.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), Math.PI*0.5),
                                      [-5, 0, -15.0], [1.0, 1.0, 1.0])
    leftPlane.castShadows = false

    const rightPlane = new SceneObject("rightPlane", litShader, blueWallPlaneBuffers, function(dt){})
    mat4.fromRotationTranslationScale(rightPlane.modelToWorld,
                                      quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), -Math.PI*0.5),
                                      [5, 0, -15.0], [1.0, 1.0, 1.0])
    rightPlane.castShadows = false

    const lightSphere = new SceneObject("lightSphere", unlitShader, smallSphereBuffers,
                                        function(so, dt) { lightUpdate({localToWorld: so.modelToWorld}, dt) })
    lightSphere.castShadows = false

    gShadowMapViewPlane = new SceneObject("shadowViz", projSpaceTexShader, planeBuffers,
                                          function(so,dt) {
                                              so.texture = light.shadowDepthTexture;
                                          })
    gShadowMapViewPlane.isActive = false
    gShadowMapViewPlane.castShadows = false
    
    const scene = new Scene(new Camera(mat4.create(), projectionMatrix, cameraUpdate),
                            [groundPlane, backPlane, leftPlane, rightPlane, sphere, cube, lightSphere, gShadowMapViewPlane],
                            [light],
                            shadowsShader)
    scene.init(gl)
    
    var then = 0;
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        {
            scene.update(deltaTime)
            scene.render(gl)
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main()
