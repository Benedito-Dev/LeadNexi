import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type DeleteDialogProps = {
  open: boolean
  onOpenChange: (aberto: boolean) => void
  onDelete: () => void
  headerText: string
  bodyText: string
  loading?: boolean
}

/** Confirmação de exclusão do Rizar: "Tem certeza que deseja apagar ...". */
export function DeleteDialog({ open, onOpenChange, onDelete, headerText, bodyText, loading = false }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Tem certeza que deseja apagar {headerText}
          </DialogTitle>
          <DialogDescription>
            Você tem certeza que deseja apagar {bodyText}? <strong>Esta ação é irreversível.</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={loading}>
            {loading ? 'Apagando...' : 'Apagar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
