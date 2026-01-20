import * as React from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function FileDropzone({
  value = [],
  onChange,
  accept,
  maxSizeBytes = 20 * 1024 * 1024,
  hint = "Drag & drop files here, or click to browse",
}) {
  const onDrop = React.useCallback(
    (acceptedFiles) => {
      if (!acceptedFiles?.length) return
      const merged = [...value, ...acceptedFiles]
      const deduped = Array.from(
        new Map(merged.map((f) => [`${f.name}-${f.size}-${f.lastModified}`, f])).values(),
      )
      onChange?.(deduped)
    },
    [value, onChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeBytes,
    multiple: true,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "group rounded-xl border border-dashed bg-card p-5 transition",
          "hover:border-ring hover:bg-muted/40",
          isDragActive && "border-ring bg-muted/50",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-accent p-2 text-foreground">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{isDragActive ? "Drop to add files" : hint}</div>
            <div className="text-sm text-muted-foreground">
              Multiple files supported. Max size: {Math.round(maxSizeBytes / 1024 / 1024)}MB each.
            </div>
          </div>
        </div>
      </div>

      {!!value?.length && (
        <div className="flex flex-wrap gap-2">
          {value.map((f, idx) => (
            <Badge
              key={`${f.name}-${f.size}-${f.lastModified}`}
              variant="secondary"
              className="gap-2 py-1.5 pl-2 pr-1"
            >
              <span className="max-w-[260px] truncate">{f.name}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
              >
                <X className="h-4 w-4" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
