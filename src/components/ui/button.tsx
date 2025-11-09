import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-transparent",
  {
    variants: {
      variant: {
        default: "text-white shadow-md hover:shadow-lg active:shadow-sm",
        destructive:
          "bg-gradient-to-b from-[#F88060] to-[#D84A2E] text-white shadow-md hover:shadow-lg active:shadow-sm",
        outline:
          "border-[#5B9DD6] bg-gradient-to-b from-white to-[#ECF4FB] text-[#1E5DC8] hover:from-[#F0F8FF] hover:to-[#D8EBFA] shadow-sm",
        secondary:
          "bg-gradient-to-b from-[#F0F0F0] to-[#D8D8D8] text-[#333] border-[#ACA899] shadow-sm hover:from-[#F8F8F8] hover:to-[#E0E0E0]",
        ghost: "hover:bg-[#E8F3FD] text-[#1E5DC8]",
        link: "text-[#0066CC] underline-offset-4 hover:underline",
        translucent: "bg-white/90 backdrop-blur-sm text-[#1E5DC8] border-[#5B9DD6] shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded",
        lg: "h-11 px-8 rounded-lg",
        xl: "h-14 px-10 text-base rounded-lg",
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
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Apply XP-style gradient for default variant
    const defaultStyle = variant === "default" || !variant ? {
      background: 'linear-gradient(180deg, #5FA3E8 0%, #2F7ED6 50%, #1E5DC8 100%)',
      ...style
    } : style;
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={defaultStyle}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
