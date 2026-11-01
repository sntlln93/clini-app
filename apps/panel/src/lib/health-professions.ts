/**
 * The professions a license is declared for (#380), mirroring
 * `App\Enums\HealthProfession`: each label is the one the Buscador Nacional
 * de Profesionales writes. `province-parity.test.ts` keeps them in sync.
 */
export const HEALTH_PROFESSIONS = [
    { value: 'medico', label: 'Médico' },
    { value: 'odontologo', label: 'Odontólogo' },
    { value: 'psicologo', label: 'Psicólogo' },
    { value: 'kinesiologo', label: 'Kinesiólogo' },
    { value: 'nutricionista', label: 'Nutricionista' },
    { value: 'fonoaudiologo', label: 'Fonoaudiólogo' },
    { value: 'obstetricia', label: 'Lic. Obstetricia' },
    { value: 'terapista-ocupacional', label: 'Terapista ocupacional' },
    { value: 'psicopedagogo', label: 'Psicopedagogo' },
    { value: 'psicomotricista', label: 'Psicomotricista' },
    { value: 'podologo', label: 'Podólogo' },
    { value: 'bioquimico', label: 'Bioquímico' },
    { value: 'farmaceutico', label: 'Farmacéutico' },
    { value: 'licenciado-en-enfermeria', label: 'Licenciado en enfermería' },
    { value: 'enfermero', label: 'Enfermero' },
    { value: 'trabajador-social', label: 'Trabajador social' },
    { value: 'acompanante-terapeutico', label: 'Acompañante terapéutico' },
] as const;

export type HealthProfession = (typeof HEALTH_PROFESSIONS)[number]['value'];

export function healthProfessionLabel(profession: string): string {
    return (
        HEALTH_PROFESSIONS.find((option) => option.value === profession)
            ?.label ?? profession
    );
}
