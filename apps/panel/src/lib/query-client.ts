import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                if (
                    axios.isAxiosError(error) &&
                    error.response &&
                    error.response.status >= 400 &&
                    error.response.status < 500
                ) {
                    return false;
                }

                return failureCount < 2;
            },
        },
    },
});
