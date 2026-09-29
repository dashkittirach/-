// Shared animated background shader: deep navy field, flowing contour lines
// ("market topography") and a faint dot grid. uMood tints green (+) / red (-).
export const BG_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uRes;
uniform float uTime, uMood, uIntensity, uGrid;
out vec4 o;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

void main(){
  vec2 px = vUv * uRes;
  vec2 p = (px - 0.5 * uRes) / uRes.y;
  vec3 base = mix(vec3(0.027, 0.035, 0.063), vec3(0.047, 0.059, 0.110), vUv.y);
  base += vec3(0.10, 0.12, 0.28) * 0.35 * exp(-3.0 * length(p - vec2(-0.55, 0.45)));

  float t = uTime * 0.05;
  float h = fbm(p * 1.6 + vec2(t, -t * 0.6)) + 0.35 * fbm(p * 3.1 - vec2(t * 0.7, t));
  float f = h * 9.0;
  float d = abs(fract(f - 0.5) - 0.5);          // distance to nearest contour
  float line = 1.0 - smoothstep(0.0, fwidth(f) * 1.3, d);
  vec3 up = vec3(0.13, 0.86, 0.60), dn = vec3(0.98, 0.33, 0.42), neutral = vec3(0.45, 0.55, 1.0);
  vec3 tint = uMood >= 0.0 ? mix(neutral, up, uMood) : mix(neutral, dn, -uMood);
  float fade = smoothstep(1.4, 0.2, length(p * vec2(0.7, 1.0)));
  vec3 col = base + tint * line * 0.14 * uIntensity * fade;

  vec2 g = fract(px / uGrid) - 0.5;
  float dotg = smoothstep(0.09, 0.0, length(g)) * 0.05;
  col += vec3(0.6, 0.7, 1.0) * dotg * fade;
  col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5) * 2.0;
  o = vec4(col, 1.0);
}`;
