import { useEffect, useState } from 'react'
import { Github, Download, ExternalLink, Heart } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import './ModulePage.css'
import './About.css'

const lc = window.systemlens
const RELEASES_URL = 'https://github.com/mahimapaseda/LapCharm/releases'
const REPO_URL = 'https://github.com/mahimapaseda/LapCharm'

export default function About() {
  const [version, setVersion] = useState('3.5.2')

  useEffect(() => {
    lc?.app?.getVersion?.()
      ?.then((v: string) => { if (v) setVersion(v) })
      .catch(() => {})
  }, [])

  const open = (url: string) => {
    lc?.shell?.openExternal?.(url)
  }

  return (
    <div className="module-page about-page">
      <div className="about-hero card">
        <img src={logoUrl} alt="SystemLens" className="about-logo" width={72} height={72} />
        <div className="about-hero-text">
          <h1 className="module-title">SystemLens</h1>
          <p className="module-subtitle">Laptop health monitor for Windows</p>
          <span className="about-version">Version {version}</span>
        </div>
      </div>

      <div className="card about-block">
        <h2 className="card-section-title">About</h2>
        <p className="about-copy">
          SystemLens helps you understand your laptop’s health — battery, thermals, storage,
          CPU, RAM, audio, network, and display — with a clear score and exportable reports.
          All diagnostics run locally on your PC.
        </p>
      </div>

      <div className="card about-block">
        <h2 className="card-section-title">Creator</h2>
        <p className="about-copy about-credit">
          <Heart size={14} className="about-heart" />
          Software by <strong>Mahima Paseda</strong> from Sri Lanka
        </p>
      </div>

      <div className="card about-block">
        <h2 className="card-section-title">Updates</h2>
        <p className="about-copy">
          Check GitHub Releases for the latest installer. Updates are manual — download and
          install the newer Setup.exe when available.
        </p>
        <div className="about-actions">
          <button type="button" className="about-btn about-btn-primary" onClick={() => open(RELEASES_URL)}>
            <Download size={16} />
            Get latest release
          </button>
          <button type="button" className="about-btn" onClick={() => open(REPO_URL)}>
            <Github size={16} />
            View on GitHub
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      <div className="card about-block">
        <h2 className="card-section-title">License</h2>
        <p className="about-copy">
          Released under the <strong>MIT License</strong>. Free to use, share, and modify.
        </p>
      </div>

      <p className="about-tip">
        Tip: Closing the window fully exits SystemLens (it will not keep running in the background).
      </p>
    </div>
  )
}
