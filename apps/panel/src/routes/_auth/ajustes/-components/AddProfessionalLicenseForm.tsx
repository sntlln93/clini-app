import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { HEALTH_PROFESSIONS } from '@/lib/health-professions';
import { PROVINCES } from '@/lib/provinces';
import { useId, useState } from 'react';
import { useAddProfessionalLicense } from '../-hooks/use-professional-licenses';
import { OptionPicker } from './OptionPicker';
import { RegistryProgress } from './RegistryProgress';

type AddProfessionalLicenseFormProps = {
    /** The practice's province, offered first since it's the one that counts here. */
    defaultProvince: string | null;
};

export function AddProfessionalLicenseForm({
    defaultProvince,
}: AddProfessionalLicenseFormProps) {
    const numberId = useId();
    const [number, setNumber] = useState('');
    const [province, setProvince] = useState<string | null>(defaultProvince);
    const [profession, setProfession] = useState<string | null>(null);
    const { mutate, isPending } = useAddProfessionalLicense();

    const canAdd =
        number.trim() !== '' && province !== null && profession !== null;

    function handleAdd() {
        if (!canAdd) {
            return;
        }

        mutate(
            { number: number.trim(), province, profession },
            { onSuccess: () => setNumber('') },
        );
    }

    return (
        <div className="space-y-3 rounded-2xl border p-4">
            <h3 className="text-sm font-medium">Agregar una matrícula</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                    <Label
                        htmlFor={numberId}
                        className="text-xs text-muted-foreground"
                    >
                        Número
                    </Label>
                    <Input
                        id={numberId}
                        autoComplete="off"
                        maxLength={40}
                        placeholder="Por ejemplo, MP 1234"
                        value={number}
                        onChange={(event) => setNumber(event.target.value)}
                    />
                </div>
                <OptionPicker
                    label="Provincia"
                    placeholder="Elegí la provincia"
                    items={PROVINCES}
                    value={province}
                    onChange={setProvince}
                />
                <OptionPicker
                    label="Profesión"
                    placeholder="Elegí la profesión"
                    items={HEALTH_PROFESSIONS}
                    value={profession}
                    onChange={setProfession}
                />
            </div>
            <Button
                type="button"
                size="sm"
                disabled={isPending || !canAdd}
                onClick={handleAdd}
            >
                {isPending && <Spinner data-icon="inline-start" />}
                {isPending ? 'Agregando…' : 'Agregar matrícula'}
            </Button>
            {isPending && <RegistryProgress />}
        </div>
    );
}
