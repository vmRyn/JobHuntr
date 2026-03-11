import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";

const SWIPE_THRESHOLD = 110;

const SwipeCard = ({ itemKey, onSwipe, disabled = false, children }) => {
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
      className="surface-card relative touch-pan-y overflow-hidden p-4 md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-positive/10" />
      <motion.div
        style={{ opacity: passOpacity }}
        className="pointer-events-none absolute left-4 top-4 rounded-full border border-negative/50 bg-negative/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-200"
      >
        Pass
      </motion.div>
      <motion.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute right-4 top-4 rounded-full border border-positive/50 bg-positive/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-200"
      >
        Interested
      </motion.div>

      {children}
    </motion.article>
  );
};

export default SwipeCard;
