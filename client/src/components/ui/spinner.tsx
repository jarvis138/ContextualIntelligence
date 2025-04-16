import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "muted";
}

export function Spinner({
  size = "md",
  color = "primary",
  className,
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-3",
    xl: "h-16 w-16 border-4",
  };

  const colorClasses = {
    primary: "border-primary border-t-transparent",
    secondary: "border-secondary border-t-transparent", 
    muted: "border-muted-foreground border-t-transparent",
  };

  return (
    <div className={cn("animate-spin rounded-full", sizeClasses[size], colorClasses[color], className)} {...props} />
  );
}