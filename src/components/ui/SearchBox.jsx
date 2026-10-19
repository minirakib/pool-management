import Icon from "@/components/Icon.jsx";

/** className "page-search" marks a box that duplicates the topbar search: it only shows on phones, where the topbar search is hidden. */
export function SearchBox({ value, onChange, placeholder, className = "", ...props }) {
  return (
    <div className={`search-box${className ? ` ${className}` : ""}`}>
      <span className="search-icon"><Icon name="search" /></span>
      <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}
