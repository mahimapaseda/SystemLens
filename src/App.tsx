import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './pages/Dashboard'
import Battery from './pages/Battery'
import Thermal from './pages/Thermal'
import Disk from './pages/Disk'
import CpuRam from './pages/CpuRam'
import Audio from './pages/Audio'
import Network from './pages/Network'
import Display from './pages/Display'
import Reports from './pages/Reports'
import About from './pages/About'
import './App.css'

export type Page =
  | 'dashboard'
  | 'battery'
  | 'thermal'
  | 'disk'
  | 'cpuram'
  | 'audio'
  | 'network'
  | 'display'
  | 'reports'
  | 'about'

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('systemlens-theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('systemlens-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />
      case 'battery':   return <Battery />
      case 'thermal':   return <Thermal />
      case 'disk':      return <Disk />
      case 'cpuram':    return <CpuRam />
      case 'audio':     return <Audio />
      case 'network':   return <Network />
      case 'display':   return <Display />
      case 'reports':   return <Reports />
      case 'about':     return <About />
      default:          return <Dashboard />
    }
  }

  return (
    <div className="app-shell">
      <TopBar activePage={activePage} theme={theme} toggleTheme={toggleTheme} />
      <div className="app-body">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="app-content">
          <div className="page-wrapper animate-fade-in" key={activePage}>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}
