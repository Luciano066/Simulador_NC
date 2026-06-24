export function InfoBadge({ children, tone = "default" }) {
  return <span className={`info-badge ${tone}`}>{children}</span>;
}
