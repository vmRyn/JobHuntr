const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

const variantStyles = {
  primary:
    "bg-gradient-to-r from-sky-700 to-cyan-600 text-slate-50 shadow-[0_14px_30px_-14px_rgba(8,145,178,0.9)] hover:from-sky-600 hover:to-cyan-500 active:brightness-95",
  secondary:
    "border border-white/28 bg-white/10 text-slate-50 hover:border-sky-300/60 hover:bg-white/16 active:bg-white/20",
  ghost: "text-slate-200 hover:bg-white/12 hover:text-slate-50 active:bg-white/18",
  danger:
    "border border-negative/55 bg-negative/18 text-rose-100 hover:bg-negative/28 hover:border-negative/75"
};

const sizeStyles = {
  sm: "h-9 px-3 text-sm",
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
