import type { Metadata } from 'next'
import { QueryProvider } from '@/providers/query-provider'
import { ShopProvider } from '@/providers/shop-provider'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OnPrints',
  description: 'Print shop management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const t = localStorage.getItem('sp-theme');
              if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            } catch(e) {}
          `
        }} />
      </head>
      <body>
        <QueryProvider>
          <ShopProvider>{children}</ShopProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
