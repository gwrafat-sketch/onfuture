import { useCallback, useEffect, useState } from 'react'
import Lobby3D from './Lobby3D.jsx'
import AdSlider from './AdSlider.jsx'
import { STRINGS } from './i18n.js'
import { ROOMS } from './rooms.js'

function detectLang() {
  try {
    const saved = localStorage.getItem('onfuture-lang')
    if (saved === 'en' || saved === 'bn') return saved
  } catch (e) {}
  return (navigator.language || '').toLowerCase().startsWith('bn') ? 'bn' : 'en'
}

export default function App() {
  const [lang, setLang] = useState(detectLang)
  const [started, setStarted] = useState(false)
  const [openRoom, setOpenRoom] = useState(null)
  const t = STRINGS[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('onfuture-lang', lang)
    } catch (e) {}
  }, [lang])

  const handleOpen = useCallback((id) => setOpenRoom(id), [])

  const room = ROOMS.find((r) => r.id === openRoom)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.svg" alt={t.brand} width="34" height="34" />
          <div>
            <div className="brand-name">{t.brand}</div>
            <div className="brand-tag">{t.tagline}</div>
          </div>
        </div>
        <div className="lang" role="group" aria-label={t.language}>
          <button
            type="button"
            className={lang === 'en' ? 'on' : ''}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={lang === 'bn' ? 'on' : ''}
            onClick={() => setLang('bn')}
          >
            বাংলা
          </button>
        </div>
      </header>

      <AdSlider position="top" lang={lang} t={t} />

      <main className="stage">
        <Lobby3D t={t} onOpenRoom={handleOpen} started={started} />
      </main>

      <AdSlider position="bottom" lang={lang} t={t} />

      {!started && (
        <div className="intro">
          <div className="intro-card">
            <img className="intro-banner" src="/banner.svg" alt={t.brand + ' — ' + t.tagline} />
            <h1>{t.welcome}</h1>
            <p>{t.welcomeText}</p>
            <p className="hint">{t.controls}</p>
            <button type="button" className="primary" onClick={() => setStarted(true)}>
              {t.enter}
            </button>
          </div>
        </div>
      )}

      {room && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setOpenRoom(null)}>
          <div
            className="modal-card"
            style={{ '--c': '#' + room.color.toString(16).padStart(6, '0') }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-badge">
              {room.adminOnly ? '🔒 ' + t.adminOnly : `${t.soon} ${room.phase}`}
            </div>
            <h2>{t.rooms[room.id].title}</h2>
            <p>{t.rooms[room.id].desc}</p>
            <button type="button" className="primary" onClick={() => setOpenRoom(null)}>
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
