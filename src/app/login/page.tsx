import Link from 'next/link'
import { login, signInWithGoogle, resetPassword } from './actions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const message = typeof resolvedParams.message === 'string' ? resolvedParams.message : ''
  const role = typeof resolvedParams.role === 'string' ? resolvedParams.role : 'guest'
  const next = typeof resolvedParams.next === 'string' ? resolvedParams.next : '/'
  
  const title = role === 'owner' ? "Property Owner Sign in" : 
                role === 'influencer' ? "Agent Sign in" : 
                role === 'admin' ? "Admin Sign in" : "Sign in"

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen bg-gray-50 items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col gap-2 mb-8 items-center text-center">
          <Link href="/">
            <h1 className="text-3xl font-extrabold text-blue-600 hover:text-blue-700 transition">Fixy Stays</h1>
          </Link>
          <p className="text-gray-500 font-medium">{title}</p>
        </div>

        <form className="flex flex-col w-full justify-center gap-5 text-gray-700">
          <input type="hidden" name="next" value={next} />
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="font-bold">Email</Label>
            <Input name="email" id="email" placeholder="you@example.com" required className="h-11 rounded-xl bg-gray-50/50 border-gray-200 focus:border-blue-500 transition-colors" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-bold">Password</Label>
              <button 
                formAction={resetPassword}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              className="h-11 rounded-xl bg-gray-50/50 border-gray-200 focus:border-blue-500 transition-colors"
            />
          </div>

          <Button formAction={login} className="mt-2 w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-md transition-all">
            Sign In
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-100"></span>
          </div>
          <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
            <span className="bg-white px-3 text-gray-400">Or continue with</span>
          </div>
        </div>

        <form action={signInWithGoogle}>
          <Button 
            variant="outline" 
            type="submit" 
            className="w-full h-11 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 font-bold shadow-sm transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18c-.77 1.56-1.21 3.31-1.21 5.15s.44 3.59 1.21 5.15l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </Button>
        </form>

        {message && (
          <p className={cn(
            "mt-6 p-4 border rounded-xl text-sm text-center font-medium",
            message.toLowerCase().includes('check') || message.toLowerCase().includes('created')
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-600 border-red-200"
          )}>
            {message}
          </p>
        )}
          
        <div className="text-center mt-8 text-sm text-gray-500 font-medium">
          Don&apos;t have an account?{" "}
          <Link href={`/signup?role=${role}`} className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
