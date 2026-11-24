// Detección simple de posibles conflictos entre las alergias registradas de un paciente
// y los medicamentos que se van a recetar. Es una ayuda: la decisión final es del médico.

const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Grupo de alergia → principios activos / marcas relacionadas
const FAMILIAS = [
  { alergia: ['penicilina', 'amoxicilina', 'ampicilina', 'betalactam'], medicamentos: ['penicilina', 'amoxicilina', 'ampicilina', 'clavulan', 'cefalexina', 'ceftriaxona', 'cefuroxima'], nombre: 'penicilinas / betalactámicos' },
  { alergia: ['aspirina', 'acido acetilsalicilico', 'aine', 'antiinflamatorio', 'ibuprofeno', 'diclofenac', 'ketorolac', 'naproxeno'], medicamentos: ['aspirina', 'acido acetilsalicilico', 'ibuprofeno', 'diclofenac', 'ketorolac', 'naproxeno', 'ketoprofeno', 'indometacina', 'meloxicam'], nombre: 'AINEs' },
  { alergia: ['sulfa', 'sulfamida', 'trimetoprima'], medicamentos: ['sulfa', 'trimetoprima', 'cotrimoxazol', 'bactrim'], nombre: 'sulfamidas' },
  { alergia: ['dipirona', 'metamizol'], medicamentos: ['dipirona', 'metamizol'], nombre: 'dipirona' },
  { alergia: ['codeina', 'morfina', 'opioide', 'tramadol'], medicamentos: ['codeina', 'morfina', 'tramadol', 'fentanilo'], nombre: 'opioides' },
]

// Devuelve [{ medicamento, alergia, motivo }] por cada coincidencia encontrada.
export function conflictosAlergia(alergiasTexto, medicamentos) {
  const alergias = sinTildes(alergiasTexto)
  if (!alergias.trim()) return []
  const tokens = alergias.split(/[,;/\n]| y /).map(t => t.trim()).filter(t => t.length >= 4)
  const res = []
  for (const med of medicamentos) {
    const m = sinTildes(med)
    if (!m.trim()) continue
    const directo = tokens.find(t => m.includes(t) || (m.length >= 4 && t.includes(m.split(/\s+/)[0]) && m.split(/\s+/)[0].length >= 4))
    if (directo) { res.push({ medicamento: med, alergia: directo, motivo: 'coincide con una alergia registrada' }); continue }
    const fam = FAMILIAS.find(f => f.alergia.some(a => alergias.includes(a)) && f.medicamentos.some(x => m.includes(x)))
    if (fam) res.push({ medicamento: med, alergia: fam.nombre, motivo: `pertenece a la familia de ${fam.nombre}` })
  }
  return res
}
