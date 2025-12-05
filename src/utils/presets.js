// src/utils/presets.js

/**
 * Função auxiliar para limpar a cena e aplicar um preset.
 * Recebe as funções `addObject` e `setSceneObjects` vindas do hook.
 */
export function loadPreset(presetFnOrName, addObject, setSceneObjects) {
  if (typeof presetFnOrName === 'function') {
    setSceneObjects?.([])
    return presetFnOrName(addObject)
  }
  if (typeof presetFnOrName === 'string') {
    return applyPresetByName(presetFnOrName, addObject, setSceneObjects)
  }
}

/**
 * Dipolo elétrico: duas cargas opostas lado a lado
 */
export function presetDipole(addObject, setSceneObjects) {
  return applyPresetByName('dipole', addObject, setSceneObjects)
}

/**
 * Fio infinito com cilindro gaussiano
 */
export function presetInfiniteWire(addObject, setSceneObjects) {
  return applyPresetByName('infiniteWire', addObject, setSceneObjects)
}

/**
 * Duas placas planas paralelas com densidades opostas
 */
export function presetParallelPlates(addObject, setSceneObjects) {
  return applyPresetByName('parallelPlates', addObject, setSceneObjects)
}

/**
 * Caminho circular com corrente
 */
export function presetCurrentLoop(addObject, setSceneObjects) {
  return applyPresetByName('currentLoop', addObject, setSceneObjects)
}

/**
 * Esfera gaussiana com carga pontual no centro
 */
export function presetGaussianSphere(addObject, setSceneObjects) {
  return applyPresetByName('gaussianSphere', addObject, setSceneObjects)
}

// Explicit JSON entry point
export function loadPresetFromJson(name, addObject, setSceneObjects, updatePosition) {
  return applyPresetByName(name, addObject, setSceneObjects, updatePosition)
}

import { applyPresetByName, listPresets } from '../presets/loader'

export { listPresets }
export { applyPresetByName }
