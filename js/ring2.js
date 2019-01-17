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

    initTexCoord() {
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

    configureImage(src, n) {
        var image = new Image();
        image.onload = function () {
            gl.activeTexture(gl.TEXTURE0 + n);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[n]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        }.bind(this);
        image.src = src;

        return image;
    }

    initEffect() {
        // init this attribute
        this.pause = 0;
        this.theda = 0;
        this.speed = 0.1;
        this.radius = 0.6;
        this.volumeBufferSize = 5;
        this.volumeBuffer = [];
        this.ratio = canvas.height / canvas.width;

        // configure GL
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.05, 0.05, 0.1, 1.0);
        // gl.clearColor(1, 1, 1, 1.0);

        gl.enable ( gl.BLEND ) ;
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // init programs
        var normalProgram = initShaders(gl, 'no-transform-vertex-shader', 'pure-tex-fragment-shader');
        var bloomProgram = initShaders(gl, 'bg-vertex-shader', 'bloom-fragment-shader');
        var fillProgram = initShaders(gl, 'bg-vertex-shader', 'dark-tex-fragment-shader');
        var circleProgram = initShaders(gl, 'bg-vertex-shader', 'circle-fragment-shader');

        this.programTable['normal'] = normalProgram;
        this.programTable['bloom'] = bloomProgram;
        this.programTable['fill'] = fillProgram;
        this.programTable['circle'] = circleProgram;

        this.switchProgram('normal');

        this.initAngle();
        this.initTexCoord();
        this.initPoints();

        // init attributes
        this.initAttribute(this.texCoords, 'vTexCoord', 2);

        // init MVP
        this.modeling = scale(1, 1, 1);
        this.viewing = lookAt(vec3(this.eye), [0, 0, 0], [0, 1, 0]);
        this.projection = perspective(45, 1, 1, 3);

        // configure uniform
        this.configureUniformLocation();
        gl.uniformMatrix4fv(this.modelingLoc, 0, flatten(this.modeling));
        gl.uniformMatrix4fv(this.viewingLoc, 0, flatten(this.viewing));
        gl.uniformMatrix4fv(this.projectionLoc, 0, flatten(this.projection));

        this.switchProgram('normal');
        gl.uniform1f(gl.getUniformLocation(this.program, 'x_scalor'), this.ratio);
        gl.uniform4fv(gl.getUniformLocation(this.program, 'uColor'), this.colors);
        gl.uniform1i(gl.getUniformLocation(this.program, 'texture'), 0);

        // for render background
        this.switchProgram('fill');
        gl.uniform1i(gl.getUniformLocation(this.program, 'texture'), 1);

        // bloom
        this.switchProgram('bloom');
        gl.uniform1fv(gl.getUniformLocation(this.program, 'weight'), normalDistribution(4, 0, 9));
        // set texture
        gl.uniform1i(gl.getUniformLocation(this.program, 'texture'), 2);

        // this.switchProgram('circle');
        // gl.uniform1f(gl.getUniformLocation(this.program, 'radius'), 1.2);
        // this.colors[3] = 0.5;
        // gl.uniform4fv(gl.getUniformLocation(this.program, 'uColor'), this.colors);
        // this.colors[3] = 1;

        // configure texture
        this.textures = [];
        // 0: square
        // 1: background
        // 2, 3: framebuffer
        for(let i=0 ; i<5 ; i++) this.textures.push(this.configureTexture());

        this.pingpongFramebuffer = [];
        for(let i=2 ; i<4 ; i++)
        {
            gl.activeTexture(gl.TEXTURE0 + i);
            // create to render to
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
        
            // define size and format of level 0
            const targetTextureWidth = canvas.width;
            const targetTextureHeight = canvas.height;
            const level = 0;
            const internalFormat = gl.RGBA;
            const border = 0;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            const data = null;
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                            targetTextureWidth, targetTextureHeight, border,
                            format, type, data);

            // configure frame buffer
            var fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);

            this.pingpongFramebuffer.push(fb);
        }

        // bind textures
        for(let i=0 ; i<4 ; i++)
        {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
        }

        this.prepareAnalyser();
        this.initVolumeBuffer();
        
        // configure images
        this.configureImage('image/tex.png', 0);
        this.configureImage('image/solid_square.png', 4);

        var bg_img = new Image();
        bg_img.onload = function() {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bg_img);
        }.bind(this);
        try {
            bg_img.src = URL.createObjectURL(eff.bg);
        }
        catch(e) {
            console.log(e);
            bg_img.src = 'image/bg2.png';
        }

        console.log('start rendering...');
        this.renderScene();
    }
    
    renderRing() {
        if (!(this.pause)) this.theda += this.speed;

        // update modleing matrix
        this.modeling = rotate(this.theda, 0, 0, 1);
        gl.uniformMatrix4fv(this.modelingLoc, 0, flatten(this.modeling));

        var nn = 2 * this.amount + 1;
        var vols = this.getFrequencyDate();

        // contrast
        var mx, mn;
        mx = mn = vols[0];
        for(let i=1 ; i<vols.length ; i++)
        {
            if(vols[i] > mx) mx = vols[i];
            else if(vols[i] < mn) mn = vols[i];
        }
        var f = mapping(mx, mn, 0.25, 1.5);
        vols.forEach(function(v, i) {
            vols[i] = Math.max(v * f(v), 0.005);
        });

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
        // either for texCoords
        this.initAttribute(this.texCoords, 'vTexCoord', 2);
        // render
        gl.drawArrays(gl.TRIANGLES, 0, this.pos.length);
    }

    fill() {
        var texCoord = [
            vec2(0, 0),
            vec2(1, 0),
            vec2(0, 1),
            vec2(0, 1),
            vec2(1, 1),
            vec2(1, 0)
        ];

        var pos = [
            vec2(-1, -1),
            vec2(1, -1),
            vec2(-1, 1),
            vec2(-1, 1),
            vec2(1, 1),
            vec2(1, -1)
        ];

        this.initAttribute(pos, 'vPosition', 2);
        this.initAttribute(texCoord, 'vTexCoord', 2);

        gl.drawArrays(gl.TRIANGLES, 0, 6); 
    }

    renderScene() {
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
        {
            console.log('frame buffer is not complete!');
        }

        // render ring to framebuffer
        this.switchProgram('normal');
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingpongFramebuffer[0]);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.clearColor(1, 1, 1, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.renderRing();

        this.switchProgram('circle');
        this.fill();

        // bloom
        this.switchProgram('bloom');
        var texLoc = gl.getUniformLocation(this.program, 'texture');
        var xLoc = gl.getUniformLocation(this.program, 'x_unit');
        var yLoc = gl.getUniformLocation(this.program, 'y_unit');

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingpongFramebuffer[1]);
        gl.uniform1i(texLoc, 2);
        gl.uniform1f(xLoc, 1 / canvas.width);
        gl.uniform1f(yLoc, 0);
        gl.clearColor(this.colors[0], this.colors[1], this.colors[2], 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.fill();

        // render background
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        this.switchProgram('fill');
        gl.uniform1i(gl.getUniformLocation(this.program, 'texture'), 1);
        this.fill();

        // render bloomed ring
        this.switchProgram('bloom');
        gl.uniform1i(texLoc, 3);
        gl.uniform1f(xLoc, 0);
        gl.uniform1f(yLoc, 1 / canvas.height);
        this.fill();

        // draw ring again
        this.switchProgram('normal');
        this.renderRing();

        console.log('rendering...');
        requestAnimationFrame(this.renderScene.bind(this));
    }
}