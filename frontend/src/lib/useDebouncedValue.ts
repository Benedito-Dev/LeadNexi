import { useEffect, useState } from 'react'

/** Valor que só acompanha `value` depois de `delay` ms sem mudanças (ex.: busca ao digitar). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
