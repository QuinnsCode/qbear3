// The overlays use styled-jsx's `<style jsx>`; teach React's types the `jsx` attribute.
import 'react'

declare module 'react' {
  interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
    jsx?: boolean
    global?: boolean
  }
}
