import { useState } from 'react'
import { X, Printer, FlaskConical, FileSignature } from 'lucide-react'
import { imprimirOrdenEstudios, imprimirConsentimiento } from '../../lib/plantillas'
import { nombreDe } from '../../lib/documentos'

const CAMPO = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40'

// Formulario corto para emitir una orden de estudios o un consentimiento informado.
export function ModalDocumentoClinico({ tipo, paciente, cobertura, perfil, onClose }) {
  const esOrden = tipo === 'orden'
  const [diagnostico, setDiagnostico] = useState('')
  const [estudios, setEstudios] = useState('')
  const [prioridad, setPrioridad] = useState('Normal')
  const [indicaciones, setIndicaciones] = useState('')
  const [procedimiento, setProcedimiento] = useState('')
  const [riesgos, setRiesgos] = useState('')
  const [alternativas, setAlternativas] = useState('')
  const [error, setError] = useState('')

  const emitir = () => {
    if (esOrden) {
      const lista = estudios.split('\n').map(x => x.trim()).filter(Boolean)
      if (!lista.length) return setError('Escribí al menos un estudio (uno por línea).')
      imprimirOrdenEstudios({ paciente, cobertura, medico: perfil, estudios: lista, diagnostico, prioridad, indicaciones, generadoPor: nombreDe(perfil) })
    } else {
      if (!procedimiento.trim() || !riesgos.trim()) return setError('Completá el procedimiento y los riesgos explicados.')
      imprimirConsentimiento({ paciente, medico: perfil, procedimiento, riesgos, alternativas, generadoPor: nombreDe(perfil) })
    }
    onClose()
  }

  const Icono = esOrden ? FlaskConical : FileSignature
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#013FF6]/10 flex items-center justify-center"><Icono className="h-5 w-5 text-[#013FF6]" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{esOrden ? 'Orden de estudios' : 'Consentimiento informado'}</h2>
              <p className="text-xs text-slate-400">{paciente.nombre} {paciente.apellido} · DNI {paciente.dni}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          {esOrden ? (
            <>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Diagnóstico presuntivo</label>
                <input className={CAMPO} value={diagnostico} onChange={e => { setDiagnostico(e.target.value); setError('') }} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Estudios (uno por línea) *</label>
                <textarea rows={4} className={CAMPO} value={estudios} onChange={e => { setEstudios(e.target.value); setError('') }}
                  placeholder={'Hemograma completo\nRadiografía de tórax frente y perfil'} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Prioridad</label>
                <select className={CAMPO} value={prioridad} onChange={e => setPrioridad(e.target.value)}>
                  <option>Normal</option><option>Urgente</option></select></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Indicaciones</label>
                <textarea rows={2} className={CAMPO} value={indicaciones} onChange={e => setIndicaciones(e.target.value)} placeholder="Ej.: ayuno de 8 horas" /></div>
            </>
          ) : (
            <>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Procedimiento *</label>
                <textarea rows={2} className={CAMPO} value={procedimiento} onChange={e => { setProcedimiento(e.target.value); setError('') }} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Riesgos y beneficios explicados *</label>
                <textarea rows={3} className={CAMPO} value={riesgos} onChange={e => { setRiesgos(e.target.value); setError('') }} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Alternativas</label>
                <textarea rows={2} className={CAMPO} value={alternativas} onChange={e => setAlternativas(e.target.value)} /></div>
            </>
          )}
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={emitir} className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" /> Generar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
