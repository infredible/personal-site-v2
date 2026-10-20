import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Register the Uniswap showcase's custom theme scales (src/app/showcase/uniswap/theme.css)
// so tailwind-merge doesn't mistake e.g. `text-heading1` for a text color and drop it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "heading1", "heading2", "heading3", "subheading1", "subheading2",
        "body1", "body2", "body3", "body4", "body5",
        "buttonLabel1", "buttonLabel2", "buttonLabel3", "buttonLabel4", "monospace",
      ],
      radius: ["uni-4", "uni-6", "uni-8", "uni-12", "uni-16", "uni-20", "uni-24", "uni-32", "uni-full"],
      spacing: [
        "uni-1", "uni-2", "uni-4", "uni-6", "uni-8", "uni-12", "uni-16", "uni-18", "uni-20",
        "uni-24", "uni-28", "uni-32", "uni-36", "uni-40", "uni-48", "uni-60",
      ],
      shadow: ["uni-short", "uni-medium"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
