import { useEffect, useRef, useState } from 'react'
import { loadAds, trackAd } from './adsApi.js'

const INTERVAL = 5000

export default function AdSlider({ position, lang, t }) {
  const [ads, setAds] = useState([])
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const seen = useRef(new Set())
  const touchX = useRef(null)

  useEffect(() => {
    let live = true
    loadAds(position).then((rows) => live && setAds(rows))
    return () => {
      live = false
    }
  }, [position])

  const list = ads.filter((a) => a.lang === 'all' || a.lang === lang)
  const n = list.length

  useEffect(() => setI(0), [lang, n])

  useEffect(() => {
    if (n < 2 || paused) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setTimeout(() => setI((x) => (x + 1) % n), INTERVAL)
    return () => clearTimeout(id)
  }, [n, paused, i])

  useEffect(() => {
    const ad = list[i]
    if (ad && !seen.current.has(ad.id)) {
      seen.current.add(ad.id)
      trackAd(ad.id, 'impression')
    }
  }, [i, list])

  if (!n) return null

  const go = (d) => setI((x) => (x + d + n) % n)

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX
    setPaused(true)
  }
  const onTouchEnd = (e) => {
    if (touchX.current != null) {
      const dx = e.changedTouches[0].clientX - touchX.current
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
    }
    touchX.current = null
    setPaused(false)
  }

  return (
    <section
      className={'ads ads-' + position}
      aria-roledescription="carousel"
      aria-label={t.adLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="ads-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {list.map((ad, k) => (
          <a
            key={ad.id}
            className="ads-slide"
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-hidden={k !== i}
            tabIndex={k === i ? 0 : -1}
            onClick={() => trackAd(ad.id, 'click')}
          >
            <img src={ad.image_url} alt={ad.title} loading={k === 0 ? 'eager' : 'lazy'} draggable="false" />
          </a>
        ))}
      </div>

      <span className="ads-tag">{t.adTag}</span>

      {n > 1 && (
        <>
          <button type="button" className="ads-nav ads-prev" aria-label={t.adPrev} onClick={() => go(-1)}>
            ‹
          </button>
          <button type="button" className="ads-nav ads-next" aria-label={t.adNext} onClick={() => go(1)}>
            ›
          </button>
          <div className="ads-dots">
            {list.map((ad, k) => (
              <button
                key={ad.id}
                type="button"
                className={k === i ? 'on' : ''}
                aria-label={`${k + 1} / ${n}`}
                onClick={() => setI(k)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
