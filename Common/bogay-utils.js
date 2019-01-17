function isPowerOf2(x) { return (x & (x-1)) == 0; }

// p % q
function __mod(p, q)
{
    while(p <= 0) p += q;
    return p % q;
}

function normalDistribution(std, mean, num) {
    var r = [];
    var d = 1 / (std * Math.sqrt(2 * Math.PI));
    var t, s = 0;

    for(let i=0 ; i<num ; i++)
    {
        t = i - mean;
        t *= -t;
        t = d * Math.exp(t / (2 * std * std));
        r.push(t);
        s += t;
    }
    s -= (r[0] / 2);
    s *= 2;

    r.forEach(function(v, i) {
        r[i] = v / s;
    });

    return r;
}

function mapping(iu, il, ou, ol) {
    // iu, il: upperbound/lowerbound of input
    // ou, ol: output's
    
    var diff = iu - il;
    if(diff < 0.01)
        return function(v) { return 1; };
    else
        return function(v) {
            return ou + (ol - ou) * (v - il) / diff;
        };
}
