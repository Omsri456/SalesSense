import { motion } from 'framer-motion'
import { ArrowRight, PlayCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FeatureCard from '../components/FeatureCard'
import WorkflowSection from '../components/WorkflowSection'
import StatsSection from '../components/StatsSection'
import ForecastHeroChart from '../components/ForecastHeroChart'
import { features } from '../data/landingData'

export default function Landing() {
  return (
    <div id="top" className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-2 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              LSTM &middot; Prophet &middot; SARIMA, compared automatically
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Predict Sales.{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Optimize Inventory.
              </span>{' '}
              Grow Your Business.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
              SalesSense runs your historical sales through three forecasting models at once, picks
              the strongest fit for every product, and turns the result into reorder quantities your
              team can trust.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="\register"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="\dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
              >
                <PlayCircle className="h-4 w-4" />
                View Dashboard
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <ForecastHeroChart />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Everything included</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Built for retail forecasting, end to end
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </section>

      <WorkflowSection />
      <StatsSection />
      <Footer />
    </div>
  )
}
