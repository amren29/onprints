import { Suspense } from 'react'
import MyStoreSidebar from './MyStoreSidebar'
import Topbar from './Topbar'

export default function MyStoreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Suspense>
        <MyStoreSidebar />
      </Suspense>
      <div className="main-area">
        <Topbar />
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
