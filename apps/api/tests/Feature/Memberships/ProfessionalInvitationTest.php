<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use PragmaRX\Google2FA\Google2FA;

/**
 * Accepting a professional invitation (#417): the DNI first, looked up in the registry, which names the account; one
 * DNI, one account; three lookups per invitation.
 */
function professionalInvitation(array $attributes = []): array
{
    $rawToken = Str::random(40);
    $invitation = MembershipInvitation::factory()->create([
        'organization_id' => Organization::factory()->center(),
        'email' => 'nueva@example.com',
        'roles' => [MembershipRole::Professional],
        'token' => hash('sha256', $rawToken),
        ...$attributes,
    ]);

    return [$rawToken, $invitation];
}

function acceptInvitation(string $rawToken, array $payload): TestResponse
{
    return fromPanel()->postJson("/api/v1/invitations/{$rawToken}", $payload);
}

const NEW_ACCOUNT_PASSWORD = ['password' => 'a-strong-password', 'password_confirmation' => 'a-strong-password'];

test('a professional invitation says so, with its three lookups', function () {
    [$rawToken] = professionalInvitation();

    $this->getJson("/api/v1/invitations/{$rawToken}")
        ->assertOk()
        ->assertJsonPath('professional', true)
        ->assertJsonPath('document_lookups_left', 3);
});

test('an invitation counts as a professional one when the professional role is among others', function () {
    [$rawToken] = professionalInvitation(['roles' => [MembershipRole::Admin, MembershipRole::Professional]]);

    $this->getJson("/api/v1/invitations/{$rawToken}")->assertJsonPath('professional', true);
    lookUpInvitationDocument($rawToken)->assertOk();
});

test('a new account takes the registry\'s name and the DNI, never a typed name, and its licenses come with it', function () {
    [$rawToken, $invitation] = professionalInvitation();

    lookUpInvitationDocument($rawToken, '99.000.003')
        ->assertOk()
        ->assertExactJson(['data' => ['name' => 'Lucia De La Fuente', 'account' => null, 'document_lookups_left' => 2]]);

    acceptInvitation($rawToken, [...NEW_ACCOUNT_PASSWORD, 'name' => 'Otro Nombre'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    acceptInvitation($rawToken, NEW_ACCOUNT_PASSWORD)->assertOk();

    $user = User::query()->where('email', 'nueva@example.com')->sole();
    expect($user->name)->toBe('Lucia De La Fuente')
        ->and($user->document_number)->toBe('99000003')
        ->and(User::query()->withDocument('99000003')->sole()->id)->toBe($user->id)
        ->and(ProfessionalLicense::query()->where('user_id', $user->id)->pluck('number')->all())->toBe(['131552'])
        ->and(Membership::query()->where('user_id', $user->id)->sole()->organization_id)->toBe($invitation->organization_id);
    $this->assertAuthenticatedAs($user, 'web');
});

test('the lookup answers the name and a masked email, never the DNI', function () {
    User::factory()->create(['email' => 'maria.gomez@example.com', 'document_number' => '99000003']);
    [$rawToken] = professionalInvitation();

    $response = lookUpInvitationDocument($rawToken)->assertOk()->assertJsonPath('data.account.email', 'm•••@example.com');

    expect($response->getContent())->not->toContain('99000003')->not->toContain('maria.gomez');
});

test('a professional invitation is accepted only after its DNI is looked up', function () {
    [$rawToken] = professionalInvitation();

    acceptInvitation($rawToken, NEW_ACCOUNT_PASSWORD)
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_document_required');

    expect(User::query()->where('email', 'nueva@example.com')->exists())->toBeFalse();
});

test('a DNI the registry holds nobody under spends a lookup, and the third expires the invitation', function () {
    [$rawToken, $invitation] = professionalInvitation();

    lookUpInvitationDocument($rawToken, '30000001')
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_document_not_found')
        ->assertJsonPath('error.context.document_lookups_left', 2);
    lookUpInvitationDocument($rawToken, '30000002')->assertJsonPath('error.context.document_lookups_left', 1);
    lookUpInvitationDocument($rawToken, '30000003')
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_lookups_exhausted');

    expect($invitation->refresh()->isExpired())->toBeTrue();
    $this->getJson("/api/v1/invitations/{$rawToken}")->assertNotFound();
    lookUpInvitationDocument($rawToken)->assertNotFound();
});

test('a third lookup that serves goes on', function () {
    [$rawToken] = professionalInvitation();

    lookUpInvitationDocument($rawToken, '30000001')->assertStatus(409);
    lookUpInvitationDocument($rawToken, '30000002')->assertStatus(409);
    lookUpInvitationDocument($rawToken)->assertOk()->assertJsonPath('data.document_lookups_left', 0);

    acceptInvitation($rawToken, NEW_ACCOUNT_PASSWORD)->assertOk();
});

test('with the registry paused or failing nothing is accepted, and no lookup is spent', function (bool $paused) {
    [$rawToken, $invitation] = professionalInvitation();
    fakeNationalProfessionalSearch(fn () => Http::response('Bad Gateway', 502));

    if ($paused) {
        pauseNationalProfessionalSearch();
    }

    lookUpInvitationDocument($rawToken, '30123456', fakeRegistry: false)
        ->assertStatus(503)
        ->assertJsonPath('error.code', 'professionals.registry_unavailable');

    expect($invitation->refresh()->document_lookups)->toBe(0);
})->with(['paused' => [true], 'failing' => [false]]);

test('the real registry\'s answer names the account too', function () {
    [$rawToken] = professionalInvitation();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    lookUpInvitationDocument($rawToken, '30123456', fakeRegistry: false)->assertOk()->assertJsonPath('data.name', 'Ana Laura Prueba');
});

test('a DNI with an account links the membership to it, whatever email was invited, with its password', function () {
    $account = User::factory()->create(['name' => 'Lucía de la Fuente', 'email' => 'lucia@example.com', 'password' => 'the-account-password', 'document_number' => '99000003']);
    [$rawToken, $invitation] = professionalInvitation();

    lookUpInvitationDocument($rawToken)->assertOk()->assertJsonPath('data.account', ['email' => 'l•••@example.com', 'has_document' => true]);

    // A wrong password spends no lookup.
    acceptInvitation($rawToken, ['password' => 'not-the-password'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_credentials_invalid');
    expect($invitation->refresh()->document_lookups)->toBe(1);

    acceptInvitation($rawToken, ['password' => 'the-account-password'])->assertOk();

    expect(User::query()->where('email', 'nueva@example.com')->exists())->toBeFalse()
        ->and(Membership::query()->where('user_id', $account->id)->sole()->organization_id)->toBe($invitation->organization_id)
        // A name support already fixed stays.
        ->and($account->refresh()->name)->toBe('Lucía de la Fuente');
    $this->assertAuthenticatedAs($account, 'web');
});

test('an account with a second factor asks for its code too, and opens no session', function () {
    $secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    $account = User::factory()->withTwoFactor($secret)->create(['password' => 'the-account-password', 'document_number' => '99000003']);
    [$rawToken] = professionalInvitation();

    // Whether the account has a second factor never leaves the API: the panel offers the code to every account.
    lookUpInvitationDocument($rawToken)->assertOk()->assertJsonMissingPath('data.account.two_factor');

    acceptInvitation($rawToken, ['password' => 'the-account-password'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_credentials_invalid');

    acceptInvitation($rawToken, ['password' => 'the-account-password', 'code' => (new Google2FA)->getCurrentOtp($secret)])->assertOk();

    expect(Membership::query()->where('user_id', $account->id)->exists())->toBeTrue();
    $this->assertGuest('web');
});

test('the invited email\'s account without a DNI takes it and the registry\'s name, with its password', function () {
    $account = User::factory()->create(['name' => 'Lu', 'email' => 'nueva@example.com', 'password' => 'the-account-password']);
    [$rawToken] = professionalInvitation();

    lookUpInvitationDocument($rawToken)->assertOk()
        ->assertJsonPath('data.account', ['email' => 'n•••@example.com', 'has_document' => false]);
    acceptInvitation($rawToken, ['password' => 'the-account-password'])->assertOk();

    $account->refresh();
    expect($account->name)->toBe('Lucia De La Fuente')
        ->and($account->document_number)->toBe('99000003')
        ->and(ProfessionalLicense::query()->where('user_id', $account->id)->exists())->toBeTrue();
});

test('the invited email\'s account with another DNI is another person\'s, and the lookup counts', function () {
    User::factory()->create(['email' => 'nueva@example.com', 'document_number' => '99000001']);
    [$rawToken, $invitation] = professionalInvitation();

    lookUpInvitationDocument($rawToken)
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_account_of_another_person')
        ->assertJsonPath('error.context.document_lookups_left', 2);

    expect($invitation->refresh()->document_lookups)->toBe(1);
});

test('an account already in the organization, active or not, can\'t join it again', function (MembershipStatus $status) {
    $account = User::factory()->create(['document_number' => '99000003']);
    [$rawToken, $invitation] = professionalInvitation();
    Membership::factory()->professional()->create(['organization_id' => $invitation->organization_id, 'user_id' => $account->id, 'status' => $status]);

    lookUpInvitationDocument($rawToken)
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_already_member');
})->with([MembershipStatus::Active, MembershipStatus::Inactive]);

test('a DNI taken by another account after the lookup sends the invitee back to look it up again', function () {
    [$rawToken] = professionalInvitation();
    lookUpInvitationDocument($rawToken)->assertOk();
    User::factory()->create(['document_number' => '99000003']);

    acceptInvitation($rawToken, NEW_ACCOUNT_PASSWORD)
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_document_required');

    expect(User::query()->where('email', 'nueva@example.com')->exists())->toBeFalse();
});

test('the DNI looked up for one invitation doesn\'t accept another', function () {
    [$rawToken] = professionalInvitation();
    [$otherToken] = professionalInvitation(['email' => 'otra@example.com']);
    lookUpInvitationDocument($rawToken)->assertOk();

    acceptInvitation($otherToken, NEW_ACCOUNT_PASSWORD)
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'memberships.invitation_document_required');
});

test('a staff invitation has no DNI step', function () {
    [$rawToken] = professionalInvitation(['roles' => [MembershipRole::Staff]]);

    $this->getJson("/api/v1/invitations/{$rawToken}")->assertJsonPath('professional', false);
    lookUpInvitationDocument($rawToken)->assertNotFound();
});

test('a malformed DNI spends no lookup', function () {
    [$rawToken, $invitation] = professionalInvitation();

    lookUpInvitationDocument($rawToken, '123')->assertUnprocessable()->assertJsonValidationErrors('document_number');

    expect($invitation->refresh()->document_lookups)->toBe(0);
});

test('accepting is throttled per invitation, so an account\'s password can\'t be guessed through it', function () {
    User::factory()->create(['password' => 'the-account-password', 'document_number' => '99000003']);
    [$rawToken] = professionalInvitation();
    lookUpInvitationDocument($rawToken)->assertOk();

    foreach (range(1, 5) as $attempt) {
        acceptInvitation($rawToken, ['password' => "wrong-{$attempt}"])->assertStatus(409);
    }

    acceptInvitation($rawToken, ['password' => 'the-account-password'])->assertTooManyRequests();
});

test('the DNI looked up waits in the session, never in the invitation', function () {
    [$rawToken, $invitation] = professionalInvitation();
    lookUpInvitationDocument($rawToken)->assertOk();

    expect(json_encode(DB::table('membership_invitations')->where('id', $invitation->id)->first()))->not->toContain('99000003');
});

test('the acceptance is also throttled per account, so more invitations buy no more guesses against it', function () {
    $account = User::factory()->create(['password' => 'the-account-password', 'document_number' => '99000003']);
    $tokens = [];

    foreach (['uno', 'dos'] as $mailbox) {
        [$tokens[]] = professionalInvitation(['email' => "{$mailbox}@example.com"]);
    }

    lookUpInvitationDocument($tokens[0])->assertOk();

    foreach (range(1, 5) as $attempt) {
        acceptInvitation($tokens[0], ['password' => "wrong-{$attempt}"])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'memberships.invitation_credentials_invalid');
    }

    lookUpInvitationDocument($tokens[1])->assertOk();

    // The second invitation's own bucket is untouched, but the account's is spent.
    acceptInvitation($tokens[1], ['password' => 'the-account-password'])->assertTooManyRequests();
    expect(Membership::query()->where('user_id', $account->id)->exists())->toBeFalse();
});

test('an organization looks up at most 20 DNIs a day, however many invitations it issues', function () {
    $organization = Organization::factory()->center()->create();
    $tokens = [];

    foreach (range(1, 7) as $index) {
        [$tokens[]] = professionalInvitation(['organization_id' => $organization->id, 'email' => "p{$index}@example.com"]);
    }

    $answered = 0;

    foreach ($tokens as $token) {
        // Past the per-IP minute limit of the registry, never past the day.
        $this->travel(61)->seconds();

        foreach (range(1, 3) as $attempt) {
            $answered += lookUpInvitationDocument($token, '3000000'.$attempt)->status() === 429 ? 0 : 1;
        }
    }

    expect($answered)->toBe(20);
});

test('the DNI that served is found again without spending a lookup, even with none left', function () {
    [$rawToken, $invitation] = professionalInvitation();

    lookUpInvitationDocument($rawToken, '30000001')->assertStatus(409);
    lookUpInvitationDocument($rawToken, '30000002')->assertStatus(409);
    lookUpInvitationDocument($rawToken)->assertOk()->assertJsonPath('data.document_lookups_left', 0);

    // The session is lost (another browser, a timeout): the same DNI finds it again; another is refused.
    session()->flush();
    lookUpInvitationDocument($rawToken, '99000001')->assertNotFound();
    lookUpInvitationDocument($rawToken, '99.000.003')->assertOk()->assertJsonPath('data.name', 'Lucia De La Fuente');

    acceptInvitation($rawToken, NEW_ACCOUNT_PASSWORD)->assertOk();
    expect($invitation->refresh()->document_lookups)->toBe(3);
});
