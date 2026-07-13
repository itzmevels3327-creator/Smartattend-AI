import React, { forwardRef } from "react";

// ==========================
// CARD COMPONENT
// ==========================
export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md ${className}`}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

export const CardTitle = ({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props} />
);

export const CardDescription = ({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
);

export const CardContent = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

export const CardFooter = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />
);

// ==========================
// BUTTON COMPONENT
// ==========================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyle =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border border-input bg-transparent hover:bg-secondary hover:text-secondary-foreground",
      ghost: "hover:bg-secondary hover:text-secondary-foreground bg-transparent",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      glass: "glass text-foreground hover:bg-background/40 shadow-sm",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-11 px-6 py-2.5 text-base",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ==========================
// INPUT COMPONENT
// ==========================
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", type = "text", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ==========================
// BADGE COMPONENT
// ==========================
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "warning" | "danger" | "info" | "secondary";
}

export const Badge = ({ className = "", variant = "secondary", ...props }: BadgeProps) => {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors";
  const styles = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20",
    danger: "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/20",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
  };
  return <div className={`${base} ${styles[variant]} ${className}`} {...props} />;
};

// ==========================
// TABLE COMPONENT
// ==========================
export const Table = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
  </div>
);

export const TableHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`border-b border-border bg-muted/20 ${className}`} {...props} />
);

export const TableBody = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`&_tr:last-child]:border-0 ${className}`} {...props} />
);

export const TableRow = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`border-b border-border transition-colors hover:bg-muted/50 ${className}`} {...props} />
);

export const TableHead = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);

export const TableCell = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);

// ==========================
// SELECT COMPONENT
// ==========================
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

// ==========================
// DIALOG COMPONENT
// ==========================
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog = ({ isOpen, onClose, title, children }: DialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Content */}
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card text-card-foreground p-6 shadow-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md text-muted-foreground hover:text-foreground p-1 transition-colors"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
