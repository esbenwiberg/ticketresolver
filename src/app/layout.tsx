import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ticket Resolver',
  description: 'AI-powered customer ticket resolution with self-improving knowledge base',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-950 text-gray-100 flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="px-4 py-5 border-b border-gray-800">
            <span className="text-lg font-bold text-white">TicketResolver</span>
            <p className="text-xs text-gray-400 mt-0.5">AI-powered support</p>
          </div>

          <nav className="flex-1 py-4 px-2 space-y-1">
            <NavLink href="/" label="Resolve Ticket" icon="🎫" />
            <NavLink href="/learnings" label="Learnings" icon="🧠" />
          </nav>

          <div className="px-4 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">Hivemind knowledge base</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  )
}
