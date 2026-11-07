import { patientQueryOptions } from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { mapToAppError } from '@/lib/api-errors';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import { discardPageData } from '@/lib/page-data';
import { useQueryClient } from '@tanstack/react-query';

// A record written outside an appointment takes the history open (#382, ADR
// 0037): once the exceptional access ran out, the write answers 409
// `clinical_access.reason_required`. The patient goes and the page reloads,
// so it asks for the reason again instead of keeping the history on screen.
// Any other error is left to the form, and so is any with no patient.
export function useRefreshOnExpiredAccess(patientId: number | null) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return (error: unknown) => {
        const appError = mapToAppError(error);

        if (
            patientId === null ||
            appError.kind !== 'business' ||
            appError.code !== CLINICAL_ACCESS_EXPIRED
        ) {
            return;
        }

        const patientKey = patientQueryOptions(patientId).queryKey;
        discardPageData(queryClient, patientKey);

        return refreshPageData(patientKey);
    };
}
