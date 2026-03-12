const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-2xl border font-semibold tracking-[0.01em] transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandStrong/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

const variantStyles = {
  primary:
    "border-brandStrong/35 bg-gradient-to-r from-brandHot via-brand to-brandStrong text-white shadow-neon hover:-translate-y-0.5 hover:brightness-110 active:translate-y-px active:brightness-95",
  secondary:
    "border-transparent bg-slate-900/78 text-slate-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.14)] hover:bg-slate-900/90",
  ghost: "border-transparent bg-transparent text-slate-200 hover:bg-white/8 hover:text-slate-50",
  danger:
    "border-negative/55 bg-negative/20 text-rose-100 hover:border-negative/75 hover:bg-negative/30"
};

const sizeStyles = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10"
};

const Button = ({
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) => (
  <button
    type={type}
    className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
