// code originally inspired by
//     https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
// is written by David St-Hilaire (https://github.com/sthilaid)

const GLConstants = {
    shadowDepthTextureSize: 1024,
}

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

function loadTexture(gl, url="") {
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

  if (url == "")
      return; // only load 1x1 pixel texture

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
        this.id                 = id
        this.shaderObject       = programInfo
        this.buffers            = buffers
        this.texture            = false
        this.updateFn           = updateFn
        this.modelToWorld    = mat4.create()
    }

    update(dt) {
        this.updateFn(this, dt)
    }

    render(gl, shaderObject, worldToProjection, viewPosition, sceneLights=[]) {
        const normalize = false;
        const stride = 0;
        const offset = 0;

        // ---- Vertex buffer
        if (shaderObject.attribLocations.vertexPosition !== false) {
            if (this.buffers.position) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position.buffer);
                gl.vertexAttribPointer(shaderObject.attribLocations.vertexPosition,
                                       this.buffers.position.comp,
                                       this.buffers.position.type,
                                       normalize, stride, offset);
                gl.enableVertexAttribArray(shaderObject.attribLocations.vertexPosition);
            } else {
                gl.disableVertexAttribArray(shaderObject.attribLocations.vertexPosition);
            }
        }

        // ---- indices buffer
        if (this.buffers.indices)
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices.buffer);
        }

        // ---- normals
        if (shaderObject.attribLocations.vertexNormal !== false) {
            if (this.buffers.normal) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal.buffer);
                gl.vertexAttribPointer(shaderObject.attribLocations.vertexNormal,
                                       this.buffers.normal.comp,
                                       this.buffers.normal.type,
                                       normalize, stride, offset)
                gl.enableVertexAttribArray(shaderObject.attribLocations.vertexNormal);
            } else {
                gl.disableVertexAttribArray(shaderObject.attribLocations.vertexNormal);
            }
        }

        // ---- uvs
        if (shaderObject.attribLocations.texCoord !== false) {
            if (this.buffers.uvs) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uvs.buffer);
                gl.vertexAttribPointer(shaderObject.attribLocations.texCoord,
                                       this.buffers.uvs.comp,
                                       this.buffers.uvs.type,
                                       normalize, stride, offset)
                gl.enableVertexAttribArray(shaderObject.attribLocations.texCoord);
            } else {
                gl.disableVertexAttribArray(shaderObject.attribLocations.texCoord);
            }
        }

        // ---- Color buffer
        if (shaderObject.attribLocations.vertexColor !== false) {
            if (this.buffers.color) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color.buffer);
                gl.vertexAttribPointer(shaderObject.attribLocations.vertexColor,
                                       this.buffers.color.comp,
                                       this.buffers.color.type,
                                       normalize, stride, offset)
                gl.enableVertexAttribArray(shaderObject.attribLocations.vertexColor);
            } else {
                gl.disableVertexAttribArray(shaderObject.attribLocations.vertexColor);
            }
        }

        // ---- Shader and uniform inputs
        gl.useProgram(shaderObject.program);

        if (shaderObject.uniformLocations.worldToProjection !== false) {
            gl.uniformMatrix4fv(
                shaderObject.uniformLocations.worldToProjection,
                false,
                worldToProjection);
        }

        if (shaderObject.uniformLocations.modelToWorld !== false) {
            gl.uniformMatrix4fv(
                shaderObject.uniformLocations.modelToWorld,
                false,
                this.modelToWorld);
        }

        const useTexture = this.texture !== false
        if(shaderObject.uniformLocations.useTexture !== false) {
            gl.uniform1i(
                shaderObject.uniformLocations.useTexture,
                useTexture);
        }

        if (useTexture && shaderObject.uniformLocations.texture !== false) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, this.texture)
            gl.uniform1i(shaderObject.uniformLocations.texture, 0)
        }

        if (shaderObject.uniformLocations.viewPosition !== false) {
            gl.uniform3f(shaderObject.uniformLocations.viewPosition,
                         viewPosition[0],
                         viewPosition[1],
                         viewPosition[2])
        }

        if (shaderObject.uniformLocations.lights !== false
            && shaderObject.uniformLocations.lightCount !== false
            && sceneLights.length > 0) {
            gl.uniform1i(shaderObject.uniformLocations.lightCount, sceneLights.length)
            for (var i=0; i < sceneLights.length; ++i) {
                // console.log("light["+i+"] pos: "+sceneLights[i].pos+" dir: "
                //             +sceneLights[i].dir+" type: "+sceneLights[i].type
                //             +" r0: "+sceneLights[i].r0)
                gl.uniformMatrix4fv(shaderObject.uniformLocations.lights[i].worldToLightProj,
                                    false,
                                    sceneLights[i].worldToProjection)

                // shadow map texture using texture slots 10+
                gl.activeTexture(gl.TEXTURE10+i)
                gl.bindTexture(gl.TEXTURE_2D, sceneLights[i].shadowDepthTexture)
                gl.uniform1i(shaderObject.uniformLocations.texture, 10+i)

                gl.uniform3f(shaderObject.uniformLocations.lights[i].pos,
                             sceneLights[i].pos[0],
                             sceneLights[i].pos[1],
                             sceneLights[i].pos[2])
                gl.uniform3f(shaderObject.uniformLocations.lights[i].dir,
                             sceneLights[i].dir[0],
                             sceneLights[i].dir[1],
                             sceneLights[i].dir[2])
                gl.uniform3f(shaderObject.uniformLocations.lights[i].color,
                             sceneLights[i].color[0],
                             sceneLights[i].color[1],
                             sceneLights[i].color[2])
                gl.uniform1i(shaderObject.uniformLocations.lights[i].type, sceneLights[i].type)
                gl.uniform1f(shaderObject.uniformLocations.lights[i].r0, sceneLights[i].r0)
                gl.uniform1f(shaderObject.uniformLocations.lights[i].umbraAngle, sceneLights[i].umbraAngle)
                gl.uniform1f(shaderObject.uniformLocations.lights[i].penumbraAngle, sceneLights[i].penumbraAngle)
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
        this.dir            = vec4.create()
        this.color          = vec3.fromValues(1.0, 1.0, 1.0)
        this.type           = type
        this.r0             = 10.0                      // omni/spot only
        this.umbraAngle     = glMatrix.toRadian(15.0)   // spot only
        this.penumbraAngle  = glMatrix.toRadian(25.0)   // spot only
        this.shadowFramebuffer  = null
        this.renderBuffer       = null
        this.shadowDepthTexture = null
        this.localToProjection  = mat4.ortho(mat4.create(), -20, 20, -20, 20, 0.01, 100) // tbd...
        this.worldToProjection  = mat4.create()
        this.updateData()

        if (this.type < 0 || this.type > 2) {
            alert('Invalid light type: '+this.type)
        }
    }

    init(gl) {
        this.shadowFramebuffer = gl.createFramebuffer()
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer)

        this.shadowDepthTexture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, this.shadowDepthTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                      GLConstants.shadowDepthTextureSize, GLConstants.shadowDepthTextureSize,
                      0, gl.RGBA, gl.UNSIGNED_BYTE, null)

        this.renderBuffer = gl.createRenderbuffer()
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer)
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
                               GLConstants.shadowDepthTextureSize, GLConstants.shadowDepthTextureSize)

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowDepthTexture, 0)
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderBuffer)

        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.bindRenderbuffer(gl.RENDERBUFFER, null)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    update(dt) {
        if (this.updateFn !== false) {
            this.updateFn(this, dt)
        }
        this.updateData()
    }

    updateData() {
        vec4.transformMat4(this.dir, vec4.fromValues(0,0,-1,0), this.localToWorld)
        vec3.normalize(this.dir, this.dir)
        mat4.getTranslation(this.pos, this.localToWorld)

        const worldToLocal     = mat4.invert(mat4.create(), this.localToWorld)
        this.worldToProjection = mat4.multiply(mat4.create(), this.localToProjection, worldToLocal)
    }
}

class Scene {
    constructor(camera, objects, lights=[], shadowShader=null) {
        this.camera         = camera
        this.objects        = objects
        this.lights         = lights
        this.shadowShader   = shadowShader

        if (!(camera instanceof Camera)) {
            console.error("no Camera instance defined in scene")
        }

        if (!(objects instanceof Array)) {
            console.error("no objects defined in scene")
        } 
    }

    init(gl) {
        this.lights.forEach(l => l.init(gl))
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

    renderShadows(gl) {
        if (this.lights == false || this.shadowShader == null)
            return

        const thisScene = this
        this.lights.forEach(function(light) {
            gl.useProgram(thisScene.shadowShader.program)
            gl.bindFramebuffer(gl.FRAMEBUFFER, thisScene.shadowFramebuffer)
            gl.viewport(0, 0, GLConstants.shadowDepthTextureSize, GLConstants.shadowDepthTextureSize)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            if (thisScene.objects !== false) {
                thisScene.objects.forEach(obj => obj.render(gl, thisScene.shadowShader, light.worldToProjection, light.pos))
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        })
    }

    renderScene(gl) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        if (this.objects !== false) {
            const viewPosition = this.camera.matrix
            this.objects.forEach(obj => obj.render(gl, obj.shaderObject, this.camera.worldToProjection,
                                                   this.camera.viewPosition, this.lights))
        } else {
            console.warn("No scene objects registered...")
        }
    }

    render(gl) {
        this.renderShadows(gl)
        this.renderScene(gl)
    }
}

