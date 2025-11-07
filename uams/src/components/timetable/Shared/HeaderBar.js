import React from "react";

/**
 * HeaderBar
 * --------------------------------------------
 * A reusable top header with purple gradient background.
 * Props:
 *  - title: main heading
 *  - subtitle: small description line
 *  - actionSlot: JSX element (e.g., a button on the right)
 */
export default function HeaderBar({ title, subtitle, actionSlot = null }) {
  return (
    <header className="tt-header">
      <div>
        <h1 className="tt-title">{title}</h1>
        {subtitle && <p className="tt-subtitle">{subtitle}</p>}
      </div>
      <div className="tt-header-right">{actionSlot}</div>
    </header>
  );
}
