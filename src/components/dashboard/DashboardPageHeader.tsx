import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}

/**
 * Compact premium page header. Glass surface, breadcrumb, title + optional
 * description, and a right-aligned actions slot. Fades in on mount.
 */
export function DashboardPageHeader({
  title,
  description,
  crumbs,
  actions,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card-premium rounded-2xl px-5 sm:px-6 py-5 mb-6"
    >
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2.5">
          <ol className="flex items-center gap-1.5 text-[0.68rem] text-muted-foreground flex-wrap">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                {c.to ? (
                  <Link
                    to={c.to}
                    className="hover:text-white transition-colors"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {c.label}
                  </span>
                )}
                {i < crumbs.length - 1 && (
                  <ChevronRight
                    className="h-3 w-3 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-white tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </motion.div>
  );
}
