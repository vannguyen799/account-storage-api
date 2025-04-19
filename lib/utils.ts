import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Deep merge function to merge objects
export function deepMerge(target: any, source: any) {
  const output = { ...target }

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] })
        } else {
          output[key] = deepMerge(target[key], source[key])
        }
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }

  return output
}

export function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
