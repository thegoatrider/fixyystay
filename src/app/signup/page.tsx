import Link from 'next/link'
import { signup } from '../login/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SignupPage(
  props: {
    searchParams: Promise<{ message: string, role?: string, next?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const requestedRole = searchParams.role || 'guest';
  const next = searchParams.next || '/';
  
  let title = "Create a Guest Account"
  if (requestedRole === 'owner') title = "Register as a Property Owner"
  if (requestedRole === 'influencer') title = "Join as an Influencer / Agent"
  if (requestedRole === 'admin') title = "Create Admin Account" // Usually Admins don't sign up freely, but left for demo purposes
  if (requestedRole === 'admin') {
    return (
      <div className="flex-1 flex flex-col w-full h-screen justify-center items-center text-center gap-4">
        <h1 className="text-3xl font-bold text-red-600">403 Forbidden</h1>
        <p className="text-gray-600">Admin accounts cannot be created via public signup.</p>
        <Link href="/" className="text-blue-600 hover:underline">Return to Home</Link>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
      <div className="flex flex-col gap-2 mb-8 items-center text-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">FixStay</h1>
        <p className="text-gray-500">{title}</p>
      </div>

      <form className="flex-1 flex flex-col w-full justify-center gap-4 text-foreground">
        
        {/* Hidden role input based on intent */}
        <input type="hidden" name="role" value={requestedRole} />
        <input type="hidden" name="next" value={next} />
        
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full Name</Label>
          <Input name="name" placeholder="John Doe" required />
        </div>

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
            minLength={6}
          />
        </div>

        <Button formAction={signup} className="mt-4 w-full">
          Sign Up
        </Button>

        {searchParams?.message && (
          <p className="mt-4 p-4 bg-red-50 text-red-600 rounded-md text-sm text-center border border-red-200">
            {searchParams.message}
          </p>
        )}
        
        <div className="text-center mt-4 text-sm text-gray-500">
          Already have an account?{" "}
          <Link href={`/login?role=${requestedRole}&next=${encodeURIComponent(next)}`} className="text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}
