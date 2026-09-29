// Tiny raw-WebGL2 toolkit shared by the journal app and the video renderer.
// Everything draws in *pixel space* (origin top-left) and outputs premultiplied
// alpha. Additive glow = output rgb with alpha 0 under ONE, ONE_MINUS_SRC_ALPHA.

export function getGL(canvas, opts = {}) {
  const gl = canvas.getContext('webgl2', {
    antialias: true, alpha: true, premultipliedAlpha: true, ...opts,
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return gl;
}

export function compile(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
    }
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    u[name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

// Set uniforms by value shape: number -> float, [a,b(,c(,d))] -> vecN,
// { tex, unit } -> sampler2D.
export function setUniforms(gl, prog, values) {
  for (const k in values) {
    const loc = prog.u[k];
    if (loc == null) continue;
    const v = values[k];
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (v && v.tex) {
      gl.activeTexture(gl.TEXTURE0 + v.unit);
      gl.bindTexture(gl.TEXTURE_2D, v.tex);
      gl.uniform1i(loc, v.unit);
    } else if (v.length === 2) gl.uniform2fv(loc, v);
    else if (v.length === 3) gl.uniform3fv(loc, v);
    else if (v.length === 4) gl.uniform4fv(loc, v);
  }
}

export function hex(c, a = 1) {
  const n = parseInt(c.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
}

// Resize a canvas' backing store to its CSS size * dpr. Returns true if changed.
export function fitCanvas(canvas, dpr = Math.min(2, window.devicePixelRatio || 1)) {
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width === w && canvas.height === h) return false;
  canvas.width = w;
  canvas.height = h;
  return true;
}

// Shared GLSL: pixel -> clip with a simple camera (offset px, zoom about center).
const CAM_GLSL = `
uniform vec2 uRes;
uniform vec4 uCam; // x,y offset px, z zoom, w unused
vec4 toClip(vec2 px){
  vec2 c = uRes * 0.5;
  px = (px - c) * uCam.z + c + uCam.xy;
  vec2 n = px / uRes * 2.0 - 1.0;
  return vec4(n.x, -n.y, 0.0, 1.0);
}`;
const CAM_ID = [0, 0, 1, 0];

// ---------------------------------------------------------------- fullscreen

const FS_VS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export class FullscreenPass {
  constructor(gl, fs) {
    this.gl = gl;
    this.prog = compile(gl, FS_VS, fs);
    this.vao = gl.createVertexArray();
  }
  draw(uniforms) {
    const { gl } = this;
    gl.useProgram(this.prog.p);
    setUniforms(gl, this.prog, uniforms);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

// Offscreen colour target (for post-processing in the video).
export class Target {
  constructor(gl, w, h) {
    this.gl = gl;
    this.tex = gl.createTexture();
    this.fbo = gl.createFramebuffer();
    this.resize(w, h);
  }
  resize(w, h) {
    const { gl } = this;
    this.w = w; this.h = h;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  bind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
    this.gl.viewport(0, 0, this.w, this.h);
  }
}

// ---------------------------------------------------------------- rects
// Instanced rounded rectangles with optional border ring and soft outer glow.
// Used for candles, bars, heatmap cells, cards, crosshairs… nearly everything.

const RECT_VS = `#version 300 es
layout(location=0) in vec4 aRect;   // x,y,w,h px
layout(location=1) in vec4 aColor;  // straight rgba
layout(location=2) in vec4 aParams; // radius, glow px, border px, unused
${CAM_GLSL}
out vec2 vLocal; out vec2 vHalf; out vec4 vColor; out vec4 vParams;
void main(){
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  float pad = aParams.y + 1.5;
  vec2 px = aRect.xy - pad + corner * (aRect.zw + 2.0 * pad);
  vHalf = aRect.zw * 0.5;
  vLocal = px - (aRect.xy + vHalf);
  vColor = aColor; vParams = aParams;
  gl_Position = toClip(px);
}`;

const RECT_FS = `#version 300 es
precision highp float;
in vec2 vLocal; in vec2 vHalf; in vec4 vColor; in vec4 vParams;
out vec4 o;
float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main(){
  float r = min(vParams.x, min(vHalf.x, vHalf.y));
  float d = sdRound(vLocal, vHalf, r);
  float fill = clamp(0.5 - d, 0.0, 1.0);
  if (vParams.z > 0.0) fill *= clamp(0.5 + d + vParams.z, 0.0, 1.0);
  o = vec4(vColor.rgb * vColor.a, vColor.a) * fill;
  if (vParams.y > 0.0) {
    float g = exp(-max(d, 0.0) / (vParams.y * 0.33)) * (1.0 - fill) * vColor.a * 0.6;
    o.rgb += vColor.rgb * g; // additive (alpha untouched)
  }
}`;

export class RectBatch {
  constructor(gl, max = 4096) {
    this.gl = gl;
    this.max = max;
    this.prog = compile(gl, RECT_VS, RECT_FS);
    this.data = new Float32Array(max * 12);
    this.n = 0;
    this.vao = gl.createVertexArray();
    this.buf = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
  }
  // color: [r,g,b,a] straight alpha
  push(x, y, w, h, color, radius = 0, glow = 0, border = 0) {
    if (this.n >= this.max) return;
    const o = this.n++ * 12, d = this.data;
    d[o] = x; d[o + 1] = y; d[o + 2] = w; d[o + 3] = h;
    d[o + 4] = color[0]; d[o + 5] = color[1]; d[o + 6] = color[2]; d[o + 7] = color[3] ?? 1;
    d[o + 8] = radius; d[o + 9] = glow; d[o + 10] = border; d[o + 11] = 0;
  }
  flush(res, cam = CAM_ID) {
    if (!this.n) return;
    const { gl } = this;
    gl.useProgram(this.prog.p);
    setUniforms(gl, this.prog, { uRes: res, uCam: cam });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, this.n * 12));
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.bindVertexArray(null);
    this.n = 0;
  }
}

// ---------------------------------------------------------------- lines
// Anti-aliased polyline with miter joins, reveal progress, glow pass, and
// an area fill down to a baseline. Colour flips to `neg` below `zeroY`.

const LINE_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aNormal;
layout(location=2) in float aSide;
layout(location=3) in float aT;
${CAM_GLSL}
uniform float uHalf;
out float vSide; out float vT; out float vY;
void main(){
  vec2 px = aPos + aNormal * aSide * uHalf;
  vSide = aSide; vT = aT; vY = px.y;
  gl_Position = toClip(px);
}`;

const LINE_FS = `#version 300 es
precision highp float;
in float vSide; in float vT; in float vY;
uniform float uHalf, uProgress, uGlow, uAlpha, uZeroY;
uniform vec3 uPos, uNeg;
out vec4 o;
void main(){
  if (vT > uProgress) discard;
  vec3 col = vY > uZeroY ? uNeg : uPos;
  float head = smoothstep(0.035, 0.0, uProgress - vT) * step(uProgress, 0.999);
  if (uGlow > 0.0) {
    float g = exp(-4.0 * vSide * vSide) * uGlow * uAlpha * (1.0 + head * 2.0);
    o = vec4(col * g, 0.0);
  } else {
    float aa = 1.2 / max(uHalf, 0.5);
    float a = smoothstep(1.0, 1.0 - aa, abs(vSide)) * uAlpha;
    o = vec4(mix(col, vec3(1.0), head * 0.7) * a, a);
  }
}`;

const FILL_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in float aV;
layout(location=2) in float aT;
${CAM_GLSL}
out float vV; out float vT; out float vY;
void main(){ vV = aV; vT = aT; vY = aPos.y; gl_Position = toClip(aPos); }`;

const FILL_FS = `#version 300 es
precision highp float;
in float vV; in float vT; in float vY;
uniform float uProgress, uAlpha, uZeroY;
uniform vec3 uPos, uNeg;
out vec4 o;
void main(){
  if (vT > uProgress) discard;
  vec3 col = vY > uZeroY ? uNeg : uPos;
  float a = uAlpha * pow(vV, 1.6);
  o = vec4(col * a, a);
}`;

export class LineRenderer {
  constructor(gl) {
    this.gl = gl;
    this.line = compile(gl, LINE_VS, LINE_FS);
    this.fill = compile(gl, FILL_VS, FILL_FS);
    this.lineVao = gl.createVertexArray();
    this.lineBuf = gl.createBuffer();
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    const s = 6 * 4;
    [[0, 2, 0], [1, 2, 8], [2, 1, 16], [3, 1, 20]].forEach(([l, n, off]) => {
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, n, gl.FLOAT, false, s, off);
    });
    this.fillVao = gl.createVertexArray();
    this.fillBuf = gl.createBuffer();
    gl.bindVertexArray(this.fillVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuf);
    [[0, 2, 0], [1, 1, 8], [2, 1, 12]].forEach(([l, n, off]) => {
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, n, gl.FLOAT, false, 16, off);
    });
    gl.bindVertexArray(null);
    this.count = 0;
  }

  // pts: [[xPx, yPx], ...]; baseY: px baseline for the fill.
  setPoints(pts, baseY) {
    const { gl } = this;
    const n = pts.length;
    this.count = n;
    if (n < 2) return;
    const L = new Float32Array(n * 2 * 6);
    const F = new Float32Array(n * 2 * 4);
    const x0 = pts[0][0], x1 = pts[n - 1][0], span = Math.max(1e-6, x1 - x0);
    const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dIn = i > 0 ? norm(p[0] - a[0], p[1] - a[1]) : null;
      const dOut = i < n - 1 ? norm(b[0] - p[0], b[1] - p[1]) : null;
      const tan = norm((dIn ? dIn[0] : 0) + (dOut ? dOut[0] : 0), (dIn ? dIn[1] : 0) + (dOut ? dOut[1] : 0));
      let nx = -tan[1], ny = tan[0];
      const ref = dIn || dOut;
      const m = Math.min(2, 1 / Math.max(0.3, Math.abs(nx * -ref[1] + ny * ref[0])));
      nx *= m; ny *= m;
      const t = (p[0] - x0) / span;
      L.set([p[0], p[1], nx, ny, -1, t, p[0], p[1], nx, ny, 1, t], i * 12);
      F.set([p[0], p[1], 1, t, p[0], baseY, 0, t], i * 8);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, L, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuf);
    gl.bufferData(gl.ARRAY_BUFFER, F, gl.DYNAMIC_DRAW);
  }

  // opts: { res, cam, width, progress, alpha, glow, fillAlpha, pos, neg, zeroY }
  draw(o) {
    if (this.count < 2) return;
    const { gl } = this;
    const common = {
      uRes: o.res, uCam: o.cam || CAM_ID, uProgress: o.progress ?? 1, uAlpha: o.alpha ?? 1,
      uZeroY: o.zeroY ?? 1e9, uPos: o.pos, uNeg: o.neg || o.pos,
    };
    if (o.fillAlpha) {
      gl.useProgram(this.fill.p);
      setUniforms(gl, this.fill, { ...common, uAlpha: o.fillAlpha * (o.alpha ?? 1) });
      gl.bindVertexArray(this.fillVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count * 2);
    }
    gl.useProgram(this.line.p);
    gl.bindVertexArray(this.lineVao);
    if (o.glow) {
      setUniforms(gl, this.line, { ...common, uHalf: o.width * (o.glowWidth ?? 4), uGlow: o.glow });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count * 2);
    }
    setUniforms(gl, this.line, { ...common, uHalf: o.width / 2, uGlow: 0 });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count * 2);
    gl.bindVertexArray(null);
  }
}

// ---------------------------------------------------------------- text
// Text is rasterised once with Canvas2D into a texture, then composited in GL
// with a soft left-to-right reveal wipe, so the whole frame is one GL canvas.

const TEXT_VS = `#version 300 es
${CAM_GLSL}
uniform vec4 uRect;
out vec2 vUv;
void main(){
  vec2 c = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vUv = c;
  gl_Position = toClip(uRect.xy + c * uRect.zw);
}`;

const TEXT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uAlpha, uReveal, uSoft;
uniform vec4 uTint;
out vec4 o;
void main(){
  vec4 t = texture(uTex, vUv);
  float w = smoothstep(uReveal, uReveal - uSoft, vUv.x * (1.0 - uSoft) );
  o = t * uTint * uAlpha * w;
}`;

export class TextRenderer {
  constructor(gl) {
    this.gl = gl;
    this.prog = compile(gl, TEXT_VS, TEXT_FS);
    this.vao = gl.createVertexArray();
  }
  // Creates a sprite. scale = backing pixels per CSS px.
  make(text, { size = 32, weight = 600, family = 'Inter', color = '#fff', spacing = 0, scale = 1 } = {}) {
    const { gl } = this;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const font = `${weight} ${size * scale}px ${family}`;
    ctx.font = font;
    ctx.letterSpacing = `${spacing * scale}px`;
    const m = ctx.measureText(text);
    const pad = Math.ceil(size * 0.25 * scale);
    c.width = Math.ceil(m.width + pad * 2);
    c.height = Math.ceil(size * 1.35 * scale + pad * 2);
    ctx.font = font;
    ctx.letterSpacing = `${spacing * scale}px`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad, c.height / 2);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // w/h in CSS px; pad so callers can align on the glyph box
    return { tex, w: c.width / scale, h: c.height / scale, pad: pad / scale, text };
  }
  free(s) { if (s) this.gl.deleteTexture(s.tex); }
  // anchor: 0 = left, 0.5 = centre, 1 = right (on the text box, pad excluded)
  draw(s, x, y, { res, cam = CAM_ID, alpha = 1, reveal = 1, soft = 0.15, anchor = 0, tint = [1, 1, 1, 1], scale = 1 } = {}) {
    if (alpha <= 0 || reveal <= 0) return;
    const { gl } = this;
    const w = s.w * scale, h = s.h * scale, pad = s.pad * scale;
    const left = x - pad - (w - pad * 2) * anchor;
    gl.useProgram(this.prog.p);
    setUniforms(gl, this.prog, {
      uRes: res, uCam: cam, uRect: [left, y - h / 2, w, h],
      uTex: { tex: s.tex, unit: 0 }, uAlpha: alpha, uReveal: reveal * (1 + soft), uSoft: soft, uTint: tint,
    });
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
