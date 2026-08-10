<?php

declare(strict_types=1);

use App\Actions\Memberships\FindValidInvitationAction;
use App\Data\Memberships\InvitationTokenData;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Models\MembershipInvitation;
use Illuminate\Support\Str;

test('returns the pending invitation whose token matches the sha256 of the DTO token', function () {
    $rawToken = Str::random(40);
    $invitation = MembershipInvitation::factory()->create([
        'token' => hash('sha256', $rawToken),
    ]);

    $found = app(FindValidInvitationAction::class)->handle(new InvitationTokenData(token: $rawToken));

    expect($found->id)->toBe($invitation->id);
});

test('throws when no invitation matches', function () {
    app(FindValidInvitationAction::class)->handle(new InvitationTokenData(token: Str::random(40)));
})->throws(InvitationInvalidOrExpiredException::class);

test('throws when the matching invitation is already accepted', function () {
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->accepted()->create([
        'token' => hash('sha256', $rawToken),
    ]);

    app(FindValidInvitationAction::class)->handle(new InvitationTokenData(token: $rawToken));
})->throws(InvitationInvalidOrExpiredException::class);

test('throws when the matching invitation is expired', function () {
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->expired()->create([
        'token' => hash('sha256', $rawToken),
    ]);

    app(FindValidInvitationAction::class)->handle(new InvitationTokenData(token: $rawToken));
})->throws(InvitationInvalidOrExpiredException::class);
