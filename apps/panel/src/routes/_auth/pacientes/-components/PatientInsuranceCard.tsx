import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InsuranceProvider } from '@/types/patient';

type PatientInsuranceCardProps = {
    insuranceProvider: InsuranceProvider | null | undefined;
};

// Always rendered, so a private ("particular") patient reads as such rather than as missing data.
export function PatientInsuranceCard({
    insuranceProvider,
}: PatientInsuranceCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Obra social</CardTitle>
            </CardHeader>
            <CardContent>
                {insuranceProvider ? (
                    <p className="text-sm font-medium">
                        {insuranceProvider.name}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Particular (sin obra social)
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
