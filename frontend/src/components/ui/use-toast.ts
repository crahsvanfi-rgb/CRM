import { useCallback } from "react"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = useCallback(({ title, description, variant = "default" }: ToastProps) => {
    if (typeof window !== "undefined") {
      if (variant === "destructive") {
        console.error(`[Toast Error] ${title ? title + ": " : ""}${description || ""}`);
      } else {
        console.log(`[Toast] ${title ? title + ": " : ""}${description || ""}`);
      }
    }
  }, []);

  return { toast };
}
