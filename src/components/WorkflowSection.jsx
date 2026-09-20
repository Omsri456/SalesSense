import { motion } from 'framer-motion'
import { workflowSteps } from '../data/landingData'

export default function WorkflowSection() {
  return (
    <section id="workflow" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-secondary">The pipeline</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          From raw sales data to a shelf-ready plan
        </h2>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          Five stages carry your dataset from upload to a forecast your inventory team can act on.
        </p>
      </div>

      <div className="relative mt-16">
        <div
          className="absolute left-[27px] top-0 hidden h-full w-px bg-gradient-to-b from-primary via-secondary to-accent md:block"
          aria-hidden="true"
        />
        <ol className="space-y-8 md:space-y-10">
          {workflowSteps.map((step, i) => (
            <motion.li
              key={step.label}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="relative flex items-start gap-5 md:gap-6"
            >
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white font-mono text-sm font-semibold text-primary shadow-sm dark:border-white/10 dark:bg-slate-800">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="pt-2.5">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{step.label}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{step.detail}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
