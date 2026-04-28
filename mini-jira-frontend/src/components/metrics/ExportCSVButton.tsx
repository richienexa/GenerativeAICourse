import { Download } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { buildExportUrl } from '@/api/metrics'
import { useAuthStore } from '@/store/authStore'
import type { MetricsFilters } from '@/types'

interface ExportCSVButtonProps {
  filters: MetricsFilters
  disabled: boolean
}

export function ExportCSVButton({ filters, disabled }: ExportCSVButtonProps) {
  const token = useAuthStore((s) => s.accessToken)

  function handleExport() {
    if (disabled) return
    const url = buildExportUrl(filters)
    // Adjunta el token como query param para la descarga directa del navegador
    const a = document.createElement('a')
    a.href = `${url}&access_token=${token ?? ''}`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleExport}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant/20 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent>No hay datos para el rango seleccionado</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
