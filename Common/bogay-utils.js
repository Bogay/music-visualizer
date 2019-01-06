function isPowerOf2(x) { return (x & (x-1)) == 0; }

// p % q
function __mod(p, q)
{
    while(p <= 0) p += q;
    return p % q;
}