import { motion } from 'framer-motion'
import { stats } from '../data/landingData'

export default function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 text-center sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <p className="font-mono text-4xl font-bold text-white sm:text-5xl">{s.value}</p>
            <p className="mt-2 text-sm font-medium text-white/70">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
