import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold ring-offset-background transition-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 active:border-[2px]",
  {
    variants: {
      variant: {
        default: "bg-[#C0C0C0] text-black border-t-white border-l-white border-r-[#000000] border-b-[#000000] shadow-[inset_1px_1px_0_#DFDFDF,inset_-1px_-1px_0_#808080] active:border-t-[#000000] active:border-l-[#000000] active:border-r-white active:border-b-white active:shadow-[inset_-1px_-1px_0_#DFDFDF,inset_1px_1px_0_#808080]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] bg-[#C0C0C0] text-black active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white",
        secondary:
          "bg-[#C0C0C0] text-black border-t-white border-l-white border-r-[#000000] border-b-[#000000]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        translucent: "bg-[#C0C0C0] text-black border-t-white border-l-white border-r-[#000000] border-b-[#000000]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8",
        xl: "h-14 px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
