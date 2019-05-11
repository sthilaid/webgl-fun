// code inspired by:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
// rest is written by David St-Hilaire (https://github.com/sthilaid)

function makeLitShader(gl) {
        const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexNormal;
    attribute vec2 aTexCoord;
    attribute vec4 aVertexColor;

    varying highp vec4 vVertexNormal;
    varying highp vec2 vTexCoord;
    varying highp vec4 vertexColor;

    uniform bool uUseTexture;
    uniform mat4 uModelToWorld;
    uniform mat4 uWorldToProjection;

    void main() {
        vec4 pos        = uWorldToProjection * uModelToWorld * aVertexPosition;
        gl_Position     = normalize(pos);
        vVertexNormal   = normalize(uModelToWorld * aVertexNormal);
        vTexCoord       = aTexCoord;
        vertexColor     = aVertexColor;
    }
  `;

    const fsSource = `
    varying highp vec4 vVertexNormal;
    varying highp vec2 vTexCoord;
    varying highp vec4 vertexColor;

    uniform bool uUseTexture;
    uniform sampler2D uTexture;

    void main() {
        highp vec4 n = normalize(vVertexNormal);
        if (uUseTexture) {
            gl_FragColor = texture2D(uTexture, vTexCoord);
        } else {
            gl_FragColor = vertexColor + 0.01 * vVertexNormal; // TEMP USE OF Normal
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
    test = shaderObject
    return shaderObject
}
var test = false

function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    initGL(gl);

    const litShader     = makeLitShader(gl)

    const planeBuffers  = initPlaneBuffers(gl)
    const cubeBuffers   = initCubeBuffers(gl)
    const catBuffers    = initMeshBuffers(gl, catMeshData)

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
        
    const sunSquare = new SceneObject("sunSquare", litShader, planeBuffers, makeRotationUpdate([0,0,1], Math.PI * 0.05))
    sunSquare.texture = loadTexture(gl, "sun.jpg")
    mat4.fromRotationTranslationScale(sunSquare.modelToWorld, quat.create(),
                                      [-0.0, 0.0, -6.0], [1,1,1])

    const smallSquare = new SceneObject("smallSquare", litShader, planeBuffers, makeRotationUpdate([0,0,-1], Math.PI * 0.1))
    mat4.fromRotationTranslationScale(smallSquare.modelToWorld, quat.create(),
                                      [0.5, -0.3, -3.0], [0.25, 0.25, 1])

    const cube = new SceneObject("cube", litShader, cubeBuffers, makeRotationUpdate(vec3.normalize(vec3.create(), [1,1,-1]),
                                                                               Math.PI * 0.15))
    mat4.fromRotationTranslationScale(cube.modelToWorld, quat.create(),
                                      [-2.0, -1.0, -10.0], [1, 1, 1])

    const cat = new SceneObject("cat", litShader, catBuffers, makeRotationUpdate(vec3.normalize(vec3.create(), [0,1,0]),
                                                                             Math.PI * 0.1))
    mat4.fromRotationTranslationScale(cat.modelToWorld, quat.create(),
                                      [4, -4, -10.0], [0.01, 0.01, 0.01])

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
        const lookAtTarget = vec3.fromValues(0,0,-5)
        const latDisplacement = 3
        const v = 2 * Math.PI / 30
        var theta = 0.0
        return function(cameraMatrix, dt) {
            pos = vec3.fromValues(Math.cos(theta) * latDisplacement, 0.0, 0.0)
            mat4.lookAt(cameraMatrix, pos, lookAtTarget, vec3.fromValues(0,1,0))
            theta += v * dt
        }
    }()

    const scene = new Scene(new Camera(mat4.create(), projectionMatrix, cameraUpdate),
                            [smallSquare, cube, cat, sunSquare])
    
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
