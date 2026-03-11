const Card = ({ children, className = "", padded = true }) => (
  <section className={`surface-card ${padded ? "p-4 md:p-5" : ""} ${className}`}>{children}</section>
);

export default Card;
