<?php

declare(strict_types=1);

use App\Enums\AccountDeletionStatus;
use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Mail\Account\AccountDeletedMail;
use App\Mail\Account\AccountDeletionRequestedMail;
use App\Mail\Account\AccountDeletionVoidedMail;
use App\Models\AccountDeletion;
use App\Models\AccountDeletionRequest;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\ProfessionalLicense;
use App\Models\User;
use App\Models\UserSpecialty;
use App\Support\AccountDeletionRules;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use PragmaRX\Google2FA\Google2FA;

const LIFECYCLE_TWO_FACTOR_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

beforeEach(function () {
    Mail::fake();
    Date::setTestNow('2026-11-02 15:00:00');
});

afterEach(function () {
    Date::setTestNow();
    freshRequestState();
});

/** Requests the deletion through the API, the way the panel does, and leaves the test with no session. */
function pendingAccountDeletion(User $user): AccountDeletionRequest
{
    test()->actingAs($user, 'web');
    fromPanel()->postJson('/api/v1/me/account-deletion', ['password' => 'password'])->assertStatus(202);
    freshRequestState();

    return AccountDeletionRequest::query()->where('user_id', $user->id)->latest('id')->firstOrFail();
}

function professionalWithAnotherOwner(): Membership
{
    $membership = Membership::factory()->professional()->create();
    Membership::factory()->owner()->create(['organization_id' => $membership->organization_id]);

    return $membership;
}

function trashedMembership(int $id): ?Membership
{
    return Membership::withoutGlobalScope('organization')->withTrashed()->find($id);
}

// Cancelling by logging in.

test('logging in within the grace period cancels it and puts back exactly what it deactivated', function () {
    $membership = professionalWithAnotherOwner();
    $user = $membership->user;
    $suspended = Membership::factory()->staff()->create(['user_id' => $user->id, 'status' => MembershipStatus::Suspended]);
    $earlier = Membership::factory()->admin()->create(['user_id' => $user->id]);
    Membership::factory()->owner()->create(['organization_id' => $earlier->organization_id]);
    $earlier->update(['status' => MembershipStatus::Inactive]);
    $earlier->delete();
    $request = pendingAccountDeletion($user);

    $this->travel(6)->days();

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('account_deletion_cancelled', true)
        ->assertJsonPath('roles', [MembershipRole::Professional->value]);

    expect($request->fresh()?->status)->toBe(AccountDeletionStatus::Cancelled)
        ->and(trashedMembership($membership->id))->trashed()->toBeFalse()->status->toBe(MembershipStatus::Active)
        ->and(trashedMembership($suspended->id))->trashed()->toBeFalse()->status->toBe(MembershipStatus::Suspended)
        ->and(trashedMembership($earlier->id))->trashed()->toBeTrue()->status->toBe(MembershipStatus::Inactive);
});

test('a login with nothing to cancel doesn\'t mention it', function () {
    $user = professionalWithAnotherOwner()->user;

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonMissingPath('account_deletion_cancelled');
});

test('with the second factor on, only the completed login cancels it', function () {
    $membership = professionalWithAnotherOwner();
    $user = User::query()->findOrFail($membership->user_id);
    $user->forceFill([
        'two_factor_secret' => LIFECYCLE_TWO_FACTOR_SECRET,
        'two_factor_recovery_codes' => ['abcde-fghjk'],
        'two_factor_confirmed_at' => now(),
    ])->save();
    // A recovery code here, so the app's current code is still unused for the login.
    $this->actingAs($user, 'web');
    fromPanel()->postJson('/api/v1/me/account-deletion', ['password' => 'password', 'recovery_code' => 'abcde-fghjk'])
        ->assertStatus(202);
    freshRequestState();

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()
        ->assertExactJson(['two_factor' => true]);
    expect(AccountDeletionRequest::query()->sole()->status)->toBe(AccountDeletionStatus::Pending);

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => (new Google2FA)->getCurrentOtp(LIFECYCLE_TWO_FACTOR_SECRET)])
        ->assertOk()
        ->assertJsonPath('account_deletion_cancelled', true);
    expect(AccountDeletionRequest::query()->sole()->status)->toBe(AccountDeletionStatus::Cancelled)
        ->and($membership->fresh()?->trashed())->toBeFalse();
});

test('a membership whose public link someone else took meanwhile comes back without it', function () {
    $membership = professionalWithAnotherOwner();
    $membership->update(['slug' => 'dra-gomez']);
    $user = $membership->user;
    pendingAccountDeletion($user);
    Membership::factory()->professional()->create(['slug' => 'dra-gomez']);

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

    expect($membership->fresh())->trashed()->toBeFalse()->slug->toBeNull();
});

test('a membership whose public link is still free comes back with it', function () {
    $membership = professionalWithAnotherOwner();
    $membership->update(['slug' => 'dra-gomez']);
    pendingAccountDeletion($membership->user);

    fromPanel()->postJson('/api/v1/login', ['email' => $membership->user->email, 'password' => 'password'])->assertOk();

    expect($membership->fresh())->trashed()->toBeFalse()->slug->toBe('dra-gomez');
});

// Completing it once the grace period is over.

test('the deletion waits for its date', function () {
    $user = professionalWithAnotherOwner()->user;
    pendingAccountDeletion($user);

    $this->travelTo(now()->addDays(7)->subMinute());
    $this->artisan('accounts:complete-deletions')->assertSuccessful();

    expect(AccountDeletionRequest::query()->sole()->status)->toBe(AccountDeletionStatus::Pending)
        ->and($user->fresh()?->email)->toBe($user->email);
});

test('at its date the account loses its personal data and leaves a trace without any', function () {
    $membership = professionalWithAnotherOwner();
    $membership->update(['slug' => 'dr-perez']);
    $user = User::query()->findOrFail($membership->user_id);
    $email = $user->email;
    $user->forceFill([
        'document_number' => '30123456',
        'two_factor_secret' => LIFECYCLE_TWO_FACTOR_SECRET,
        'two_factor_recovery_codes' => ['abcde-fghjk'],
        'two_factor_confirmed_at' => null,
    ])->save();
    ProfessionalLicense::factory()->create(['user_id' => $user->id]);
    UserSpecialty::factory()->create(['user_id' => $user->id]);
    $pending = MembershipInvitation::factory()->create(['email' => $email]);
    $accepted = MembershipInvitation::factory()->create(['email' => $email, 'accepted_at' => now()]);
    pendingAccountDeletion($user);

    $this->travel(7)->days();
    $this->artisan('accounts:complete-deletions')->assertSuccessful();

    $user->refresh();
    expect($user->name)->toBe(AccountDeletionRules::ANONYMOUS_NAME)
        ->and($user->email)->toBe("cuenta-eliminada-{$user->id}@clini.invalid")
        ->and($user->email_verified_at)->toBeNull()
        ->and($user->document_number)->toBeNull()
        ->and($user->two_factor_secret)->toBeNull()
        ->and($user->two_factor_recovery_codes)->toBeNull()
        ->and($user->remember_token)->toBeNull()
        ->and(ProfessionalLicense::query()->where('user_id', $user->id)->exists())->toBeFalse()
        ->and(UserSpecialty::query()->where('user_id', $user->id)->exists())->toBeFalse()
        ->and(trashedMembership($membership->id))->trashed()->toBeTrue()->slug->toBeNull()
        ->and(MembershipInvitation::withoutGlobalScope('organization')->find($pending->id))->toBeNull()
        ->and(MembershipInvitation::withoutGlobalScope('organization')->find($accepted->id)?->email)->toBe($user->email)
        ->and(AccountDeletionRequest::query()->sole()->status)->toBe(AccountDeletionStatus::Completed);

    expect(AccountDeletion::query()->sole())
        ->user_id->toBe($user->id)
        ->created_at->toEqual(now()->toImmutable());
    expect(Schema::getColumnListing('account_deletions'))->toEqualCanonicalizing(['id', 'user_id', 'created_at']);

    Mail::assertQueued(AccountDeletedMail::class, fn (AccountDeletedMail $mail): bool => $mail->hasTo($email));
});

test('after the deletion the account can\'t log in, and its address is free to register again', function () {
    $user = professionalWithAnotherOwner()->user;
    $email = $user->email;
    pendingAccountDeletion($user);
    $this->travel(7)->days();
    $this->artisan('accounts:complete-deletions')->assertSuccessful();

    fromPanel()->postJson('/api/v1/login', ['email' => $email, 'password' => 'password'])->assertStatus(422);
    fromPanel()->postJson('/api/v1/login', ['email' => $user->fresh()?->email, 'password' => 'password'])->assertStatus(422);
    $this->assertGuest('web');

    fromPanel()->postJson('/api/v1/register', [
        'name' => 'Nueva Cuenta',
        'email' => $email,
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Nueva',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ])->assertCreated();
});

test('an author of a clinical history keeps their name, which the history shows', function () {
    $membership = professionalWithAnotherOwner();
    $user = $membership->user;
    $name = $user->name;
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Completed,
        'start_at' => now()->subDays(3),
        'end_at' => now()->subDays(3)->addMinutes(30),
    ]);
    $note = ClinicalNote::factory()->create(['appointment_id' => $appointment->id]);
    pendingAccountDeletion($user);

    $this->travel(7)->days();
    $this->artisan('accounts:complete-deletions')->assertSuccessful();

    expect($user->fresh()?->name)->toBe($name)
        ->and($note->fresh()?->author?->user?->name)->toBe($name);
});

test('a membership back to life at the date is deactivated again when nothing blocks it', function () {
    $user = professionalWithAnotherOwner()->user;
    pendingAccountDeletion($user);
    $later = Membership::factory()->staff()->create(['user_id' => $user->id]);

    $this->travel(7)->days();
    $this->artisan('accounts:complete-deletions')->assertSuccessful();

    expect(trashedMembership($later->id)?->trashed())->toBeTrue()
        ->and(AccountDeletionRequest::query()->sole()->status)->toBe(AccountDeletionStatus::Completed);
});

test('when something blocks it at the date, nothing is deleted: the request is voided and the user told', function () {
    $membership = professionalWithAnotherOwner();
    $user = $membership->user;
    $email = $user->email;
    pendingAccountDeletion($user);
    $later = Membership::factory()->professional()->create(['user_id' => $user->id]);
    $later->organization->update(['name' => 'Consultorio Oeste']);
    Appointment::factory()->create([
        'organization_id' => $later->organization_id,
        'membership_id' => $later->id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => now()->addDays(10),
        'end_at' => now()->addDays(10)->addMinutes(30),
    ]);

    $this->travel(7)->days();
    $this->artisan('accounts:complete-deletions')->assertSuccessful();

    expect(AccountDeletionRequest::query()->sole()->status)->toBe(AccountDeletionStatus::Voided)
        ->and($user->fresh()?->email)->toBe($email)
        ->and(AccountDeletion::query()->exists())->toBeFalse()
        ->and(trashedMembership($membership->id))->trashed()->toBeFalse()->status->toBe(MembershipStatus::Active)
        ->and($later->fresh()?->trashed())->toBeFalse();

    Mail::assertQueued(AccountDeletionVoidedMail::class, fn (AccountDeletionVoidedMail $mail): bool => $mail->hasTo($email)
        && $mail->organizationNames === ['Consultorio Oeste']);
    Mail::assertNotQueued(AccountDeletedMail::class);
});

test('a cancelled request is never completed', function () {
    $user = professionalWithAnotherOwner()->user;
    pendingAccountDeletion($user);
    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
    freshRequestState();

    $this->travel(8)->days();
    $this->artisan('accounts:complete-deletions')->assertSuccessful();

    expect($user->fresh()?->email)->toBe($user->email)
        ->and(AccountDeletion::query()->exists())->toBeFalse();
});

test('the deletions run every hour', function () {
    $event = collect(app(Schedule::class)->events())
        ->first(fn ($event): bool => str_contains((string) $event->command, 'accounts:complete-deletions'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('0 * * * *');
});

test('the mails say when, how to cancel, and what blocked it', function () {
    (new AccountDeletionRequestedMail('Ana', '9 de noviembre de 2026'))
        ->assertSeeInHtml('9 de noviembre de 2026')
        ->assertSeeInHtml('/login')
        ->assertSeeInHtml('ingresá a Clini antes de esa fecha');

    (new AccountDeletionVoidedMail('Ana', ErrorCode::AccountDeletionLastActiveAdmin, ['Consultorio Norte', 'Consultorio Sur']))
        ->assertSeeInHtml('sos la única persona que administra')
        ->assertSeeInHtml('Consultorio Norte, Consultorio Sur');

    (new AccountDeletionVoidedMail('Ana', ErrorCode::AccountDeletionFutureAppointments, ['Consultorio Oeste']))
        ->assertSeeInHtml('tenés turnos por atender en')
        ->assertSeeInHtml('reasigná o cancelá esos turnos');
});
