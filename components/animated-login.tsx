'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const LoginForm = dynamic(() => import('./login-form'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  ),
  ssr: false // Karena komponen menggunakan fitur browser-specific
})

export default function Component() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}