"use client";

import { toast } from "sonner";

/** Show a dismissable error toast with a "Copy ID" action button. */
export function toastError(message: string, errorId?: string) {
  toast.error(message, {
    description: errorId ? `Error ID: ${errorId}` : undefined,
    action: errorId
      ? {
          label: "Copy ID",
          onClick: () => {
            navigator.clipboard
              .writeText(errorId)
              .catch(() => {
                const el = document.createElement("textarea");
                el.value = errorId;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
              });
          },
        }
      : undefined,
  });
}
