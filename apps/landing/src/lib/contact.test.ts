import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendContactRequest, type ContactRequest } from './contact';

const REQUEST: ContactRequest = {
    name: ' Laura Gómez ',
    email: 'laura@centro.test ',
    phone: '',
    organizationName: 'Centro Médico Norte',
    teamSize: '12',
    plan: 'centro',
    message: ' Queremos migrar la agenda. ',
    website: '',
};

function respond(status: number, body?: unknown) {
    const fetchMock = vi.fn(() =>
        Promise.resolve(
            new Response(body === undefined ? null : JSON.stringify(body), {
                status,
            }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('sendContactRequest', () => {
    it('posts a stateless JSON request with the API names and values', async () => {
        const fetchMock = respond(204);

        await expect(sendContactRequest(REQUEST)).resolves.toEqual({
            ok: true,
        });

        const [url, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect(url).toMatch(/\/api\/v1\/contact$/);
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('omit');
        expect(JSON.parse(init.body as string)).toEqual({
            name: 'Laura Gómez',
            email: 'laura@centro.test',
            phone: null,
            organization_name: 'Centro Médico Norte',
            team_size: '12',
            plan: 'center',
            message: 'Queremos migrar la agenda.',
            website: null,
        });
    });

    it.each([
        ['consultorio', 'practice'],
        ['free', 'free'],
        [null, null],
    ] as const)('sends the plan %s as %s', async (plan, apiPlan) => {
        const fetchMock = respond(204);

        await sendContactRequest({ ...REQUEST, plan });

        const init = (
            fetchMock.mock.calls[0] as unknown as [string, RequestInit]
        )[1];
        expect(JSON.parse(init.body as string).plan).toBe(apiPlan);
    });

    it('returns the first message of each rejected field on a 422', async () => {
        respond(422, {
            message: 'x',
            errors: {
                email: ['Ingresá un correo válido.', 'otro'],
                team_size: ['Ingresá al menos 1 profesional.'],
            },
        });

        await expect(sendContactRequest(REQUEST)).resolves.toEqual({
            ok: false,
            kind: 'validation',
            fieldErrors: {
                email: 'Ingresá un correo válido.',
                team_size: 'Ingresá al menos 1 profesional.',
            },
        });
    });

    it('tells a throttled request (429) apart', async () => {
        respond(429, { message: 'Too Many Attempts.' });

        await expect(sendContactRequest(REQUEST)).resolves.toEqual({
            ok: false,
            kind: 'rate_limited',
        });
    });

    it.each([
        ['a server error', () => respond(500)],
        ['a 422 with no field errors', () => respond(422, { message: 'x' })],
        [
            'a network failure',
            () =>
                vi.stubGlobal(
                    'fetch',
                    vi.fn(() => Promise.reject(new TypeError('Failed'))),
                ),
        ],
    ])('treats %s as unexpected', async (_, setUp) => {
        setUp();

        await expect(sendContactRequest(REQUEST)).resolves.toEqual({
            ok: false,
            kind: 'unexpected',
        });
    });
});
