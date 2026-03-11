'use client'
import { useEffect, useRef } from 'react'
import IMask, { InputMask } from 'imask'

type PropsType = {
  mask: string
  placeholder?: string
  className?: string
}

const MaskedInput = ({ mask, placeholder, className }: PropsType) => {
  const element = useRef<HTMLInputElement | null>(null)
  const maskRef = useRef<InputMask<any> | null>(null)

  useEffect(() => {
    if (element.current) {
      maskRef.current = IMask(element.current, { mask })

      return () => {
        maskRef.current?.destroy()
      }
    }
  }, [mask])

  return <input ref={element} placeholder={placeholder} className={className} />
}

export default MaskedInput
