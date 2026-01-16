interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  title,
  subtitle,
  description,
  align = "center",
}: SectionHeaderProps) {
  return (
    <div className={`mb-12 ${align === "center" ? "text-center" : "text-left"}`}>
      {subtitle && (
        <p className="text-secondary font-medium mb-2 tracking-wide uppercase text-sm">
          {subtitle}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
        {title}
      </h2>
      {description && (
        <p className={`text-muted-foreground text-lg ${align === "center" ? "max-w-2xl mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </div>
  );
}
