import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function PageHeader({
  eyebrow = "BMW PERSONAL CRM",
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.25em] text-blue-700">
          {eyebrow}
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex shrink-0 items-center">
          {action}
        </div>
      )}
    </header>
  );
}