var gl;
var program;

var N = 32; // The number of cubes will be (2N+1)^3

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var theta = [0, 0, 0];
var paused = 1;
var depthTest = 1;

function rotateZ() {
    paused = 0;
    axis = zAxis;
}


// ModelView and Projection matrices
var modelingLoc, viewingLoc, projectionLoc, lightMatrixLoc;
var modeling, viewing, projection;

var volumeLoc;

var numVertices = 36;

var pointsArray = [];
var colorsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var texture;

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 0),
    vec2(1, 1),
    vec2(1, 0),
    vec2(0, 1)
];

var angles = [];
var rangles = [];

var eyePosition = vec4(0, 0, 2, 0);
var lightPosition = vec4(0.0, 100.0, 200.0, 1.0);
var moonRotationMatrix = translate(0, 0, 0);

var materialAmbient = vec4(0.25, 0.25, 0.25, 1.0);
var materialDiffuse = vec4(0.8, 0.8, 0.8, 1.0);
var materialSpecular = vec4(1.0, 0.0, 0.0, 1.0);
var materialShininess = 100.0;

function initAngle() {
    // clear
    angles = [];

    var nn = 2 * N + 1;
    var angle_step = 2 * Math.PI / nn;

    for (i = -N; i <= N; i++) {
        angles.push(angle_step * i);
    }

    angles.push(angle_step * -N);
}

function initPoints() {
    // clear
    pointsArray = [];

    for (i = -N; i <= N + 2; i++) {
        pointsArray.push(vec2(Math.cos(angles[i + N]), Math.sin(angles[i + N])));
    }
}

function initArray() {
    var t = 2 * N + 1;
    t *= 6;
    for (i = 0; i < t; i++) {
        colorsArray.push(vec4(0.9, 0.6, 0.5, 0.5));
        normalsArray.push(vec4(0.0, 0.0, 1.0, 1.0));
        texCoordsArray.push(texCoord[i % 6]);
    }
}

function initAttribute(arr, attr, unit) {
    // config buffer
     var b = gl.createBuffer();
     if(!b) {
         console.log('Fail to create buffer [' + attr + ']');
         return -1;
     }
     gl.bindBuffer(gl.ARRAY_BUFFER, b);
     gl.bufferData(gl.ARRAY_BUFFER, flatten(arr), gl.STATIC_DRAW);
 
     // enable attribute
     var a = gl.getAttribLocation(program, attr);
     if(a<0) {
         console.log('Fail to get attribute location [' + attr + ']');
         return -1;
     }
     gl.vertexAttribPointer(a, unit, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a);
 }

function isPowerOf2(x) { return (x & (x-1)) == 0; }

function configureTexture(image) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if(isPowerOf2(image.height) && isPowerOf2(image.width))
    {
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }

    gl.uniform1i(gl.getUniformLocation(program, 'texture'), 0);
}

var analyser;
var frequencyData = new Uint8Array();

function initObject(pos, color, normal, tex) {
    initAttribute(pos, 'vPosition', 2);
    initAttribute(color, 'vColor', 4);
    initAttribute(normal, 'vNormal', 4);
    initAttribute(tex, 'vTexCoord', 2);
}

var vs = [];
var ta, tb;
var bg, image;
var ds = [];

function configUniform()
{
    // uniform variables in shaders
    modelingLoc = gl.getUniformLocation(program, 'modelingMatrix');
    viewingLoc = gl.getUniformLocation(program, 'viewingMatrix');
    projectionLoc = gl.getUniformLocation(program, 'projectionMatrix');
    lightMatrixLoc = gl.getUniformLocation(program, 'lightMatrix');

    gl.uniform4fv(gl.getUniformLocation(program, 'eyePosition'),
        flatten(eyePosition));
    gl.uniform4fv(gl.getUniformLocation(program, 'lightPosition'),
        flatten(lightPosition));
    gl.uniform4fv(gl.getUniformLocation(program, 'materialAmbient'),
        flatten(materialAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, 'materialDiffuse'),
        flatten(materialDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, 'materialSpecular'),
        flatten(materialSpecular));
    gl.uniform1f(gl.getUniformLocation(program, 'shininess'), materialShininess);
}

function initRing() {
    canvas = $('#mainCanvas').get(0);

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert('WebGL isn\'t available');
    }

    // Experimenting with HTML5 audio
    var context = new AudioContext();
    var audio = document.getElementById('myAudio');
    var audioSrc = context.createMediaElementSource(audio);
    var sourceJs = context.createScriptProcessor(2048); // createJavaScriptNode() deprecated.

    analyser = context.createAnalyser();

    // we could configure the analyser: e.g. analyser.fftSize (for further infos read the spec)
    analyser.smoothingTimeConstant = 0.6;
    analyser.fftSize = 2048;

    // we have to connect the MediaElementSource with the analyser 
    audioSrc.connect(analyser);
    analyser.connect(sourceJs);
    sourceJs.buffer = audioSrc.buffer;
    sourceJs.connect(context.destination);
    audioSrc.connect(context.destination);

    sourceJs.onaudioprocess = function (e) {
        // frequencyBinCount tells you how many values you'll receive from the analyser
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);
    };

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.05, 0.1, 1.0);
    // gl.clearColor(1, 1, 1, 1.0);

    //  Load shaders and initialize attribute buffers
    program = initShaders(gl, 'no-transform-vertex-shader', 'pure-color-fragment-shader');
    gl.useProgram(program);

    initAngle();
    initArray();
    initPoints();
    initObject(pointsArray, colorsArray, normalsArray, texCoordsArray);
    configUniform();

    // Initialize a texture
    // image = new Image();
    // image.onload = function () {
    //     configureTexture(image);
    // };
    // image.src = 'tex.png';
    // bg = new Image();
    // bg.onload = function () {
    //     configureTexture(bg);
    // };
    // bg.src = 'bg.jpg';

    //event listeners for buttons 
    document.getElementById('zButton').onclick = rotateZ;

    // initAttrtest();
    initDS();
    renderRing();
}

// p % q
function __mod(p, q)
{
    while(p <= 0) p += q;
    return p % q;
}

function getFrqData()
{
    var N2 = 2*N + 1;
    var r = [];
    var t;
    var k = Math.floor(256 / N2);

    for (i = -N; i <= N; i++) {
        t = (frequencyData[k * (i + N)]) - 64;
        t = t / (1024);
        if (isNaN(t)) t = 0.005;
        t = Math.max(0.005, t);
        r.push(t);
    }

    return r;
}

var sz = 5;
function initDS()
{
    for(var k=0 ; k<sz-1 ; k++)
    {
        ds.push(getFrqData());
    }
}


function renderRing() {
    modeling = 
        mult(rotate(theta[xAxis], 1, 0, 0),
        mult(rotate(theta[yAxis], 0, 1, 0),
        rotate(theta[zAxis], 0, 0, 1)));

    //if (paused)	modeling = moonRotationMatrix;

    viewing = lookAt(vec3(eyePosition), [0, 0, 0], [0, 1, 0]);

    projection = perspective(45, 1.0, 1.0, 3.0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!paused) theta[axis] += 0.1;
    if (depthTest) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);

    gl.uniformMatrix4fv(modelingLoc, 0, flatten(modeling));
    gl.uniformMatrix4fv(viewingLoc, 0, flatten(viewing));
    gl.uniformMatrix4fv(projectionLoc, 0, flatten(projection));
    gl.uniformMatrix4fv(lightMatrixLoc, 0, flatten(moonRotationMatrix));

    // update data in frequencyData
    // analyser.getByteFrequencyData(frequencyData);

    // Uncomment the next line to see the frequencyData[] in the console
    // console.log(frequencyData);

    // renderBackground();
    // image.src = 'tex.jpg';
    // configureTexture(image);

    var N2 = 2 * N + 1;
    var dis = 0.5;
    var d = getFrqData();

    // normalize array
    // var sum = d.reduce((p, q)=> p+q, 0);
    // // sum /= 2;
    // for(i=0 ; i<N2 ; i++)
    // {
    //     d[i] /= sum;
    // }

    // var conv = [0.1, 0.2, 0.4, 0.2, 0.1];
    // for (i = 0; i < N2 ; i++)
    // {
    //     t = 0;
    //     for(j=-2 ; j<=2 ; j++)
    //     {
    //         t += (d[__mod(i + j, N2)] * conv[j + 2]);
    //     }
    //     dd.push(t);
    // }

    vs = [];

    for (i = 0; i < N2 ; i++) {
        var td = d[i];
        for(j=0 ; j<sz-1 ; j++) td += ds[j][i];
        td /= sz;

        var up = vec2(dis + td, dis + td);
        var down = vec2(dis - td, dis - td);

        ta = [mult(pointsArray[i], up), mult(pointsArray[i], down)];
        tb = [mult(pointsArray[i + 1], up), mult(pointsArray[i + 1], down)];
        vs = vs.concat([ta[0], ta[1], tb[0]]);
        vs = vs.concat([tb[1], tb[0], ta[1]]);
    }

    ds.push(d);
    ds.shift();

    // initAttribute(texCoordsArray, "vTexCoord", 2);
    initAttribute(vs, 'vPosition', 2);
    gl.drawArrays(gl.TRIANGLES, 0, vs.length);

    console.log('rendering...');

    requestAnimFrame(renderRing);
}
