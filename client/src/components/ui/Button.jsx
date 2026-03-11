const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

const variantStyles = {
  primary:
    "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 text-white shadow-glow hover:brightness-110 active:brightness-95",
  secondary:
    "border border-white/18 bg-white/8 text-slate-100 hover:border-brand/55 hover:bg-white/12 active:bg-white/16",
  ghost: "text-slate-200 hover:bg-white/10 hover:text-slate-50 active:bg-white/15",
  danger:
    "border border-negative/55 bg-negative/20 text-rose-100 hover:bg-negative/30 hover:border-negative/75"
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
