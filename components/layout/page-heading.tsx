export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-9 flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title break-words">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
