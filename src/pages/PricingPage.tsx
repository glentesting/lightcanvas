import { Link } from 'react-router-dom'
import logo from '../assets/LightCanvas_Logo_Transparent.png'

const FREE_FEATURES = [
  { included: true, text: '2 controllers' },
  { included: true, text: 'Up to 3 songs' },
  { included: true, text: 'All prop types' },
  { included: true, text: 'AI sequencing (1/day)' },
  { included: true, text: 'Visual timeline editor' },
  { included: false, text: 'FSEQ / xLights export' },
  { included: false, text: 'Unlimited songs' },
  { included: false, text: 'Sequence credits' },
]

const PRO_FEATURES = [
  { included: true, text: 'Unlimited controllers' },
  { included: true, text: 'Unlimited songs' },
  { included: true, text: 'All prop types' },
  { included: true, text: 'Unlimited AI sequencing' },
  { included: true, text: 'Visual timeline editor' },
  { included: true, text: 'FSEQ + xLights export' },
  { included: true, text: 'Show file ZIP download' },
  { included: true, text: '3 sequence credits/year' },
  { included: true, text: 'Priority support' },
]

const FAQ = [
  {
    q: 'Does it work with LOR hardware?',
    a: 'Yes. LightCanvas exports FSEQ files that work with Falcon Player (FPP), which drives LOR and most pixel controllers.',
  },
  {
    q: 'What about xLights?',
    a: "We export xLights-compatible sequence files. If you're coming from xLights, your workflow stays the same.",
  },
  {
    q: 'Can I try Pro before paying?',
    a: 'The free tier is fully functional — build a show, design your display, use the AI sequencer. Pro unlocks the export formats and removes limits.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="LightCanvas" className="h-8 w-auto" />
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Back to app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="mx-auto max-w-3xl px-6 pb-8 pt-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Simple pricing. One plan.
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Everything you need to run a real light show.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="mx-auto grid max-w-4xl gap-6 px-6 pb-20 sm:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border border-slate-200 p-8">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">Free</div>
          <div className="mt-2 text-4xl font-bold text-slate-900">$0</div>
          <div className="mt-1 text-sm text-slate-500">Forever. No credit card.</div>
          <ul className="mt-6 space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 shrink-0 ${f.included ? 'text-brand-green' : 'text-slate-300'}`}>
                  {f.included ? '\u2713' : '\u2717'}
                </span>
                <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/login"
            className="mt-8 block w-full rounded-lg border border-slate-300 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Get started free
          </Link>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border-2 border-brand-green p-8 shadow-lg">
          <div className="absolute -top-3 right-6 rounded-full bg-brand-green px-3 py-0.5 text-xs font-semibold text-white">
            Most popular
          </div>
          <div className="text-sm font-semibold uppercase tracking-wider text-brand-green">Pro</div>
          <div className="mt-2 text-4xl font-bold text-slate-900">$12.99<span className="text-lg font-medium text-slate-500">/mo</span></div>
          <div className="mt-1 text-sm text-slate-500">or $109/year — save $47</div>
          <ul className="mt-6 space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-brand-green">{'\u2713'}</span>
                <span className="text-slate-700">{f.text}</span>
              </li>
            ))}
          </ul>
          <a
            href="https://buy.stripe.com/placeholder"
            className="mt-8 block w-full rounded-lg bg-brand-green py-3 text-center text-sm font-semibold text-white transition hover:brightness-110"
          >
            Go Premium
          </a>
          <p className="mt-2 text-center text-xs text-slate-500">Cancel anytime.</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">Questions</h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        LightCanvas &copy; 2026 &middot; lightcanvas.co
      </footer>
    </div>
  )
}
