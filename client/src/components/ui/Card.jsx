const Card = ({ children, className = "", padded = true }) => (
  <section className={`surface-card relative overflow-hidden ${padded ? "p-5 md:p-6" : ""} ${className}`}>
    {children}
  </section>
);

export default Card;
