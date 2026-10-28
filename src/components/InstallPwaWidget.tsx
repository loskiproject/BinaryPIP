import React, { useState, useEffect } from 'react'
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPwaWidget() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('binarypip_pwa_dismissed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    // 1. Check if running inside installed App (standalone / fullscreen)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
        document.referrer.includes('android-app://')
      setIsStandalone(Boolean(isStandaloneMode))
    }

    checkStandalone()

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIos(iosDevice)

    // 3. Capture PWA beforeinstallprompt event (Android / Chrome / Edge / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      ;(window as unknown as { deferredPwaPrompt?: BeforeInstallPromptEvent }).deferredPwaPrompt = promptEvent
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true)
    })

    // Check if global prompt was captured in index.html
    const globalPwaPrompt = (window as unknown as { deferredPwaPrompt?: BeforeInstallPromptEvent }).deferredPwaPrompt
    if (globalPwaPrompt) {
      setDeferredPrompt(globalPwaPrompt)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // If client is already inside the installed standalone App, or closed the button, hide it completely!
  if (isStandalone || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem('binarypip_pwa_dismissed', 'true')
    } catch {
      // silent
    }
  }

  const handleInstallClick = async () => {
    // Attempt native 1-click install prompt if available (Android, Chrome, Edge, Windows, Mac)
    const activePrompt = (window as unknown as { deferredPwaPrompt?: BeforeInstallPromptEvent }).deferredPwaPrompt || deferredPrompt

    if (activePrompt) {
      try {
        await activePrompt.prompt()
        const choice = await activePrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsStandalone(true)
          ;(window as unknown as { deferredPwaPrompt?: unknown }).deferredPwaPrompt = null
          setDeferredPrompt(null)
          return
        }
      } catch {
        // silent
      }
    }

    // On iOS Safari or browsers where prompt isn't directly callable, show the guide
    if (isIos) {
      setShowIosModal(true)
      return
    }

    setShowIosModal(true)
  }

  return (
    <>
      {/* ── FLOATING DOWNLOAD APP BUTTON (WEB BROWSERS ONLY) ── */}
      <div
        style={{
          position: 'fixed',
          top: '72px',
          right: '16px',
          zIndex: 99990,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          animation: 'pwaPulseGlow 3s infinite ease-in-out',
        }}
      >
        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            background: 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)',
            color: '#030916',
            border: 'none',
            borderRadius: '24px',
            padding: '9px 15px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.4px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 230, 118, 0.45), 0 0 12px rgba(0, 176, 255, 0.3)',
            transition: 'transform 0.2s ease, boxShadow 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Smartphone size={16} color="#030916" />
          <span>DOWNLOAD APP</span>
          <Download size={14} color="#030916" />
        </button>

        {/* Dismiss Close (✕) Button */}
        <button
          type="button"
          onClick={handleDismiss}
          title="Dismiss install button"
          aria-label="Close install app banner"
          style={{
            background: 'rgba(3, 14, 30, 0.85)',
            border: '1px solid rgba(0, 230, 118, 0.35)',
            color: '#a0aec0',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'color 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#ffffff'
            e.currentTarget.style.background = 'rgba(255, 23, 68, 0.6)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#a0aec0'
            e.currentTarget.style.background = 'rgba(3, 14, 30, 0.85)'
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── IOS / SAFARI INSTANT INSTALL GUIDE MODAL ── */}
      {showIosModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(3, 9, 22, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowIosModal(false)}
        >
          <div
            style={{
              background: '#071326',
              border: '1px solid rgba(0, 230, 118, 0.4)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 230, 118, 0.25)',
              borderRadius: '24px',
              padding: '32px 24px 24px',
              maxWidth: '430px',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '18px',
              position: 'relative',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#a0aec0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            {/* Top Icon Badge */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(0, 230, 118, 0.15)',
                border: '2px solid #00e676',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00e676',
                boxShadow: '0 0 24px rgba(0, 230, 118, 0.35)',
              }}
            >
              <Smartphone size={32} color="#00e676" />
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#00e676', textTransform: 'uppercase', letterSpacing: '1px' }}>
                INSTANT NATIVE APP
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: '4px 0 0' }}>
                Install BinaryPip App
              </h2>
            </div>

            {/* Step-by-Step Instructions */}
            <div
              style={{
                background: 'rgba(3, 20, 42, 0.75)',
                border: '1px solid rgba(0, 230, 118, 0.25)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'left',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(0, 230, 118, 0.2)', color: '#00e676', fontWeight: 900, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  1
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.4 }}>
                  Tap the <strong style={{ color: '#00e676', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Share <Share2 size={14} /></strong> button in your browser toolbar.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(0, 230, 118, 0.2)', color: '#00e676', fontWeight: 900, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  2
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.4 }}>
                  Scroll down and select <strong style={{ color: '#00e676', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Add to Home Screen <PlusSquare size={14} /></strong>.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(0, 230, 118, 0.2)', color: '#00e676', fontWeight: 900, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  3
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.4 }}>
                  Launch <strong style={{ color: '#ffffff' }}>BinaryPip</strong> from your home screen full-screen!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)',
                color: '#030916',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(0, 230, 118, 0.35)',
              }}
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
