import {
    bookAppointmentWithNewPatient,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #343: "Ver en agenda" on the patient page opens the appointment's day, and
// the day grid runs from 08:00 at 144px an hour, so an evening appointment sits
// far below the fold unless the link scrolls to it.
//
// Books the appointment through `bookAppointmentWithNewPatient`.
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test("the patient page's agenda link scrolls the day to the appointment", async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '343',
        evening: true,
    });
    const agendaUrl = page.url();

    await card.click();
    await page
        .getByRole('menuitem', { name: 'Ver ficha del paciente' })
        .click();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Ver en agenda' }).click();

    await expect(page).toHaveURL(
        new RegExp(`${new URL(agendaUrl).searchParams.get('date')}`),
    );
    await expect(card).toBeInViewport();
});
