import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Battery, Thermometer, HardDrive,
  Cpu, Volume2, Wifi, Monitor, FileText, Info
} from 'lucide-react'
import type { Page } from '../../App'
import './Sidebar.css'

interface NavItem {
  id: Page
  label: string
  icon: React.ElementType
  group?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard, group: 'Overview' },
  { id: 'battery',   label: 'Battery',       icon: Battery,         group: 'Hardware' },
  { id: 'thermal',   label: 'Thermal',       icon: Thermometer,     group: 'Hardware' },
  { id: 'disk',      label: 'Storage',       icon: HardDrive,       group: 'Hardware' },
  { id: 'cpuram',    label: 'CPU & RAM',     icon: Cpu,             group: 'Hardware' },
  { id: 'audio',     label: 'Audio',         icon: Volume2,         group: 'Peripherals' },
  { id: 'network',   label: 'Network',       icon: Wifi,            group: 'Peripherals' },
  { id: 'display',   label: 'Display',       icon: Monitor,         group: 'Peripherals' },
  { id: 'reports',   label: 'Reports',       icon: FileText,        group: 'Tools' },
  { id: 'about',     label: 'About',         icon: Info,            group: 'Tools' }
]

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  const groups = [...new Set(NAV_ITEMS.map((i) => i.group))]
  const [version, setVersion] = useState('3.5.2')

  useEffect(() => {
    window.systemlens?.app?.getVersion?.()
      ?.then((v: string) => { if (v) setVersion(v) })
      .catch(() => {})
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">SystemLens</div>
        <div className="sidebar-brand-tag">Laptop health monitor</div>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div className="nav-group" key={group}>
            <span className="nav-group-label">{group}</span>
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                >
                  {isActive && <div className="nav-active-bar" />}
                  <Icon size={16} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="branding-text">Software by Mahima Paseda · Sri Lanka</div>
        <div className="version-badge">v{version}</div>
      </div>
    </aside>
  )
}
