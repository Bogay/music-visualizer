var eff = new Ring({
    amount: 32
});
var gl, canvas;

window.onload = function () {
    console.log('document ready.');

    $('#rButton').on('click', function (e) {
        // create audio node
        var audio = new Audio();
        audio.id = 'myAudio';
        document.body.appendChild(audio);
        audio.autoplay = true;

        // get music file
        var target = $('#musicFile').get(0);
        var file = target.files[0];
        var reader = new FileReader();

        console.log('GL ready');

        if (target.files && file) {
            // configure color
            for (let i = 0; i < 3; i++) eff.colors[i] /= 255;
            eff.colors.push(1.0);

            // set background
            eff.bg = $('#backgroundImage').get(0).files[0];

            // init GL contex
            canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 720;
            $('.cover-div').append(canvas);
            gl = WebGLUtils.setupWebGL(canvas);
            if (!gl) {
                console.log('webgl is not avaliable.');
                return;
            }

            reader.onload = function (e) {
                $('#myAudio').attr('src', e.target.result);
                eff.initEffect();
            };
            reader.readAsDataURL(file);
            $('#param').remove();
        }
        else {
            alert('you should select a file first');
        }
    });

    // configure color
    eff.colors = new Array(3);

    eff.colors[0] = Number($('#rSlide').get(0).value);
    eff.colors[1] = Number($('#gSlide').get(0).value);
    eff.colors[2] = Number($('#bSlide').get(0).value);
    $('#showColor').css('background-color', 'rgb(' + eff.colors[0] + ',' + eff.colors[1] + ',' + eff.colors[2] + ')');

    // add event listener
    $('#rSlide').on('input', function () { updateColor(0, Number($(this).val())); });
    $('#gSlide').on('input', function () { updateColor(1, Number($(this).val())); });
    $('#bSlide').on('input', function () { updateColor(2, Number($(this).val())); });
};

function updateColor(idx, val) {
    eff.colors[idx] = val;
    $('#showColor').css('background-color', 'rgb(' + eff.colors[0] + ',' + eff.colors[1] + ',' + eff.colors[2] + ')');
}