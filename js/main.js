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

    $('#rButton').on('click', function(e) {
        var audio = $('#myAudio');
        var target = $('#musicFile').get(0);
        var file = target.files[0];
        var reader = new FileReader();
        
        if (target.files && file) {
            var color = $('#sqColor').get(0).value;
            color = color.substring(1);
            color = parseInt(color, 16);
            eff.colors = new Array(3);
            for(let i=2 ; i>=0 ; i--)
            {
                eff.colors[i] = (color % 256) / 255;
                color /= 256;
            }
            eff.colors.push(1.0);

            reader.onload = function (e) {
                audio.attr('src', e.target.result);
                eff.initEffect();
            };
            reader.readAsDataURL(file);
            $('#param').remove();
        }
        else
        {
            alert('you should select a file first');
        }
        
    });
}; 