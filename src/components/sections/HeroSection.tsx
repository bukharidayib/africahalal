import { ReactNode } from "react";

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  children?: ReactNode;
  variant?: "default" | "centered" | "split";
  size?: "sm" | "md" | "lg";
}

export function HeroSection({
  title,
  subtitle,
  description,
  children,
  variant = "default",
  size = "md",
}: HeroSectionProps) {
  const sizeClasses = {
    sm: "py-12 md:py-16",
    md: "py-16 md:py-24",
    lg: "py-24 md:py-32",
  };

  const variantClasses = {
    default: "text-left",
    centered: "text-center max-w-3xl mx-auto",
    split: "text-left",
  };

  return (
    <section className={`bg-primary text-primary-foreground ${sizeClasses[size]}`}>
      <div className={`container ${variantClasses[variant]}`}>
        {subtitle && (
          <p className="text-secondary font-medium mb-2 tracking-wide uppercase text-sm">
            {subtitle}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mb-6">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
