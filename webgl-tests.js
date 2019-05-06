// based on https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
function initGL(gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    // gl.clearDepth(-1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    // gl.depthFunc(gl.GEQUAL);            // Near things obscure far things
}

function initShaderProgram(gl, vsSource, fsSource) {
    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader      = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader    = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram     = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}


function initPlaneBuffers(gl) {
    const positions = [
        1.0,  1.0,
        -1.0,  1.0,
        1.0, -1.0,
        -1.0, -1.0,
    ];
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const colors = [
        0.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 0.0, 1.0,
    ];
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        type:           gl.TRIANGLE_STRIP,
        vertexCount:    4,
        position:       {buffer: positionBuffer,    comp: 2, type: gl.FLOAT},
        indices:        false,
        color:          {buffer: colorBuffer,       comp: 4, type: gl.FLOAT},
    };
}


function initCubeBuffers(gl) {
    const positions = [1.0, 1.0, 1.0,       // 0
                       1.0, -1.0, 1.0,      // 1
                       -1.0, 1.0, 1.0,      // 2
                       -1.0, -1.0, 1.0,     // 3
                       1.0, 1.0, -1.0,      // 4
                       1.0, -1.0, -1.0,     // 5
                       -1.0, 1.0, -1.0,     // 6
                       -1.0, -1.0, -1.0,    // 7
    ];
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const indices = [0, 1, 3, 0, 3, 2, // front
                     0, 5, 1, 0, 4, 5, // right
                     4, 6, 7, 4, 7, 5, // back
                     6, 2, 3, 6, 3, 7, // left
                     6, 4, 0, 6, 0, 2, // top
                     1, 5, 7, 1, 7, 3, // bottom
    ];
    const indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    const colors = [
        0.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 0.0, 1.0,
        1.0, 0.0, 1.0, 1.0,
        1.0, 1.0, 0.0, 1.0,
        1.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 1.0, 1.0,
    ];
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        type:           gl.TRIANGLES,
        vertexCount:    indices.length,
        position:       {buffer: positionBuffer,    comp: 3, type: gl.FLOAT},
        indices:        {buffer: indicesBuffer,     comp: 3, type: gl.UNSIGNED_SHORT},
        color:          {buffer: colorBuffer,       comp: 4, type: gl.FLOAT},
    };
}

function initMeshBuffers(gl, meshData) {
    mesh = new OBJ.Mesh(meshData)
    OBJ.initMeshBuffers(gl, mesh)

    // mesh.normalBuffer
    // mesh.textureBuffer
    // mesh.vertexBuffer
    // mesh.indexBuffer

    const vertexCount = mesh.indexBuffer.numItems

    // --- temp ---
    var vertexColors = []
    for (i=0; i<vertexCount; ++i) {
        vertexColors = vertexColors.concat([Math.random(), Math.random(), Math.random(), 1.0])
    }
    // ---

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);

    return {
        type:           gl.TRIANGLES,
        vertexCount:    vertexCount,
        position:       {buffer: mesh.vertexBuffer, comp: 3, type: gl.FLOAT},
        indices:        {buffer: mesh.indexBuffer,  comp: 3, type: gl.UNSIGNED_SHORT},
        color:          {buffer: colorBuffer,       comp: 4, type: gl.FLOAT},
    };
}

class SceneObject {
    constructor(programInfo, buffers, updateFn) {
        this.shaderProgram      = programInfo;
        this.buffers            = buffers;
        this.updateFn           = updateFn;
        this.modelViewMatrix    = mat4.create();
    }

    update(dt) {
        this.updateFn(this, dt)
    }

    render(gl, projectionMatrix) {
        const normalize = false;
        const stride = 0;
        const offset = 0;

        // Vertex buffer
        if (this.buffers.position)
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position.buffer);
            gl.vertexAttribPointer(this.shaderProgram.attribLocations.vertexPosition,
                                   this.buffers.position.comp,
                                   this.buffers.position.type,
                                   normalize, stride, offset);
            gl.enableVertexAttribArray(this.shaderProgram.attribLocations.vertexPosition);
        }

        // indices buffer
        if (this.buffers.indices)
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices.buffer);
        }

        // Color buffer
        if (this.buffers.color)
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color.buffer);
            gl.vertexAttribPointer(this.shaderProgram.attribLocations.vertexColor,
                                   this.buffers.color.comp,
                                   this.buffers.color.type,
                                   normalize, stride, offset)
            gl.enableVertexAttribArray(this.shaderProgram.attribLocations.vertexColor);
        }

        gl.useProgram(this.shaderProgram.program);

        gl.uniformMatrix4fv(
            this.shaderProgram.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);

        gl.uniformMatrix4fv(
            this.shaderProgram.uniformLocations.modelViewMatrix,
            false,
            this.modelViewMatrix);

        if (this.buffers.indices)
            gl.drawElements(this.buffers.type, this.buffers.vertexCount, this.buffers.indices.type, offset);
        else
            gl.drawArrays(this.buffers.type, offset, this.buffers.vertexCount);
    }
}

function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    initGL(gl);

    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    //out vec4 outColor;
    varying lowp vec4 vertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        //vertexColor = aVertexColor;
        float col = mix(0.0, 1.0, gl_Position.z/10.0);
        vertexColor = vec4(col, col, col, 1);
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
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    const planeBuffers  = initPlaneBuffers(gl)
    const cubeBuffers   = initCubeBuffers(gl)
    const catBuffers    = initMeshBuffers(gl, catMeshData)

    const makeRotationUpdate = function(axis) {
        const angularSpeed  = Math.PI * 0.25
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
        
    const square = new SceneObject(programInfo, planeBuffers, makeRotationUpdate([0,0,1]))
    mat4.translate(square.modelViewMatrix,
                   square.modelViewMatrix,
                   [-0.0, 0.0, -6.0]);

    const smallSquare = new SceneObject(programInfo, planeBuffers, makeRotationUpdate([0,0,-1]))
    mat4.fromScaling(smallSquare.modelViewMatrix,
                     [0.5, 0.5, 1])
    mat4.translate(smallSquare.modelViewMatrix,
                   smallSquare.modelViewMatrix,
                   [-0.5, 0.5, -5.0]);

    const cube = new SceneObject(programInfo, cubeBuffers, makeRotationUpdate(vec3.normalize(vec3.create(), [1,1,-1])))
    mat4.fromScaling(cube.modelViewMatrix,
                     [0.25, 0.25, 0.25])
    mat4.translate(cube.modelViewMatrix,
                   cube.modelViewMatrix,
                   [-.5, .0, -15.0]);

    const cat = new SceneObject(programInfo, catBuffers, makeRotationUpdate(vec3.normalize(vec3.create(), [0,1,0])))
    mat4.fromScaling(cat.modelViewMatrix,
                     [0.001, 0.001, 0.001])
    mat4.translate(cat.modelViewMatrix,
                   cat.modelViewMatrix,
                   [500, -500, -2000.0]);


    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100000.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);
    // mat4.ortho(projectionMatrix,
    //           -10, 10, -10, 10, 0.001, 10000)
    var then = 0;
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            square.update(deltaTime)
            square.render(gl, projectionMatrix)

            smallSquare.update(deltaTime)
            smallSquare.render(gl, projectionMatrix)

            cube.update(deltaTime)
            cube.render(gl, projectionMatrix)

            cat.update(deltaTime)
            cat.render(gl, projectionMatrix)
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main()
