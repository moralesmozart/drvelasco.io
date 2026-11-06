import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

/**
 * Animated serif wordmark: a short kicker between two lines, a heart, the name,
 * and a stethoscope tube that draws itself into place.
 */
export function BrandMark({ kicker, name }: { kicker?: string; name: string }) {
  const lines = name.includes('\n') ? name.split('\n') : name.trim().split(/\s+/).length <= 3 ? name.trim().split(/\s+/) : [name]
  const ink = '#1f3f44'

  return (
    <div className="relative mx-auto w-fit select-none text-center font-serif" style={{ color: ink }} aria-label={[kicker, name].filter(Boolean).join(' ')} role="img">
      {kicker && (
        <div className="relative flex items-center justify-center gap-2">
          <motion.span className="h-[1.5px] w-10 origin-right rounded" style={{ background: ink }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
          <motion.span className="relative text-[34px] font-semibold leading-none" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {kicker}
            <motion.span
              className="absolute -right-3 -top-5 text-care-500"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.25, 1], rotate: 0 }}
              transition={{ delay: 0.75, duration: 0.6 }}
            >
              <motion.span className="block" animate={{ scale: [1, 1.12, 1] }} transition={{ delay: 1.6, duration: 1.2, repeat: Infinity, repeatDelay: 1.4 }}>
                <Heart className="h-6 w-6 fill-current" strokeWidth={1.5} />
              </motion.span>
            </motion.span>
          </motion.span>
          <motion.span className="h-[1.5px] w-10 origin-left rounded" style={{ background: ink }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
        </div>
      )}
      <div className="mt-1">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            className="text-[46px] font-medium leading-[0.95] tracking-tight"
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
          >
            {l}
          </motion.div>
        ))}
      </div>
      {/* stethoscope tube + chest piece */}
      <svg className="mx-auto -mt-1 block" width="90" height="44" viewBox="0 0 90 44" fill="none" aria-hidden>
        <motion.path
          d="M50 0 C50 18 44 26 34 30"
          stroke={ink}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.9, duration: 0.6, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="28" cy="34" r="7"
          fill="#fff" stroke={ink} strokeWidth="2.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.4, type: 'spring', stiffness: 300, damping: 14 }}
          style={{ transformOrigin: '28px 34px' }}
        />
      </svg>
    </div>
  )
}
