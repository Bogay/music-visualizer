class Effect {
    constructor({
        amount = 10,
        modeling = translate(0, 0, 0),
        viewing = translate(0, 0, 0),
        projection = translate(0, 0, 0),
        eye = vec4(0, 0, 2, 0),
        light = vec4(0, 100, 200, 1),
        ambient = null,
        diffuse = null,
        specular = null,
        shininess = null,
        points = [],
        colors = [],
        normals = [],
        texCoords = []
    } = {}) {
        this.amount = amount;
        this.modeling = modeling;
        this.viewing = viewing;
        this.projection = projection;
        this.eye = eye;
        this.light = light;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.shininess = shininess;
        this.points = points;
        this.colors = colors;
        this.normals = normals;
        this.texCoords = texCoords;

        this.attributeBuffer = {};
        this.attributeLocation = {};
    }

    switchProgram(prog) {
        gl.useProgram(prog);
        this.program = prog;
    }

    initAttribute(arr, attr, unit) {
        // config buffer
        var b;

        // check for program
        if(!(this.program in this.attributeBuffer))
        {
            this.attributeBuffer[this.program] = {};
        }

        if (attr && !(attr in this.attributeBuffer[this.program])) {
            b = gl.createBuffer();
            this.attributeBuffer[this.program][attr] = b;
        } else {
            b = this.attributeBuffer[this.program][attr];
        }

        if (!b) {
            console.log('Fail to create buffer [' + attr + ']');
            return -1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(arr), gl.STATIC_DRAW);

        // enable attribute
        var a = gl.getAttribLocation(this.program, attr);
        if (a < 0) {
            console.log('Fail to get attribute location [' + attr + ']');
            return -1;
        }
        gl.vertexAttribPointer(a, unit, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a);
    }

    configureTexture() {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        return texture;
    }

    prepareAnalyser() {
        // Experimenting with HTML5 audio
        var context = new AudioContext();
        var audio = $('#myAudio').get(0);
        var audioSrc = context.createMediaElementSource(audio);
        var sourceJs = context.createScriptProcessor(2048); // createJavaScriptNode() deprecated.

        this.analyser = context.createAnalyser();
        this.frequencyData = new Uint8Array();

        // we could configure the analyser: e.g. analyser.fftSize (for further infos read the spec)
        this.analyser.smoothingTimeConstant = 0.6;
        this.analyser.fftSize = 2048;

        // we have to connect the MediaElementSource with the analyser 
        audioSrc.connect(this.analyser);
        this.analyser.connect(sourceJs);
        sourceJs.buffer = audioSrc.buffer;
        sourceJs.connect(context.destination);
        audioSrc.connect(context.destination);

        sourceJs.onaudioprocess = function (e) {
            // frequencyBinCount tells you how many values you'll receive from the analyser
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(this.frequencyData);
        }.bind(this);
    }

    // return a list represent the volume of the first 256 frequency
    getFrequencyDate() {
        var r = [];
        var t;
        var nn = 2 * this.amount + 1;
        var k = Math.floor(256 / nn);

        for (let i = 0; i < nn; i++) {
            t = this.frequencyData[k * i];
            t = t / 1024;
            if (isNaN(t)) t = 0.005;
            t = Math.max(0.005, t);
            r.push(t);
        }

        return r;
    }

    configureUniformLocation() {
        this.modelingLoc = gl.getUniformLocation(this.program, 'modelingMatrix');
        this.viewingLoc = gl.getUniformLocation(this.program, 'viewingMatrix');
        this.projectionLoc = gl.getUniformLocation(this.program, 'projectionMatrix');
        this.lightMatrixLoc = gl.getUniformLocation(this.program, 'lightMatrix');

        this.eyeLoc = gl.getUniformLocation(this.program, 'eyePosition');
        this.lightLoc = gl.getUniformLocation(this.program, 'lightPosition');
        this.ambientLoc = gl.getUniformLocation(this.program, 'materialAmbient');
        this.diffuseLoc = gl.getUniformLocation(this.program, 'materialDiffuse');
        this.specularLoc = gl.getUniformLocation(this.program, 'materialSpecular');
        this.shininessLoc = gl.getUniformLocation(this.program, 'shininess');
    }

    // abstract
    initEffect() {
        console.log('abstract function {initEffect}');
    }

    renderScene() {
        console.log('abstract function {initEffect}');
    }
}