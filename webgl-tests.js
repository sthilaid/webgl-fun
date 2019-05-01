// based on https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial

function initGL(gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
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
        vertexCount:    4,
        position:       {buffer: positionBuffer,    comp: 2, type: gl.FLOAT},
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
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position.buffer);
        gl.vertexAttribPointer(this.shaderProgram.attribLocations.vertexPosition,
                               this.buffers.position.comp,
                               this.buffers.position.type,
                               normalize, stride, offset);
        gl.enableVertexAttribArray(this.shaderProgram.attribLocations.vertexPosition);

        // Color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color.buffer);
        gl.vertexAttribPointer(this.shaderProgram.attribLocations.vertexColor,
                               this.buffers.color.comp,
                               this.buffers.color.type,
                               normalize, stride, offset)
        gl.enableVertexAttribArray(this.shaderProgram.attribLocations.vertexColor);

        gl.useProgram(this.shaderProgram.program);

        gl.uniformMatrix4fv(
            this.shaderProgram.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);

        gl.uniformMatrix4fv(
            this.shaderProgram.uniformLocations.modelViewMatrix,
            false,
            this.modelViewMatrix);

        gl.drawArrays(gl.TRIANGLE_STRIP, offset, this.buffers.vertexCount);
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
        vertexColor = aVertexColor;
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

    const buffers = initPlaneBuffers(gl);

    var angle = 0;
    const squareUpdate = function (sceneObj, dt) {
        const angularSpeed = Math.PI
        angle += angularSpeed * dt
        id = mat4.create()
        mat4.rotate(sceneObj.modelViewMatrix,
                    id,
                    angle,
                    [0,0,1])
    };
    const square = new SceneObject(programInfo, buffers, squareUpdate)
    mat4.translate(square.modelViewMatrix,
                   square.modelViewMatrix,
                   [-0.0, 0.0, -6.0]);


    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);


    var then = 0;
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            //square.update(deltaTime)
            square.render(gl, projectionMatrix)
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();
