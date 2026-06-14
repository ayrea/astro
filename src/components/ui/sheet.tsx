import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within a Sheet");
  }
  return context;
}

interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Sheet({ children, open: controlledOpen, onOpenChange }: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setInternalOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );

  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return (
    <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
  );
}

function SheetTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const { setOpen } = useSheetContext();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: React.MouseEventHandler;
    }>;

    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        setOpen(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

function SheetContent({
  side = "right",
  size = "default",
  className,
  children,
  onDismiss,
  showClose = true,
}: {
  side?: "top" | "right" | "bottom" | "left" | "center";
  size?: "default" | "large";
  className?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  showClose?: boolean;
}) {
  const { open, setOpen } = useSheetContext();

  const dismiss = React.useCallback(() => {
    if (onDismiss) {
      onDismiss();
    } else {
      setOpen(false);
    }
  }, [onDismiss, setOpen]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50",
        side === "center" &&
          size === "large" &&
          "flex items-center justify-center p-0 md:p-4",
        side === "center" &&
          size === "default" &&
          "flex items-start justify-center p-4",
      )}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={dismiss}
      />
      <div
        className={cn(
          "absolute z-50 flex flex-col bg-card shadow-lg",
          side === "right" &&
            "inset-y-0 right-0 h-full w-full max-w-sm border-l border-border",
          side === "center" &&
            size === "default" &&
            "relative max-h-[calc(100dvh-2rem)] w-full max-w-md rounded-lg border border-border",
          side === "center" &&
            size === "large" &&
            "relative h-[100dvh] w-full border border-border md:h-[90dvh] md:max-w-2xl md:rounded-lg",
          className,
        )}
      >
        {children}
        {showClose && (
          <button
            type="button"
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            onClick={dismiss}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shrink-0 space-y-2 border-b border-border/60 p-6 pb-4 pr-12 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-6", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex shrink-0 justify-end gap-2 border-t border-border/60 bg-card p-4",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
