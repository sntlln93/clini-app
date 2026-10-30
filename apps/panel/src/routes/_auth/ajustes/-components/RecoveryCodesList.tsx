import { CopyIcon, DownloadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { saveFile } from '@/lib/download';
import { notifyError, notifySuccess } from '@/lib/toast';

type RecoveryCodesListProps = {
    codes: string[];
};

/** The recovery codes right after they are generated: the only time the panel can show them (#357). */
export function RecoveryCodesList({ codes }: RecoveryCodesListProps) {
    const text = codes.join('\n');

    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            notifySuccess('Códigos copiados');
        } catch (error) {
            notifyError(error, 'No se pudieron copiar los códigos');
        }
    }

    function download() {
        saveFile(
            new Blob([`${text}\n`], { type: 'text/plain;charset=utf-8' }),
            'codigos-de-recuperacion.txt',
        );
    }

    return (
        <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
                Guardalos en un lugar seguro, fuera de este dispositivo. Si
                perdés el acceso a tu app de autenticación, cada código te deja
                ingresar una vez. No se van a volver a mostrar.
            </p>
            <ol
                aria-label="Códigos de recuperación"
                className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 font-mono text-sm"
            >
                {codes.map((code) => (
                    <li key={code}>{code}</li>
                ))}
            </ol>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={copy}>
                    <CopyIcon data-icon="inline-start" />
                    Copiar
                </Button>
                <Button type="button" variant="outline" onClick={download}>
                    <DownloadIcon data-icon="inline-start" />
                    Descargar
                </Button>
            </div>
        </div>
    );
}
