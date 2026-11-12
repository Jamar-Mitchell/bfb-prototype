import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/** Navigate and scroll to the top, as every prototype screen change did. */
export function useAppNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (path: string) => {
      navigate(path)
      window.scrollTo(0, 0)
    },
    [navigate],
  )
}
