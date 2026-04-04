import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LightCanvasWordmark } from '../components/LightCanvasWordmark'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { session, loading, configured, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (configured && !loading && session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email.trim(), password)
        if (err) {
          setError(err.message)
          return
        }
        navigate(from, { replace: true })
      } else {
        const { error: err, needsEmailConfirmation } = await signUp(email.trim(), password)
        if (err) {
          setError(err.message)
          return
        }
        if (needsEmailConfirmation) {
          setMessage('Check your email for a confirmation link, then sign in.')
          setMode('signin')
          setPassword('')
        } else {
          navigate(from, { replace: true })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-green/[0.07] via-white to-brand-red/[0.06] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 border-t-[3px] border-t-brand-green bg-white p-8 shadow-xl shadow-brand-soft">
        <div className="text-center">
          <div className="flex justify-center">
            <LightCanvasWordmark className="text-3xl font-semibold tracking-tight md:text-4xl" />
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-red/90">Sequencer</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'signin'
              ? 'Use your email and password to continue.'
              : 'Sign up with email and password.'}
          </p>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Supabase is not configured</p>
            <p className="mt-2 text-amber-800/90">
              Create a <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env</code> file in
              the project root with{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
              (see <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env.example</code>), then
              restart the dev server.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex rounded-2xl bg-gradient-to-r from-brand-green/15 via-slate-200/80 to-brand-red/15 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setError(null)
              setMessage(null)
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
              mode === 'signin'
                ? 'bg-white text-brand-green shadow-sm ring-1 ring-brand-green/35'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError(null)
              setMessage(null)
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-white text-brand-red shadow-sm ring-1 ring-brand-red/35'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/25"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/25"
            />
            {mode === 'signup' ? (
              <p className="mt-1 text-xs text-slate-500">At least 6 characters (match your Supabase policy).</p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-xl border border-brand-green/35 bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !configured}
            className="w-full rounded-2xl bg-brand-green py-3 text-sm font-medium text-white shadow-brand-soft transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing you agree to your project&apos;s auth settings in the Supabase dashboard.
        </p>
      </div>

      {configured ? (
        <p className="mt-8 text-center text-sm text-slate-500">
          <Link
            to="/"
            className="font-medium text-brand-green underline-offset-2 hover:text-brand-green-dark hover:underline"
          >
            Home
          </Link>{' '}
          (requires sign-in)
        </p>
      ) : null}
    </div>
  )
}
