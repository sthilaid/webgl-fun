class ObjectBuffers {
    constructor() {
        this.type       = false
        this.vertexCount= false
        this.position   = false
        this.normal     = false
        this.uvs        = false
        this.indices    = false
        this.color      = false
    }
}
class WebGLMesh {
    static initPlaneBuffers(gl, width=1.0, height=1.0, color=vec4.fromValues(1.0, 1.0, 1.0, 1.0)) {
        const positions = [
            width,  height,
            -width,  height,
            width, -height,
            -width, -height,
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
            ...color,
            ...color,
            ...color,
            ...color,
        ];
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        var bufObject = new ObjectBuffers()
        bufObject.type          = gl.TRIANGLE_STRIP
        bufObject.vertexCount   = 4
        bufObject.position      = {buffer: positionBuffer,    comp: 2, type: gl.FLOAT}
        bufObject.normal        = {buffer: normalBuffer,      comp: 4, type: gl.FLOAT}
        bufObject.uvs           = {buffer: uvBuffer,          comp: 2, type: gl.FLOAT}
        bufObject.color         = {buffer: colorBuffer,       comp: 4, type: gl.FLOAT}

        return bufObject;
    }


    static initCubeBuffers(gl, sideLength = 1) {
        const delta = sideLength * 0.5
        const positions = [delta, delta, delta,       // 0
                           delta, -delta, delta,      // 1
                           -delta, delta, delta,      // 2
                           -delta, -delta, delta,     // 3
                           delta, delta, -delta,      // 4
                           delta, -delta, -delta,     // 5
                           -delta, delta, -delta,     // 6
                           -delta, -delta, -delta,    // 7
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

        var bufObject = new ObjectBuffers()
        bufObject.type          = gl.TRIANGLES
        bufObject.vertexCount   = indices.length
        bufObject.position      = {buffer: positionBuffer,    comp: 3, type: gl.FLOAT}
        bufObject.normal        = {buffer: normalBuffer,      comp: 4, type: gl.FLOAT}
        bufObject.indices       = {buffer: indicesBuffer,     comp: 3, type: gl.UNSIGNED_SHORT}
        bufObject.color         = {buffer: colorBuffer,       comp: 4, type: gl.FLOAT}
        return bufObject
    }

    static initSphereBuffers(gl, radius, subdivisions = 0, color=null) {
        const octahedroneVertices = [0.0, -radius,  0.0,
                                     radius,  0.0,  0.0,
                                     0.0,  0.0,  radius,
                                     -radius,  0.0,  0.0,
                                     0.0,  0.0, -radius,
                                     0.0,  radius,  0.0,
                                    ]

        var sphereVertices = octahedroneVertices

        const octahedroneIndices = [0,    1,    2,
                                    0,    2,    3,
                                    0,    3,    4,
                                    0,    4,    1,
                                    1,    5,    2,
                                    2,    5,    3,
                                    3,    5,    4,
                                    4,    5,    1,
                                   ]
        var sphereIndices = octahedroneIndices

        for (var i=0; i<subdivisions; ++i) {
            var newIndices = [] // start fresh
            const triCount = sphereIndices.length / 3
            for (var triIndex = 0; triIndex < triCount; ++triIndex) {
                const triIndices = [sphereIndices[triIndex*3],
                                    sphereIndices[triIndex*3+1],
                                    sphereIndices[triIndex*3+2]]
                var newVertices = []
                for (var edge = 0; edge < 3; ++edge) {
                    const v1Index = triIndices[edge]*3
                    const v1 = vec3.fromValues(sphereVertices[v1Index],
                                               sphereVertices[v1Index+1],
                                               sphereVertices[v1Index+2])
                    const v2Index = triIndices[(edge+1)%3]*3
                    const v2 = vec3.fromValues(sphereVertices[v2Index],
                                               sphereVertices[v2Index+1],
                                               sphereVertices[v2Index+2])
                    // console.log("triIndex/edgeIndex: "+triIndex+"/"+edge+" triIndices: "+triIndices+" v1Index: "+v1Index+" v2Index: "+v2Index)
                    var delta = vec3.subtract(vec3.create(), v2, v1)
                    vec3.scale(delta, delta, 0.5)
                    var newVert = vec3.add(vec3.create(), v1, delta)
                    const newVertDir = vec3.normalize(vec3.create(), newVert)
                    vec3.scale(newVert, newVertDir, radius)
                    // console.log("triIndex: "+triIndex+" v1: "+v1+" v2: "+v2+" newVert: "+newVert)
                    // console.log("newVert: "+newVert+" <= delta: "+delta+" newVertDir: " +newVertDir)
                    newVertices = newVertices.concat([newVert[0], newVert[1], newVert[2]])
                }

                // todo, optimize by checking if those vertices where added already
                sphereVertices = sphereVertices.concat(newVertices)
                const newVertCount = sphereVertices.length / 3
                const newVerticesIndices = [newVertCount - 3,
                                            newVertCount - 2,
                                            newVertCount - 1]
                newIndices = newIndices.concat([
                    triIndices[0], newVerticesIndices[2], newVerticesIndices[0], 
                    newVerticesIndices[0], newVerticesIndices[1], triIndices[1], 
                    newVerticesIndices[2], triIndices[2], newVerticesIndices[1], 
                    newVerticesIndices[0], newVerticesIndices[2], newVerticesIndices[1], 
                ])
            }
            sphereIndices = [...newIndices] // copy back
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertices), gl.STATIC_DRAW);
        
        const indicesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereIndices), gl.STATIC_DRAW);

        var sphereNormals = []
        const vertCount = sphereVertices.length / 3
        for (var vertIndex=0; vertIndex<vertCount; ++vertIndex) {
            const compIndex = vertIndex * 3
            const v = vec4.fromValues(sphereVertices[compIndex],
                                      sphereVertices[compIndex+1],
                                      sphereVertices[compIndex+2],
                                      0.0)
            const n = vec4.normalize(vec4.create(), v)
            sphereNormals = sphereNormals.concat([n[0], n[1], n[2], n[3]])
        }

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);

        var sphereColors = []
        for (var vertIndex=0; vertIndex<vertCount; ++vertIndex) {
            const vertColor = color != null ? [color[0], color[1], color[2], color[3]]
                                            : [Math.random(), Math.random(), Math.random(), 1.0]
            sphereColors = sphereColors.concat(vertColor)
        }

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereColors), gl.STATIC_DRAW);

        // console.log("[sphere] vert count: "+sphereVertices.length / 3+" triangle count: "+sphereIndices.length / 3)
        // console.log("[sphere] ---- vertices ----");
        // for (var i=0; i<sphereVertices.length; ++i) {
        //     console.log("sphereVertices["+i+"]: "+sphereVertices[i])
        // }
        // console.log("[sphere] ---- indices ----")
        // for (var i=0; i<sphereIndices.length; i+=3) {
        //     console.log("sphereIndices["+i+", "+(i+1)+", "+(i+2)+"]: "
        //                 +sphereIndices[i]+", "
        //                 +sphereIndices[i+1]+", "
        //                 +sphereIndices[i+2])
        // }
        // console.log("[sphere] ---- triangles ----")
        // for (var i=0; i<sphereIndices.length / 3; ++i) {
        //     var index = i * 3
        //     const v0Index = sphereIndices[index]*3
        //     const v1Index = sphereIndices[index+1]*3
        //     const v2Index = sphereIndices[index+2]*3
        //     console.log("t"+i+"["+v0Index+","+v1Index+","+v2Index+"] "
        //                 +"("+sphereVertices[v0Index].toFixed(2)+", "
        //                 + sphereVertices[v0Index+1].toFixed(2)+", "
        //                 + sphereVertices[v0Index+2].toFixed(2)+") | "
        //                 +"("+sphereVertices[v1Index].toFixed(2)+", "
        //                 + sphereVertices[v1Index+1].toFixed(2)+", "
        //                 + sphereVertices[v1Index+2].toFixed(2)+") | "
        //                 +"("+sphereVertices[v2Index].toFixed(2)+", "
        //                 + sphereVertices[v2Index+1].toFixed(2)+", "
        //                 + sphereVertices[v2Index+2].toFixed(2)+") | "
        //                )
        // }

        var bufObject = new ObjectBuffers()
        bufObject.type          = gl.TRIANGLES
        bufObject.vertexCount   = sphereIndices.length,
        bufObject.position      = {buffer: positionBuffer,    comp: 3, type: gl.FLOAT}
        bufObject.normal        = {buffer: normalBuffer,      comp: 4, type: gl.FLOAT}
        bufObject.indices       = {buffer: indicesBuffer,     comp: 3, type: gl.UNSIGNED_SHORT}
        bufObject.color         = {buffer: colorBuffer,       comp: 4, type: gl.FLOAT}
        return bufObject
    }

    static initMeshBuffers(gl, meshData) {
        var mesh = new OBJ.Mesh(meshData)
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
        for (var i=0; i<vertexCount; ++i) {
            vertexColors = vertexColors.concat([Math.random(), Math.random(), Math.random(), 1.0])
        }
        // ---

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);

        var bufObject = new ObjectBuffers()
        bufObject.type          = gl.TRIANGLES
        bufObject.vertexCount   = vertexCount
        bufObject.position      = {buffer: mesh.vertexBuffer, comp: 3, type: gl.FLOAT}
        bufObject.normal        = {buffer: mesh.normalBuffer, comp: 3, type: gl.FLOAT}
        bufObject.indices       = {buffer: mesh.indexBuffer,  comp: 3, type: gl.UNSIGNED_SHORT}
        bufObject.color         = {buffer: colorBuffer,       comp: 4, type: gl.FLOAT}
        return bufObject
    }
}
