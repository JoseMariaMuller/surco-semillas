// Viento compartido por todas las plantas (principal, macollos, vecinas y hectárea).
// Se aplica en el vertex shader sobre la posición en el mundo: la amplitud crece
// con la altura (cuadrática), así la base queda firme y la punta se mece.
// Sirve igual para mallas comunes e InstancedMesh, sin recalcular matrices.

export const WIND = {
  uWindTime: { value: 0 },
  uWindAmp: { value: 0 },
  uWindH: { value: 1 },
}

const PROJECT = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 windWorld = modelMatrix * mvPosition;
float windH = clamp( windWorld.y / uWindH, 0.0, 1.4 );
float windP = uWindTime * 1.6 + windWorld.x * 0.9 + windWorld.z * 0.55;
float windK = uWindAmp * windH * windH;
float gust = 0.75 + 0.25 * sin( uWindTime * 0.37 + windWorld.x * 0.08 );
windWorld.x += windK * gust * ( sin( windP ) + 0.3 * sin( windP * 2.7 + 1.3 ) );
windWorld.z += windK * gust * 0.45 * sin( windP * 0.83 + 2.1 );
mvPosition = viewMatrix * windWorld;
gl_Position = projectionMatrix * mvPosition;
`

/** Suma el viento a un material de three (Standard, Basic, etc.). Devuelve el mismo material. */
export function applyWind(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, WIND)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nuniform float uWindAmp;\nuniform float uWindH;')
      .replace('#include <project_vertex>', PROJECT)
  }
  material.customProgramCacheKey = () => 'viento'
  return material
}
