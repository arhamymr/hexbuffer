import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-1 whitespace-nowrap rounded-sm h-6 px-2 has-[>svg]:px-1.5 text-xs font-medium border border-transparent transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // ponytail: Clean 3D style using vertical translation and box shadows to represent physical depth without layout shift.
        default:
          "bg-background border-primary text-primary hover:bg-primary/10 shadow-[0_2px_0_0_var(--primary)] active:translate-y-[2px] active:shadow-none active:transition-none",
        destructive:
          "bg-destructive border-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-destructive-3d active:translate-y-[2px] active:shadow-none active:transition-none",
        outline:
          "border-border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 shadow-[0_2px_0_0_rgba(0,0,0,0.15)] dark:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px] active:shadow-none active:transition-none",
        secondary:
          "bg-secondary border-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_2px_0_0_rgba(0,0,0,0.15)] dark:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px] active:shadow-none active:transition-none",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "",
        sm: "",
        xs: "",
        lg: "",
        icon: "",
        "icon-sm": "",
        "icon-lg": "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "xs",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export { Button, buttonVariants }
