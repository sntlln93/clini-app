import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { useClinicalRecordExport } from '@/hooks/use-clinical-record-export';
import { DownloadIcon } from 'lucide-react';

type ExportClinicalRecordMenuProps = {
    patientId: number;
};

/** Only rendered for a professional who can read the patient's notes, the same relationship the API checks (#326). */
export function ExportClinicalRecordMenu({
    patientId,
}: ExportClinicalRecordMenuProps) {
    const { mutate, isPending } = useClinicalRecordExport();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="outline" disabled={isPending} />}
            >
                {isPending ? (
                    <Spinner data-icon="inline-start" aria-hidden />
                ) : (
                    <DownloadIcon data-icon="inline-start" aria-hidden />
                )}
                Exportar historia clínica
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        onClick={() =>
                            mutate({
                                scope: 'patient',
                                patientId,
                                format: 'pdf',
                            })
                        }
                    >
                        PDF, para leer o imprimir
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            mutate({
                                scope: 'patient',
                                patientId,
                                format: 'json',
                            })
                        }
                    >
                        JSON, con los datos estructurados
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
