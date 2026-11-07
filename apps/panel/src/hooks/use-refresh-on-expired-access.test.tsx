import type { PatientDetail } from '@/types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patientQueryOptions } from './use-patient';
import { useRefreshOnExpiredAccess } from './use-refresh-on-expired-access';

const refresh = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

// Only its presence in the cache matters here.
const PATIENT = { id: 10 } as PatientDetail;

function businessError(code: string) {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: { error: { code, message: 'x', context: {} } },
        },
    };
}

function setup(patientId: number | null) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(patientQueryOptions(10).queryKey, PATIENT);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
    const { result } = renderHook(() => useRefreshOnExpiredAccess(patientId), {
        wrapper,
    });

    return { queryClient, onError: result.current };
}

// #382: a write outside an appointment after the exceptional access ran out.
describe('useRefreshOnExpiredAccess', () => {
    beforeEach(() => refresh.mockClear());

    it('drops the patient and reloads the page, so it asks for the reason again', async () => {
        const { queryClient, onError } = setup(10);

        await onError(businessError('clinical_access.reason_required'));

        expect(
            queryClient.getQueryData(patientQueryOptions(10).queryKey),
        ).toBeUndefined();
        expect(refresh).toHaveBeenCalledWith(patientQueryOptions(10).queryKey);
    });

    it('leaves any other error, or one with no patient, to the form', async () => {
        const { queryClient, onError } = setup(10);
        await onError(businessError('prescriptions.allergy_warning'));
        const withoutPatient = setup(null);
        await withoutPatient.onError(
            businessError('clinical_access.reason_required'),
        );

        expect(refresh).not.toHaveBeenCalled();
        expect(queryClient.getQueryData(patientQueryOptions(10).queryKey)).toBe(
            PATIENT,
        );
    });
});
