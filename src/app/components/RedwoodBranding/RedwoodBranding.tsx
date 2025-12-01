'use client'

import { useState } from 'react'

export function RedwoodBranding() {
  const [showPanel, setShowPanel] = useState(false)

  return (
    <>
      {/* Redwood SDK button - bottom left */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-4 left-4 z-40 w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 border-2 border-red-500"
        title="Made with Redwood SDK"
      >
        <svg width="24" height="26" viewBox="0 0 30 33" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.2923 0.238008C15.0438 0.0775652 14.7243 0.0775652 14.4758 0.238008L0.909058 8.99693C0.689533 9.13378 0.554688 9.37481 0.554688 9.63557V22.5997C0.554688 22.8553 0.684386 23.0934 0.899105 23.232L14.4758 31.9973C14.7243 32.1578 15.0438 32.1578 15.2923 31.9973L28.869 23.232C29.0837 23.0934 29.2134 22.8553 29.2134 22.5997V9.63754C29.2141 9.37669 29.0797 9.13446 28.8591 8.99695L15.2923 0.238008Z" fill="black"/>
          <path d="M27.729 10.979V21.2562L23.0215 18.217L25.3211 16.7323C25.5299 16.5975 25.656 16.366 25.656 16.1176C25.656 15.8691 25.5299 15.6376 25.3211 15.5028L23.0216 14.0182L27.729 10.979Z" fill="#E73C36"/>
          <path d="M2.03858 10.979V21.2562L6.74609 18.217L4.44647 16.7323C4.23772 16.5975 4.11162 16.366 4.11162 16.1176C4.11162 15.8691 4.23771 15.6376 4.44647 15.5028L6.74602 14.0182L2.03858 10.979Z" fill="#E73C36"/>
          <path d="M14.8846 8.76451L9.44531 5.25286L14.8846 1.74121L20.3238 5.25286L14.8846 8.76451Z" fill="#FFAD48"/>
          <path d="M14.8846 30.494L9.44531 26.9824L14.8846 23.4707L20.3238 26.9824L14.8846 30.494Z" fill="#FFAD48"/>
          <path d="M8.11016 26.1036L2.6709 22.592L8.11016 19.0803L13.5494 22.592L8.11016 26.1036Z" fill="#F47238"/>
          <path d="M8.11016 13.1473L2.6709 9.63568L8.11016 6.12402L13.5494 9.63568L8.11016 13.1473Z" fill="#F47238"/>
          <path d="M21.658 26.1036L16.2188 22.592L21.658 19.0803L27.0973 22.592L21.658 26.1036Z" fill="#F47238"/>
          <path d="M21.658 13.1473L16.2188 9.63568L21.658 6.12402L27.0973 9.63568L21.658 13.1473Z" fill="#F47238"/>
          <path d="M14.8845 21.7286L6.19336 16.1176C9.09042 14.2472 11.9874 12.377 14.8845 10.5066C17.7815 12.3769 20.6786 14.2472 23.5756 16.1176L14.8845 21.7286Z" fill="#8B2343"/>
        </svg>
      </button>

      {/* Redwood SDK info panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowPanel(false)}
          />
          
          {/* Panel */}
          <div className="fixed bottom-20 left-4 z-50 bg-slate-800 rounded-xl border-2 border-red-500 shadow-2xl p-6 max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <svg width="40" height="44" viewBox="0 0 30 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.2923 0.238008C15.0438 0.0775652 14.7243 0.0775652 14.4758 0.238008L0.909058 8.99693C0.689533 9.13378 0.554688 9.37481 0.554688 9.63557V22.5997C0.554688 22.8553 0.684386 23.0934 0.899105 23.232L14.4758 31.9973C14.7243 32.1578 15.0438 32.1578 15.2923 31.9973L28.869 23.232C29.0837 23.0934 29.2134 22.8553 29.2134 22.5997V9.63754C29.2141 9.37669 29.0797 9.13446 28.8591 8.99695L15.2923 0.238008Z" fill="black"/>
                <path d="M27.729 10.979V21.2562L23.0215 18.217L25.3211 16.7323C25.5299 16.5975 25.656 16.366 25.656 16.1176C25.656 15.8691 25.5299 15.6376 25.3211 15.5028L23.0216 14.0182L27.729 10.979Z" fill="#E73C36"/>
                <path d="M2.03858 10.979V21.2562L6.74609 18.217L4.44647 16.7323C4.23772 16.5975 4.11162 16.366 4.11162 16.1176C4.11162 15.8691 4.23771 15.6376 4.44647 15.5028L6.74602 14.0182L2.03858 10.979Z" fill="#E73C36"/>
                <path d="M14.8846 8.76451L9.44531 5.25286L14.8846 1.74121L20.3238 5.25286L14.8846 8.76451Z" fill="#FFAD48"/>
                <path d="M14.8846 30.494L9.44531 26.9824L14.8846 23.4707L20.3238 26.9824L14.8846 30.494Z" fill="#FFAD48"/>
                <path d="M8.11016 26.1036L2.6709 22.592L8.11016 19.0803L13.5494 22.592L8.11016 26.1036Z" fill="#F47238"/>
                <path d="M8.11016 13.1473L2.6709 9.63568L8.11016 6.12402L13.5494 9.63568L8.11016 13.1473Z" fill="#F47238"/>
                <path d="M21.658 26.1036L16.2188 22.592L21.658 19.0803L27.0973 22.592L21.658 26.1036Z" fill="#F47238"/>
                <path d="M21.658 13.1473L16.2188 9.63568L21.658 6.12402L27.0973 9.63568L21.658 13.1473Z" fill="#F47238"/>
                <path d="M14.8845 21.7286L6.19336 16.1176C9.09042 14.2472 11.9874 12.377 14.8845 10.5066C17.7815 12.3769 20.6786 14.2472 23.5756 16.1176L14.8845 21.7286Z" fill="#8B2343"/>
              </svg>
              <div>
                <h3 className="text-white font-bold text-lg">Redwood SDK</h3>
                <p className="text-gray-400 text-sm">Real-time multiplayer framework</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <a
                href="https://github.com/redwoodsdk/redwood"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm">GitHub</span>
              </a>
              
              <a
                href="https://redwoodsdk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                </svg>
                <span className="text-sm">redwoodsdk.com</span>
              </a>
            </div>
            
            <button
              onClick={() => setShowPanel(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </>
  )
}