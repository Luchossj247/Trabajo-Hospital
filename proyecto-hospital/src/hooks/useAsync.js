import { useState, useEffect, useCallback } from 'react'

/**
 * Hook genérico para llamadas async a servicios de Supabase.
 *
 * @param {Function} fn        - Función async que retorna datos
 * @param {Array}    deps      - Dependencias para re-ejecutar (como useEffect)
 * @param {boolean}  immediate - Si ejecuta al montar (default: true)
 *
 * @example
 * const { data, loading, error, refetch } = useAsync(getCamas, [])
 */
export function useAsync(fn, deps = [], immediate = true) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError]     = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      setData(result)
      return result
    } catch (err) {
      setError(err.message || 'Error inesperado')
      return null
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute()
  }, [execute]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: execute }
}

/**
 * Hook para mutaciones (create, update, delete).
 * No ejecuta automáticamente, solo expone `mutate`.
 *
 * @example
 * const { mutate, loading, error } = useMutation(createPaciente)
 * await mutate({ nombre: 'Juan', ... })
 */
export function useMutation(fn) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      return result
    } catch (err) {
      setError(err.message || 'Error inesperado')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fn])

  return { mutate, loading, error }
}