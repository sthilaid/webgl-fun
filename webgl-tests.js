// code inspired by:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
// rest is written by David St-Hilaire (https://github.com/sthilaid)

function makeSimpleShader(gl) {
        const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    //out vec4 vertexColor;
    varying lowp vec4 vertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uViewInvMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
        vec4 pos = uProjectionMatrix * uViewInvMatrix * uModelViewMatrix * aVertexPosition;
        gl_Position = normalize(pos);
        vertexColor = aVertexColor;
        // float z = gl_Position.z * 0.5 + 0.5; // [-1,1] -> [0,1]
        // float col = mix(1.0, 0.0, z); // smaller z is closer (more white)
        // vertexColor = vec4(col, col, col, 1);
    }
  `;

    const fsSource = `
    varying lowp vec4 vertexColor;

    void main() {
      gl_FragColor = vertexColor;
    }
  `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor:    gl.getAttribLocation(shaderProgram, 'aVertexColor'),
            texCoord:       false,
        },
        uniformLocations: {
            projectionMatrix:   gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewInvMatrix:      gl.getUniformLocation(shaderProgram, 'uViewInvMatrix'),
            modelViewMatrix:    gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            texture:            false,
        },
    };
    return programInfo
}

function makeTexturedShader(gl) {
        const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTexCoord;

    varying lowp vec2 vTexCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uViewInvMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
        vec4 pos = uProjectionMatrix * uViewInvMatrix * uModelViewMatrix * aVertexPosition;
        gl_Position = normalize(pos);
        vTexCoord = aTexCoord;
    }
  `;

    const fsSource = `
    varying lowp vec2 vTexCoord;
    uniform sampler2D uTexture;

    void main() {
        const lowp float threshold = 0.6;
        gl_FragColor = texture2D(uTexture, vTexCoord);
        if (gl_FragColor[0] < threshold && gl_FragColor[1] < threshold && gl_FragColor[2] < threshold) {
            lowp float minColor  = min(min(gl_FragColor[0], gl_FragColor[1]), gl_FragColor[2]);
            gl_FragColor[3] = mix(0.0, 1.0, minColor);
        }
    }
  `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor:    false,
            texCoord:       gl.getAttribLocation(shaderProgram, 'aTexCoord'),
        },
        uniformLocations: {
            projectionMatrix:   gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewInvMatrix:      gl.getUniformLocation(shaderProgram, 'uViewInvMatrix'),
            modelViewMatrix:    gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            texture:            gl.getUniformLocation(shaderProgram, 'uTexture'),
        },
    };
    return programInfo
}

function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    initGL(gl);

    const simpleShader  = makeSimpleShader(gl)
    const textureShader = makeTexturedShader(gl)

    const planeBuffers  = initPlaneBuffers(gl)
    const cubeBuffers   = initCubeBuffers(gl)
    const catBuffers    = initMeshBuffers(gl, catMeshData)

    const makeRotationUpdate = function(axis, angularSpeed = Math.PI * 0.25) {
        var angle           = 0
        return function(sceneObj, dt) {
            deltaAngle  = angularSpeed * dt
            var rot     = mat4.create()
            mat4.rotate(sceneObj.modelViewMatrix,
                        sceneObj.modelViewMatrix,
                        deltaAngle,
                        axis)
        }
    }
        
    const sunSquare = new SceneObject("sunSquare", textureShader, planeBuffers, makeRotationUpdate([0,0,1], Math.PI * 0.05))
    sunSquare.texture = loadTexture(gl, "sun.jpg")
    mat4.fromRotationTranslationScale(sunSquare.modelViewMatrix, quat.create(),
                                      [-0.0, 0.0, -6.0], [1,1,1])

    const smallSquare = new SceneObject("smallSquare", simpleShader, planeBuffers, makeRotationUpdate([0,0,-1], Math.PI * 0.1))
    mat4.fromRotationTranslationScale(smallSquare.modelViewMatrix, quat.create(),
                                      [0.5, -0.3, -3.0], [0.25, 0.25, 1])

    const cube = new SceneObject("cube", simpleShader, cubeBuffers, makeRotationUpdate(vec3.normalize(vec3.create(), [1,1,-1]),
                                                                               Math.PI * 0.15))
    mat4.fromRotationTranslationScale(cube.modelViewMatrix, quat.create(),
                                      [-2.0, -1.0, -10.0], [1, 1, 1])

    const cat = new SceneObject("cat", simpleShader, catBuffers, makeRotationUpdate(vec3.normalize(vec3.create(), [0,1,0]),
                                                                             Math.PI * 0.1))
    mat4.fromRotationTranslationScale(cat.modelViewMatrix, quat.create(),
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
