const modules = import.meta.glob('./*.json', { eager: true })
let presets = {}
for (const path in modules) {
  const mod = modules[path]
  const data = mod && (mod.default ?? mod)
  if (data && typeof data === 'object') presets = { ...presets, ...data }
}

// eval $ expressions
function evalExpr(expr, ctx) {
  // eslint-disable-next-line no-new-func
  return Function('ctx', `with(ctx){return (${expr});}`)(ctx)
}
function resolve(v, ctx) {
  if (Array.isArray(v)) return v.map(x => resolve(x, ctx))
  if (v && typeof v === 'object') {
    const out = {}
    for (const k of Object.keys(v)) out[k] = resolve(v[k], ctx)
    return out
  }
  if (typeof v === 'string' && v.startsWith('$')) return evalExpr(v.slice(1), ctx)
  return v
}

export function listPresets() {
  return Object.keys(presets)
}

// Positions are WORLD units; no scaling.
export function applyPresetByName(name, addObject, setSceneObjects, updatePosition, onCamera, onSettings) {
  const def = presets[name]
  if (!def) throw new Error(`Preset not found: ${name}`)
  const ctx = def.context || {}

  setSceneObjects?.([])

  for (const item of def.objects || []) {
    const props = resolve(item.props ?? {}, ctx)
    let resolvedType = item.type
    if (item.type === 'coil') {
      resolvedType = props?.coilType === 'polygon' ? 'polygonCoil' : 'ringCoil'
    }
    if (item.type === 'ringCoil' || item.type === 'polygonCoil') {
      resolvedType = item.type
    }
    if (item.type === 'surface') {
      // For surfaces, use surfaceType to determine the actual type
      resolvedType = item.surfaceType || props.surfaceType || 'sphere'
    }
    const newId = addObject(resolvedType, props)
    if (updatePosition && newId && props.position) {
      updatePosition(newId, props.position)
    }
  }

  if (def.camera && onCamera) {
    const cam = resolve(def.camera, ctx)
    onCamera(cam)
  }

  // NEW: apply preset UI/settings if present
  if (def.settings && onSettings) {
    const st = resolve(def.settings, ctx)
    onSettings(st)
  }
}
