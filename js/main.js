var eff = new Ring( {
    amount: 32
});
var gl, canvas;

window.onload = function () {
    console.log('document ready.');

    // init GL contex
    canvas = $('#mainCanvas').get(0);
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.log('webgl is not avaliable.');
    }

    console.log('GL ready');

    eff.initEffect();
};

// window.onload = initRing;