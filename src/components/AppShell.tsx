import { Suspense } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import NotifPopup from './NotifPopup'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Suspense>
        <Sidebar />
      </Suspense>
      <div className="main-area">
        <Topbar />
        <main className="page-content">{children}</main>
      </div>
      <NotifPopup />
    </div>
  )
}
