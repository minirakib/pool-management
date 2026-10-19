import Icon from "@/components/Icon.jsx";

/** Placeholder for an empty list or search; children are optional actions. */
export function EmptyState({ title, description, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name="search" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {children}
    </div>
  );
}
