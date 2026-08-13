import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InsuranceProvider } from '@/types/patient';

type PatientInsuranceCardProps = {
    insuranceProvider: InsuranceProvider;
};

// Only rendered by the page when the patient has a linked provider — see
// `pacientes/$id.tsx`.
export function PatientInsuranceCard({
    insuranceProvider,
}: PatientInsuranceCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Obra social</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm font-medium">{insuranceProvider.name}</p>
            </CardContent>
        </Card>
    );
}
