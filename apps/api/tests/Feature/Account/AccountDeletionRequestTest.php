<?php

declare(strict_types=1);

use App\Enums\AccountDeletionStatus;
use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Jobs\Subscriptions\SyncSubscriptionAmountJob;
use App\Mail\Account\AccountDeletionRequestedMail;
use App\Models\AccountDeletionRequest;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use PragmaRX\Google2FA\Google2FA;

const ACCOUNT_DELETION_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

beforeEach(function () {
    Mail::fake();
    Date::setTestNow('2026-11-02 15:00:00');
});

afterEach(function () {
    Date::setTestNow();
    freshRequestState();
});

/**
 * @param  array<string, mixed>  $payload
 */
function requestAccountDeletion(User $user, array $payload = ['password' => 'password']): TestResponse
{
    test()->actingAs($user, 'web');

    return fromPanel()->postJson('/api/v1/me/account-deletion', $payload);
}

/** A professional who shares their organization with another owner, so nothing blocks the deletion. */
function deletableProfessional(): Membership
{
    $membership = Membership::factory()->professional()->create();
    Membership::factory()->owner()->create(['organization_id' => $membership->organization_id]);

    return $membership;
}

test('the request deactivates every membership, keeps their status and mails the date', function () {
    $membership = deletableProfessional();
    $user = $membership->user;
    $staff = Membership::factory()->staff()->create(['user_id' => $user->id, 'status' => MembershipStatus::Suspended]);

    requestAccountDeletion($user)
        ->assertStatus(202)
        ->assertExactJson(['data' => ['deletes_at' => '2026-11-09T15:00:00+00:00']]);

    expect(Membership::withoutGlobalScope('organization')->withTrashed()->find($membership->id))
        ->trashed()->toBeTrue()
        ->status->toBe(MembershipStatus::Inactive)
        ->roles->toBe([MembershipRole::Professional]);
    expect(Membership::withoutGlobalScope('organization')->withTrashed()->find($staff->id)?->trashed())->toBeTrue();

    $request = AccountDeletionRequest::query()->sole();
    expect($request->status)->toBe(AccountDeletionStatus::Pending)
        ->and($request->deactivatedMemberships()->pluck('previous_status', 'membership_id')->all())
        ->toEqual([$membership->id => MembershipStatus::Active, $staff->id => MembershipStatus::Suspended]);

    Mail::assertQueued(AccountDeletionRequestedMail::class, fn (AccountDeletionRequestedMail $mail): bool => $mail->hasTo($user->email)
        && $mail->name === $user->name
        && $mail->deletesOn === '9 de noviembre de 2026');
});

test('the request leaves memberships deactivated before it out of what a login puts back', function () {
    $membership = deletableProfessional();
    $earlier = Membership::factory()->staff()->create(['user_id' => $membership->user_id]);
    $earlier->update(['status' => MembershipStatus::Inactive]);
    $earlier->delete();

    requestAccountDeletion($membership->user)->assertStatus(202);

    expect(AccountDeletionRequest::query()->sole()->deactivatedMemberships()->pluck('membership_id')->all())
        ->toBe([$membership->id]);
});

test('the request syncs the subscription of every organization where the user attended', function () {
    Queue::fake([SyncSubscriptionAmountJob::class]);
    $membership = deletableProfessional();

    requestAccountDeletion($membership->user)->assertStatus(202);

    Queue::assertPushed(SyncSubscriptionAmountJob::class, fn (SyncSubscriptionAmountJob $job): bool => $job->organizationId === $membership->organization_id);
});

test('the request ends the session it came from and every other one', function () {
    $user = deletableProfessional()->user;
    $previousHash = $user->password;

    requestAccountDeletion($user)->assertStatus(202);

    $this->assertGuest('web');
    expect($user->fresh()?->password)->not->toBe($previousHash)
        ->and(Hash::check('password', (string) $user->fresh()?->password))->toBeTrue();
});

test('a wrong password is a 422 and changes nothing', function () {
    $membership = deletableProfessional();

    requestAccountDeletion($membership->user, ['password' => 'wrong-password'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['password' => 'La contraseña no es correcta.']);

    expect(AccountDeletionRequest::query()->exists())->toBeFalse()
        ->and($membership->fresh()?->trashed())->toBeFalse();
    Mail::assertNothingQueued();
});

test('with the second factor on, the request asks for a code', function () {
    $membership = deletableProfessional();
    $membership->user->forceFill(['two_factor_secret' => ACCOUNT_DELETION_SECRET, 'two_factor_confirmed_at' => now()])->save();

    requestAccountDeletion($membership->user)->assertStatus(422)->assertJsonValidationErrors('code');

    requestAccountDeletion($membership->user, ['password' => 'password', 'code' => '000000'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AuthTwoFactorCodeInvalid->value);

    expect(AccountDeletionRequest::query()->exists())->toBeFalse();
});

test('with the second factor on, a current code or a recovery code goes through', function (string $kind) {
    $membership = deletableProfessional();
    $user = User::query()->findOrFail($membership->user_id);
    $user->forceFill([
        'two_factor_secret' => ACCOUNT_DELETION_SECRET,
        'two_factor_recovery_codes' => ['abcde-fghjk'],
        'two_factor_confirmed_at' => now(),
    ])->save();

    $payload = $kind === 'code'
        ? ['password' => 'password', 'code' => (new Google2FA)->getCurrentOtp(ACCOUNT_DELETION_SECRET)]
        : ['password' => 'password', 'recovery_code' => 'abcde-fghjk'];

    requestAccountDeletion($user, $payload)->assertStatus(202);
})->with(['code', 'recovery code']);

test('the last active owner or admin of an organization can\'t request it, and is told which one', function (string $role) {
    $membership = Membership::factory()->{$role}()->create();
    $membership->organization->update(['name' => 'Consultorio Norte']);
    // An owner of another organization doesn't count.
    Membership::factory()->owner()->create();

    requestAccountDeletion($membership->user)
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AccountDeletionLastActiveAdmin->value)
        ->assertJsonPath('error.context.organizations', [['id' => $membership->organization_id, 'name' => 'Consultorio Norte']]);

    expect($membership->fresh()?->trashed())->toBeFalse()
        ->and(AccountDeletionRequest::query()->exists())->toBeFalse();
    Mail::assertNothingQueued();
})->with(['owner', 'admin']);

test('a refusal gives back the recovery code it was sent with', function () {
    $membership = Membership::factory()->owner()->create();
    $user = User::query()->findOrFail($membership->user_id);
    $user->forceFill([
        'two_factor_secret' => ACCOUNT_DELETION_SECRET,
        'two_factor_recovery_codes' => ['abcde-fghjk'],
        'two_factor_confirmed_at' => now(),
    ])->save();

    requestAccountDeletion($user, ['password' => 'password', 'recovery_code' => 'abcde-fghjk'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AccountDeletionLastActiveAdmin->value);

    expect($user->fresh()?->two_factor_recovery_codes)->toBe(['abcde-fghjk']);
});

test('appointments still to attend as a professional block it, in any organization', function (AppointmentStatus $status, string $endsAt) {
    $membership = deletableProfessional();
    $membership->organization->update(['name' => 'Consultorio Sur']);
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => $status,
        'start_at' => Date::parse($endsAt)->subMinutes(30),
        'end_at' => $endsAt,
    ]);

    requestAccountDeletion($membership->user)
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AccountDeletionFutureAppointments->value)
        ->assertJsonPath('error.context.organizations.0.name', 'Consultorio Sur');

    expect($membership->fresh()?->trashed())->toBeFalse();
})->with([
    'scheduled tomorrow' => [AppointmentStatus::Scheduled, '2026-11-03 10:00:00'],
    'confirmed next month' => [AppointmentStatus::Confirmed, '2026-12-01 10:00:00'],
    'arrived, still in progress' => [AppointmentStatus::Arrived, '2026-11-02 15:10:00'],
]);

test('past, cancelled or rescheduled appointments don\'t block it', function (AppointmentStatus $status, string $endsAt) {
    $membership = deletableProfessional();
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => $status,
        'start_at' => Date::parse($endsAt)->subMinutes(30),
        'end_at' => $endsAt,
    ]);

    requestAccountDeletion($membership->user)->assertStatus(202);
})->with([
    'completed yesterday' => [AppointmentStatus::Completed, '2026-11-01 10:00:00'],
    'scheduled but already over' => [AppointmentStatus::Scheduled, '2026-11-02 14:00:00'],
    'cancelled tomorrow' => [AppointmentStatus::Cancelled, '2026-11-03 10:00:00'],
    'rescheduled tomorrow' => [AppointmentStatus::Rescheduled, '2026-11-03 10:00:00'],
]);

test('a guest can\'t request it, nor a script on the dashboard origin', function () {
    fromPanel()->postJson('/api/v1/me/account-deletion', ['password' => 'password'])->assertUnauthorized();

    $this->actingAs(deletableProfessional()->user, 'web');
    fromDashboard()->postJson('/api/v1/me/account-deletion', ['password' => 'password'])->assertForbidden();

    expect(AccountDeletionRequest::query()->exists())->toBeFalse();
});

test('a session opened elsewhere is ended by the request on its next call', function () {
    $user = deletableProfessional()->user;
    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
    fromPanel()->getJson('/api/v1/me')->assertOk();
    $openSession = app('session.store')->all();
    freshRequestState();

    // Another device asks for the deletion.
    requestAccountDeletion(User::query()->findOrFail($user->id))->assertStatus(202);
    freshRequestState();

    // The first device comes back with its own session.
    $this->withSession($openSession);
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();
});

test('asking again from another session answers the same request', function () {
    $user = deletableProfessional()->user;
    requestAccountDeletion($user)->assertStatus(202);
    freshRequestState();
    $this->travel(1)->hours();

    requestAccountDeletion(User::query()->findOrFail($user->id))
        ->assertStatus(202)
        ->assertExactJson(['data' => ['deletes_at' => '2026-11-09T15:00:00+00:00']]);

    expect(AccountDeletionRequest::query()->count())->toBe(1);
});
