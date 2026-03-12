import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";

const SWIPE_THRESHOLD = 110;

const SwipeCard = ({ itemKey, onSwipe, disabled = false, className = "", children }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14]);
  const likeOpacity = useTransform(x, [24, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -24], [1, 0]);

  const handleDragEnd = async (_, info) => {
    if (disabled) return;

    if (info.offset.x > SWIPE_THRESHOLD) {
      await controls.start({
        x: 640,
        rotate: 12,
        opacity: 0,
        transition: { duration: 0.25 }
      });
      x.set(0);
      onSwipe("right");
      return;
    }

    if (info.offset.x < -SWIPE_THRESHOLD) {
      await controls.start({
        x: -640,
        rotate: -12,
        opacity: 0,
        transition: { duration: 0.25 }
      });
      x.set(0);
      onSwipe("left");
      return;
    }

    controls.start({
      x: 0,
      rotate: 0,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    });
  };

  return (
    <motion.article
      key={itemKey}
      drag="x"
      dragElastic={0.15}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ x, rotate }}
      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
      className={`surface-card relative touch-pan-y overflow-hidden border-white/14 p-5 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brandHot/16 via-transparent to-brandStrong/12" />
      <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-brandHot/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 bottom-0 h-52 w-52 rounded-full bg-brandStrong/20 blur-3xl" />
      <motion.div
        style={{ opacity: passOpacity }}
        className="pointer-events-none absolute left-4 top-4 rounded-full border border-negative/60 bg-negative/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-100"
      >
        Skip
      </motion.div>
      <motion.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute right-4 top-4 rounded-full border border-positive/50 bg-positive/26 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-100"
      >
        Match
      </motion.div>

      {children}
    </motion.article>
  );
};

export default SwipeCard;
