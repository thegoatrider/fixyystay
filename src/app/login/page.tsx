import Link from 'next/link'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function LoginPage(
  props: {
    searchParams: Promise<{ message: string, role?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const requestedRole = searchParams.role || 'guest';
  
  let title = "Sign in (Guest)"
  if (requestedRole === 'owner') title = "Property Owner Sign in"
  if (requestedRole === 'influencer') title = "Agent Sign in"
  if (requestedRole === 'admin') title = "Admin Sign in"

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
      <div className="flex flex-col gap-2 mb-8 items-center text-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">FixStay</h1>
        <p className="text-gray-500">{title}</p>
      </div>

      <form className="flex-1 flex flex-col w-full justify-center gap-4 text-foreground">
        
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="••••••••"
            required
          />
        </div>

        <Button formAction={login} className="mt-4 w-full">
          Sign In
        </Button>

        {searchParams?.message && (
          <p className="mt-4 p-4 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm text-center">
            {searchParams.message}
          </p>
        )}
        
        <div className="text-center mt-4 text-sm text-gray-500">
          Don't have an account?{" "}
          <Link href={`/signup?role=${requestedRole}`} className="text-blue-600 font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  )
}
