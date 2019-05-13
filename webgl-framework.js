// code inspired by:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
// rest is written by David St-Hilaire (https://github.com/sthilaid)

function initGL(gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0)   // Clear to black, fully opaque

    gl.enable(gl.DEPTH_TEST)            // Enable depth testing
    gl.clearDepth(1.0)
    gl.depthFunc(gl.LESS)               // smaller z is closer

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
}

function initShaderProgram(gl, vsSource, fsSource) {
    function loadShader(gl, type, source, debugTxt="") {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the '+debugTxt+'shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader      = loadShader(gl, gl.VERTEX_SHADER, vsSource, "vertex ");
    const fragmentShader    = loadShader(gl, gl.FRAGMENT_SHADER, fsSource, "fragment ");

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

class ShaderObject {
    constructor(shaderProgram) {
        this.program = shaderProgram
        this.attribLocations = {
            vertexPosition: false,
            vertexNormal:   false,
            vertexColor:    false,
            texCoord:       false,
        }
        this.uniformLocations = {
            worldToProjection:  false,
            modelToWorld:       false,
            useTexture:         false,
            texture:            false,
            lights:             false,
            lightCount:         false,
            viewPosition:       false,
        }
    }
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  const image = new Image();
  image.crossOrigin = "Anonymous"
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       // No, it's not a power of 2. Turn off mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
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

    const normals = [
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
    ];
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const uvs = [
        1.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,
    ];
    const uvBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)

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
        normal:         {buffer: normalBuffer,      comp: 4, type: gl.FLOAT},
        uvs:            {buffer: uvBuffer,          comp: 2, type: gl.FLOAT},
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

    const normVal = 0.5773502588272095
    const normals = [normVal, normVal, normVal,    0.0,    // 0
                     normVal, -normVal, normVal,   0.0,   // 1
                     -normVal, normVal, normVal,  0.0,  // 2
                     -normVal, -normVal, normVal,  0.0,  // 3
                     normVal, normVal, -normVal,   0.0,   // 4
                     normVal, -normVal, -normVal,  0.0,  // 5
                     -normVal, normVal, -normVal,  0.0,  // 6
                     -normVal, -normVal, -normVal,     0.0, // 7
    ];
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

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
        normal:         {buffer: normalBuffer,      comp: 4, type: gl.FLOAT},
        uvs:            false,
        indices:        {buffer: indicesBuffer,     comp: 3, type: gl.UNSIGNED_SHORT},
        color:          {buffer: colorBuffer,       comp: 4, type: gl.FLOAT},
    };
}

function initMeshBuffers(gl, meshData) {
    mesh = new OBJ.Mesh(meshData)
    if (!OBJ.areNormalValid) {
        OBJ.generateNormals(mesh)
        //console.log("generated normals: "+mesh.vertexNormals)
    }
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
        normal:         {buffer: mesh.normalBuffer, comp: 3, type: gl.FLOAT},
        uvs:            false,
        indices:        {buffer: mesh.indexBuffer,  comp: 3, type: gl.UNSIGNED_SHORT},
        color:          {buffer: colorBuffer,       comp: 4, type: gl.FLOAT},
    };
}

class Camera {
    constructor(initMatrix, projMatrix, updateFn) {
        this.localToWorld       = initMatrix
        this.projMatrix         = projMatrix
        this.updateFn           = updateFn
        this.worldToLocal       = mat4.create()
        this.worldToProjection  = mat4.create()
        this.viewPosition       = vec3.create()
        mat4.invert(this.worldToLocal, this.localToWorld)
    }

    update(dt) {
        if (this.updateFn !== false)
            this.updateFn(this.localToWorld, dt)

        mat4.invert(this.worldToLocal, this.localToWorld)
        mat4.multiply(this.worldToProjection, this.projMatrix, this.worldToLocal)
        mat4.getTranslation(this.viewPosition, this.localToWorld)
    }
}

class SceneObject {
    constructor(id, programInfo, buffers, updateFn) {
        this.shaderObject       = programInfo;
        this.buffers            = buffers;
        this.texture            = false
        this.updateFn           = updateFn;
        this.modelToWorld    = mat4.create();
    }

    update(dt) {
        this.updateFn(this, dt)
    }

    render(gl, worldToProjection, viewPosition, sceneLights) {
        const normalize = false;
        const stride = 0;
        const offset = 0;

        // ---- Vertex buffer
        if (this.shaderObject.attribLocations.vertexPosition !== false) {
            if (this.buffers.position) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position.buffer);
                gl.vertexAttribPointer(this.shaderObject.attribLocations.vertexPosition,
                                       this.buffers.position.comp,
                                       this.buffers.position.type,
                                       normalize, stride, offset);
                gl.enableVertexAttribArray(this.shaderObject.attribLocations.vertexPosition);
            } else {
                gl.disableVertexAttribArray(this.shaderObject.attribLocations.vertexPosition);
            }
        }

        // ---- indices buffer
        if (this.buffers.indices)
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices.buffer);
        }

        // ---- normals
        if (this.shaderObject.attribLocations.vertexNormal !== false) {
            if (this.buffers.normal) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal.buffer);
                gl.vertexAttribPointer(this.shaderObject.attribLocations.vertexNormal,
                                       this.buffers.normal.comp,
                                       this.buffers.normal.type,
                                       normalize, stride, offset)
                gl.enableVertexAttribArray(this.shaderObject.attribLocations.vertexNormal);
            } else {
                gl.disableVertexAttribArray(this.shaderObject.attribLocations.vertexNormal);
            }
        }

        // ---- uvs
        if (this.shaderObject.attribLocations.texCoord !== false) {
            if (this.buffers.uvs) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uvs.buffer);
                gl.vertexAttribPointer(this.shaderObject.attribLocations.texCoord,
                                       this.buffers.uvs.comp,
                                       this.buffers.uvs.type,
                                       normalize, stride, offset)
                gl.enableVertexAttribArray(this.shaderObject.attribLocations.texCoord);
            } else {
                gl.disableVertexAttribArray(this.shaderObject.attribLocations.texCoord);
            }
        }

        // ---- Color buffer
        if (this.shaderObject.attribLocations.vertexColor !== false) {
            if (this.buffers.color) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color.buffer);
                gl.vertexAttribPointer(this.shaderObject.attribLocations.vertexColor,
                                       this.buffers.color.comp,
                                       this.buffers.color.type,
                                       normalize, stride, offset)
                gl.enableVertexAttribArray(this.shaderObject.attribLocations.vertexColor);
            } else {
                gl.disableVertexAttribArray(this.shaderObject.attribLocations.vertexColor);
            }
        }

        // ---- Shader and uniform inputs
        gl.useProgram(this.shaderObject.program);

        gl.uniformMatrix4fv(
            this.shaderObject.uniformLocations.worldToProjection,
            false,
            worldToProjection);

        gl.uniformMatrix4fv(
            this.shaderObject.uniformLocations.modelToWorld,
            false,
            this.modelToWorld);

        const useTexture = this.texture !== false
        if(this.shaderObject.uniformLocations.useTexture !== false) {
            gl.uniform1i(
                this.shaderObject.uniformLocations.useTexture,
                useTexture);
        }

        if (useTexture && this.shaderObject.uniformLocations.texture !== false) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, this.texture)
            gl.uniform1i(this.shaderObject.uniformLocations.texture, 0)
        }

        if (this.shaderObject.uniformLocations.viewPosition !== false) {
            gl.uniform3f(this.shaderObject.uniformLocations.viewPosition,
                         viewPosition[0],
                         viewPosition[1],
                         viewPosition[2])
        }

        if (this.shaderObject.uniformLocations.lights !== false
            && this.shaderObject.uniformLocations.lightCount !== false
            && sceneLights.length > 0) {
            gl.uniform1i(this.shaderObject.uniformLocations.lightCount, sceneLights.length)
            for (var i=0; i < sceneLights.length; ++i) {
                gl.uniform3f(this.shaderObject.uniformLocations.lights[i].pos,
                             sceneLights[i].pos[0],
                             sceneLights[i].pos[1],
                             sceneLights[i].pos[2])
                gl.uniform3f(this.shaderObject.uniformLocations.lights[i].dir,
                             sceneLights[i].dir[0],
                             sceneLights[i].dir[1],
                             sceneLights[i].dir[2])
                gl.uniform1i(this.shaderObject.uniformLocations.lights[i].type, sceneLights[i].type)
            }
        }

        // ---- draw call
        if (this.buffers.indices)
            gl.drawElements(this.buffers.type, this.buffers.vertexCount, this.buffers.indices.type, offset);
        else
            gl.drawArrays(this.buffers.type, offset, this.buffers.vertexCount);
    }
}

const LightTypes = {"directional" : 0, "omni" : 1, "spot" : 2}
class Light {
    constructor(initMat, type, updateFn) {
        this.localToWorld   = initMat
        this.updateFn       = updateFn
        this.pos            = vec3.create()
        this.dir            = vec3.create()
        this.type           = type
        this.updateData()

        if (this.type < 0 || this.type > 2) {
            alert('Invalid light type: '+this.type)
        }
    }

    update(dt) {
        if (this.updateFn !== false) {
            this.updateFn(this.localToWorld, dt)
        }
        this.updateData()
    }

    updateData() {
        vec3.transformMat4(this.dir, vec3.fromValues(0,0,1), this.localToWorld)
        vec3.normalize(this.dir, this.dir)
        mat4.getTranslation(this.pos, this.localToWorld)
    }
}

class Scene {
    constructor(camera, objects, lights=[]) {
        this.camera         = camera
        this.objects        = objects
        this.lights         = lights

        if (!(camera instanceof Camera)) {
            console.error("no Camera instance defined in scene")
        }

        if (!(objects instanceof Array)) {
            console.error("no objects defined in scene")
        } 
    }

    update(dt) {
        if (this.objects !== false) {
            this.objects.forEach(obj => obj.update(dt))
        } else {
            console.warn("No scene objects registered...")
        }
        if (this.camera !== false) {
            this.camera.update(dt)
        } else {
            console.warn("No scene camera registered...")
        }
        if (this.lights !== false) {
            this.lights.forEach(l => l.update(dt))
        } else {
            console.warn("No scene lights registered...")
        }
    }

    render(gl) {
        if (this.objects !== false) {
            const viewPosition = this.camera.matrix
            this.objects.forEach(obj => obj.render(gl, this.camera.worldToProjection, this.camera.viewPosition, this.lights))
        } else {
            console.warn("No scene objects registered...")
        }
    }
}
