import type { LucideIcon } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`} aria-label="ÀCoursSûr">
      <span>À COURS</span>
      {!compact && <strong>SÛR</strong>}
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description?: string; icon?: LucideIcon }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {Icon && <div className="heading-sticker" aria-hidden="true"><Icon size={25} strokeWidth={2.2} /></div>}
    </div>
  );
}

export function SectionTitle({ label, detail }: { label: string; detail?: string }) {
  return <div className="section-title"><h2>{label}</h2>{detail && <span>{detail}</span>}</div>;
}
