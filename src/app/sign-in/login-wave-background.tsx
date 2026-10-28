"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
attribute vec3 position;

void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 resolution;
uniform float time;
uniform float xScale;
uniform float yScale;
uniform float distortion;

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  float d = length(p) * distortion;

  float rx = p.x * (1.0 + d);
  float gx = p.x;
  float bx = p.x * (1.0 - d);

  float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
  float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
  float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

  vec3 color = vec3(r, g, b);
  color = color / (1.0 + color);
  gl_FragColor = vec4(color * vec3(0.72, 0.86, 1.0), 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LoginWaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: false, antialias: true });
    if (!canvas || !gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    if (!program || !buffer) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const positionLocation = gl.getAttribLocation(program, "position");
    const resolutionLocation = gl.getUniformLocation(program, "resolution");
    const timeLocation = gl.getUniformLocation(program, "time");
    const xScaleLocation = gl.getUniformLocation(program, "xScale");
    const yScaleLocation = gl.getUniformLocation(program, "yScale");
    const distortionLocation = gl.getUniformLocation(program, "distortion");
    if (positionLocation < 0 || !resolutionLocation || !timeLocation || !xScaleLocation || !yScaleLocation || !distortionLocation) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0,
       1, -1, 0,
      -1,  1, 0,
       1, -1, 0,
      -1,  1, 0,
       1,  1, 0,
    ]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(window.innerWidth * pixelRatio));
      const height = Math.max(1, Math.floor(window.innerHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let animationFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const render = (timestamp: number) => {
      resize();
      gl.clearColor(0.025, 0.04, 0.08, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, timestamp * 0.00035);
      gl.uniform1f(xScaleLocation, 1.0);
      gl.uniform1f(yScaleLocation, 0.5);
      gl.uniform1f(distortionLocation, 0.05);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    resize();
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="login-wave-background" />;
}
