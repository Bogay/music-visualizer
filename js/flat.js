class Flat extends Effect {
    initPoints() {
        this.points = [];

        var step = 1 / this.amount;
        for(let i=0 - this.amount ; i<=this.amount ; i++)
        {
            this.points.push(vec2(step * i, -1));
        }
    }

    initEffect() {
        // self properties

        // configure GL
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.15, 0.15, 0.1, 1);
        this.program = initShaders(gl, 'no-transform-vertex-shader', 'pure-color-fragment-shader');
        gl.useProgram(this.program);

        // initialize values
        this.initPoints();
        this.modeling = scale(1, 1, 1);
        this.viewing = lookAt(vec3(this.eye), [0, 0, 0], [0, 1, 0]);
        this.projection = perspective(45, 1, 1, 3);
        this.configureUniformLocation();

        gl.uniformMatrix4fv(this.modelingLoc, 0, flatten(this.modeling));
        gl.uniformMatrix4fv(this.viewingLoc, 0, flatten(this.viewing));
        gl.uniformMatrix4fv(this.projectionLoc, 0, flatten(this.projection));

        this.prepareAnalyser();

        this.renderScene();
    }

    renderScene() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        this.pos = [];
        var vols = this.getFrequencyDate();
        var nn = 2 * this.amount;
        var ta, tb;

        for(let i=0 ; i<nn ; i++) {
            var tv = vols[i];
            ta = [this.points[i], add(this.points[i], vec2(0, tv))];
            tb = [this.points[i+1], add(this.points[i+1], vec2(0, tv))];
            this.pos = this.pos.concat([ta[0], ta[1], tb[0]]);
            this.pos = this.pos.concat([tb[1], tb[0], ta[1]]);
        }

        this.initAttribute(this.pos, 'vPosition', 2);
        gl.drawArrays(gl.TRIANGLES, 0, this.pos.length);

        requestAnimationFrame(this.renderScene.bind(this));
    }
}