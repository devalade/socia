import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Spinner } from "@/components/ui/spinner"

// premium: transitions limited to colour, shadow and transform (transition-all also animates layout); press
// scales to 0.97; a leading or trailing icon pulls only its own side in by 4px; a long label ends in an
// ellipsis at the button's edge instead of overflowing; xl (48px) added; `loading`.
const buttonVariants = cva(
  "relative inline-flex max-w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out outline-none [&>span:not(.sr-only)]:min-w-0 [&>span:not(.sr-only)]:overflow-x-clip [&>span:not(.sr-only)]:text-ellipsis active:scale-[0.97] aria-busy:cursor-progress aria-busy:active:scale-100 motion-reduce:active:scale-100 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.14)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg:first-child]:ps-3 has-[>svg:last-child]:pe-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg:first-child]:ps-1.5 has-[>svg:last-child]:pe-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg:first-child]:ps-2 has-[>svg:last-child]:pe-2",
        lg: "h-10 rounded-md px-6 has-[>svg:first-child]:ps-4 has-[>svg:last-child]:pe-4",
        xl: "h-12 rounded-lg px-6 text-base has-[>svg:first-child]:ps-5 has-[>svg:last-child]:pe-5",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** premium: busy without changing size. The content turns invisible and a spinner takes its
     *  place, clicks are ignored, and the button is announced as busy. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  // bare text is wrapped so it can be hidden while busy like any other child
  const content = React.Children.map(children, (c) => typeof c === "string" || typeof c === "number" ? <span>{c}</span> : c)

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      aria-disabled={loading || props["aria-disabled"]}
      onClick={loading ? (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault() : onClick}
      className={cn(buttonVariants({ variant, size, className }), loading && "[&>*:not([data-slot=spinner])]:invisible")}
      {...props}
    >
      {asChild ? children : (
        <>
          {content}
          {/* in a span, so the trailing-icon padding rule never sees an svg here and the size holds */}
          {loading && <span data-slot="spinner" className="absolute inset-0 grid place-items-center"><Spinner aria-hidden="true" role={undefined} aria-label={undefined} /></span>}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
