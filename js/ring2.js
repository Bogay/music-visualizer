class Ring extends Effect {
    initAngle() {
        var nn = 2 * this.amount + 1;
        var angle_step = 2 * Math.PI / nn;
        this.angles = [];

        for (let i = 0 - this.amount; i <= this.amount; i++) {
            this.angles.push(angle_step * i);
        }

        this.angles.push(angle_step * (0 - this.amount));
    }

    initPoints() {
        // clear
        this.points = [];
        for (let i = 0 - this.amount; i <= this.amount + 1; i++) {
            this.points.push(vec2(Math.cos(this.angles[i + this.amount]), Math.sin(this.angles[i + this.amount])));
        }
    }

    initArray() {
        var texCoord = [
            vec2(0, 0),
            vec2(0, 1),
            vec2(1, 0),
            vec2(1, 1),
            vec2(1, 0),
            vec2(0, 1)
        ];
        var t = 2 * this.amount + 1;
        t *= 6;
        for (let i = 0; i < t; i++) {
            this.colors.push(vec4(0.9, 0.6, 0.5, 0.5));
            this.normals.push(vec4(0.0, 0.0, 1.0, 1.0));
            this.texCoords.push(texCoord[i % 6]);
        }
    }

    configureUniform() {
        // uniform variables in shaders
        if (this.eye)
            gl.uniform4fv(this.eyeLoc, flatten(this.eye));
        if (this.light)
            gl.uniform4fv(this.lightLoc, flatten(this.light));
        if (this.ambient)
            gl.uniform4fv(this.ambientLoc, flatten(this.ambient));
        if (this.diffuse)
            gl.uniform4fv(this.diffuseLoc, flatten(this.diffuse));
        if (this.specular)
            gl.uniform4fv(this.specularLoc, flatten(this.specular));
        if (this.shininess)
            gl.uniform1f(this.shininessLoc, this.shininess);
    }

    initVolumeBuffer() {
        this.volumeBuffer = [];
        for (let i = 0; i < this.volumeBufferSize - 1; i++)
            this.volumeBuffer.push(this.getFrequencyDate());
    }

    initEffect() {
        // init this attribute
        this.pause = 1;
        this.theda = 0;
        this.speed = 0.1;
        this.radius = 0.5;
        this.volumeBufferSize = 5;
        this.volumeBuffer = [];
        this.ratio = canvas.height / canvas.width;

        // configure GL
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.05, 0.05, 0.1, 1.0);
        // gl.clearColor(1, 1, 1, 1.0);

        gl.enable ( gl.BLEND ) ;
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.program = initShaders(gl, 'no-transform-vertex-shader', 'pure-color-fragment-shader');
        this.bloomProgram = initShaders(gl, 'bloom-vertex-shader', 'bloom-fragment-shader');
        gl.useProgram(this.program);

        this.initAngle();
        this.initArray();
        this.initPoints();

        // init attributes
        // this.initAttribute(this.colors, "vColor", 4);
        // this.initAttribute(this.normals, "vNormal", 4);
        this.initAttribute(this.texCoords, 'vTexCoord', 2);

        // init MVP
        this.modeling = scale(1, 1, 1);
        this.viewing = lookAt(vec3(this.eye), [0, 0, 0], [0, 1, 0]);
        this.projection = perspective(45, 1, 1, 3);

        // configure uniform
        this.configureUniformLocation();
        // this.configureUniform();
        gl.uniformMatrix4fv(this.modelingLoc, 0, flatten(this.modeling));
        gl.uniformMatrix4fv(this.viewingLoc, 0, flatten(this.viewing));
        gl.uniformMatrix4fv(this.projectionLoc, 0, flatten(this.projection));
        
        gl.uniform1f(gl.getUniformLocation(this.program, 'x_scalor'), this.ratio);

        // configure texture
        this.textures = [];
        var image = new Image();
        image.onload = function () {
            this.textures.push(this.configureTexture(image));
        }.bind(this);
        image.src = 'tex.png';

        // create to render to
        const targetTextureWidth = 1080;
        const targetTextureHeight = 720;
        const targetTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    
        // define size and format of level 0
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        targetTextureWidth, targetTextureHeight, border,
                        format, type, data);
        
        // set the filtering so we don't need mips
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.textures.push(targetTexture);

        // configure frame buffer
        this.fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, level);
        
        gl.uniform1i(gl.getUniformLocation(this.program, 'texture'), 1);
        gl.uniform1i(gl.getUniformLocation(this.bloomProgram, 'texture'), 0);

        // init frontend listener
        $('#zButton').on(
            'click',
            () => {
                this.pause = !this.pause;
            }
        );

        this.prepareAnalyser();
        this.initVolumeBuffer();
        
        console.log('start rendering...');
        this.renderScene();
    }

    renderRing() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (!(this.pause)) this.theda += this.speed;

        // update modleing matrix
        this.modeling = rotate(this.theda, 0, 0, 1);
        gl.uniformMatrix4fv(this.modelingLoc, 0, flatten(this.modeling));

        var nn = 2 * this.amount + 1;
        var vols = this.getFrequencyDate();

        // calculate positions
        this.pos = [];
        var tv, ta, tb, d, up, down;
        for (let i = 0; i < nn; i++) {
            tv = vols[i];
            for (let j = 0; j < this.volumeBufferSize - 1; j++) tv += this.volumeBuffer[j][i];
            tv /= this.volumeBufferSize;

            d = vec2(tv, tv);
            up = add(vec2(this.radius, this.radius), d);
            down = subtract(vec2(this.radius, this.radius), d);

            ta = [mult(this.points[i], up), mult(this.points[i], down)];
            tb = [mult(this.points[i + 1], up), mult(this.points[i + 1], down)];
            this.pos = this.pos.concat([ta[0], ta[1], tb[0]]);
            this.pos = this.pos.concat([tb[1], tb[0], ta[1]]);
        }

        // update volume buffer
        this.volumeBuffer.push(vols);
        this.volumeBuffer.shift();

        // update position attribute
        this.initAttribute(this.pos, 'vPosition', 2);
        // render
        gl.drawArrays(gl.TRIANGLES, 0, this.pos.length);
    }

    bloom() {
        var texCoord = [
            vec2(-1, -1),
            vec2(1, -1),
            vec2(-1, 1),
            vec2(-1, 1),
            vec2(1, 1),
            vec2(1, -1)
        ];

        this.initAttribute(texCoord, 'vTexCoord', 2);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    renderScene() {
        // render ring
        gl.useProgram(this.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.clearColor(0, 0, 0, 1);
        this.renderRing();

        // bloom
        gl.useProgram(this.bloomProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
        gl.viewport(0, 0, canvas.width, canvas.height);
        this.bloom();

        console.log('rendering...');
        requestAnimationFrame(this.renderScene.bind(this));
    }
}