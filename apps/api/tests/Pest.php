<?php

declare(strict_types=1);

use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\ContactRequest;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\PatientAccessCode;
use App\Models\PlatformAdmin;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature');

/**
 * Mercado Pago test config (tests/Feature/Subscriptions): sandbox-like
 * values only, never real credentials.
 */
function configureMercadoPago(): void
{
    config([
        'services.mercadopago.access_token' => 'TEST-access-token',
        'services.mercadopago.public_key' => 'TEST-public-key',
        'services.mercadopago.webhook_secret' => 'test-webhook-secret',
        'services.mercadopago.back_url' => 'https://api.example.com/api/v1/subscription/return',
        'plans.practice.base_amount' => 15000,
        'plans.practice.included_professionals' => 5,
        'plans.practice.extra_professional_amount' => 5000,
        'plans.practice.annual_discount_percent' => 40,
        'plans.practice.currency' => 'ARS',
    ]);
}

/**
 * Free's appointment limit as #238 shipped it; the config default is no
 * limit (#300), so tests about the limit set it explicitly.
 */
function limitFreePlan(int $limit = 40, int $warningThreshold = 35): void
{
    config([
        'plans.free.monthly_appointment_limit' => $limit,
        'plans.free.appointment_warning_threshold' => $warningThreshold,
    ]);
}

/**
 * Builds an `x-signature` header the way Mercado Pago documents it.
 */
function mercadoPagoSignature(string $dataId, string $requestId, string $ts, string $secret = 'test-webhook-secret'): string
{
    $manifest = 'id:'.strtolower($dataId).';request-id:'.$requestId.';ts:'.$ts.';';

    return 'ts='.$ts.',v1='.hash_hmac('sha256', $manifest, $secret);
}

/**
 * Every platform-operator request must look like it comes from the
 * dashboard: the Referer makes it Sanctum-stateful (session) *and* passes
 * the `admin.origin` pin. Not named `fromSpa` — SanctumSpaAuthTest declares
 * that one globally.
 */
function fromDashboard(): TestCase
{
    /** @var TestCase $test */
    $test = test();

    return $test->withHeader('Referer', 'http://localhost:5175');
}

/**
 * Points the test's default Referer back at the panel, for a clinic request
 * that follows an operator one in the same test: the clinic routes reject
 * the dashboard origin (`clinic.origin`, ADR 0010).
 */
function fromPanel(): TestCase
{
    /** @var TestCase $test */
    $test = test();

    return $test->withHeader('Referer', 'http://localhost:5174');
}

/**
 * `actingAs($admin, 'admin')` also switches the default guard to `admin`.
 */
function actingAsAdmin(?PlatformAdmin $admin = null): TestCase
{
    return fromDashboard()->actingAs($admin ?? PlatformAdmin::factory()->create(), 'admin');
}

/**
 * What a fresh production request starts from, between chained requests of
 * one test: no cached guard users, `web` as the default guard (an earlier
 * `auth:admin` or `actingAs(..., 'admin')` switched it), and no tenant left
 * in the CurrentOrganization singleton by an earlier clinic request. The
 * session store itself is kept, like a browser cookie would keep it.
 */
function freshRequestState(): void
{
    app('auth')->shouldUse('web');
    app('auth')->forgetGuards();
    app(CurrentOrganization::class)->set(null);
}

/**
 * Fills the `{organization}`, `{user}`, `{subscription}` and `{contactRequest}` placeholders of
 * an admin route template (tests/Datasets/AdminRoutes.php) with real ids.
 */
function adminRouteUri(string $template): string
{
    $organization = Organization::factory()->create();
    $subscription = Subscription::factory()->create(['organization_id' => $organization->id]);
    $user = User::factory()->create();
    $contactRequest = ContactRequest::factory()->create();

    return str_replace(
        ['{organization}', '{user}', '{subscription}', '{contactRequest}'],
        [(string) $organization->id, (string) $user->id, (string) $subscription->id, (string) $contactRequest->id],
        $template,
    );
}

/**
 * Public booking slot fixture, shared by the slot and holiday tests. UTC
 * keeps their clock times and plain date/time strings unambiguous —
 * timezone conversion itself is exercised elsewhere
 * (ListAvailableSlotsAction/ComputePublishedScheduleAction).
 *
 * @return array{0: Organization, 1: Membership, 2: Service}
 */
function createSlotsFixture(int $durationMinutes = 30): array
{
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->create(['organization_id' => $organization->id]);
    $service = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'duration_minutes' => $durationMinutes,
        'active' => true,
    ]);

    return [$organization, $membership, $service];
}

function slotsUrl(Organization $organization, Membership $membership, Service $service, string $from, ?string $to = null): string
{
    return '/api/v1/booking/'.$organization->slug.'/slots?'.http_build_query([
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'from' => $from,
        'to' => $to ?? $from,
    ]);
}

/**
 * @param  array<int, array{start_at: string, end_at: string}>  $slots
 * @return array<int, string>
 */
function slotStartTimes(array $slots): array
{
    return collect($slots)
        ->map(fn (array $slot): string => CarbonImmutable::parse($slot['start_at'])->format('H:i'))
        ->all();
}

/**
 * Opens a patient's clinical history to a membership the way an exceptional access does (#325, ADR 0022), so a test
 * about what the history holds doesn't depend on the appointment factory's random date landing near today.
 */
function openClinicalHistory(Membership $membership, int $patientId): void
{
    ClinicalAccessLog::query()->withoutGlobalScope('organization')->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patientId,
        'action' => ClinicalAccessAction::ExceptionalAccess,
        'reason' => ClinicalAccessReason::PreparingConsultation,
    ]);
}

/**
 * Gives a membership what the patient's code opens (#364, ADR 0029), as if the patient shared it and the membership
 * redeemed it: the code of an appointment of theirs with the patient (one today, unless given), redeemed and valid for
 * a week whatever the appointment's date.
 */
function shareAccessCode(Membership $membership, int $patientId, ?Appointment $appointment = null): PatientAccessCode
{
    $appointment ??= Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patientId,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
    ]);

    return PatientAccessCode::query()->withoutGlobalScope('organization')->create([
        'organization_id' => $membership->organization_id,
        'appointment_id' => $appointment->id,
        'patient_id' => $patientId,
        'membership_id' => $membership->id,
        'code' => 'ABCD2345',
        'expires_at' => now()->addDays(7),
        'redeemed_at' => now(),
    ]);
}
