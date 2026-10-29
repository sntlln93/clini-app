import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useClinicalRecordExport } from '@/hooks/use-clinical-record-export';
import { DownloadIcon } from 'lucide-react';

/**
 * Every patient the professional attended in this practice, in one JSON
 * file (#326). An export of the whole practice by its owner waits on the
 * legal answer of #315: the owner doesn't read clinical notes today.
 */
export function ClinicalRecordExportSection() {
    const { mutate, isPending } = useClinicalRecordExport();

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Historia clínica</h2>
                <p className="text-sm text-muted-foreground">
                    Descargá la historia clínica de todos los pacientes que
                    atendiste en este consultorio, en un archivo JSON: los
                    turnos, las notas clínicas y la medicación indicada, con
                    cada versión y su autor. Cada exportación queda registrada.
                    La de un solo paciente, también en PDF, está en su ficha.
                </p>
            </div>
            <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => mutate({ scope: 'attended_patients' })}
            >
                {isPending ? (
                    <Spinner data-icon="inline-start" aria-hidden />
                ) : (
                    <DownloadIcon data-icon="inline-start" aria-hidden />
                )}
                Exportar mis pacientes
            </Button>
        </section>
    );
}
