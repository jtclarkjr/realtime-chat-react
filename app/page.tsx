import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Home() {
  // Check authentication server-side
  const headersList = await headers()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const request = new Request(baseUrl, {
    headers: Object.fromEntries(headersList.entries())
  })
  const { supabase } = createClient(request)
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Redirect authenticated users to the authenticated layout
  redirect('/(authenticated)')
}
