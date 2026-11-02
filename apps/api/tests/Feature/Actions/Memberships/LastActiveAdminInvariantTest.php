<?php

declare(strict_types=1);

use App\Actions\Memberships\DeactivateMembershipAction;
use App\Actions\Memberships\UpdateMembershipAction;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Memberships\LastActiveAdminException;
use App\Models\Membership;
use App\Support\CurrentOrganization;

// Account deletion (#384) runs these Actions with no current organization: an
// owner of another organization must never count as this one's.

test('deactivating an organization\'s only owner fails with no current organization, whatever other organizations have', function () {
    $owner = Membership::factory()->owner()->create();
    Membership::factory()->owner()->create();

    expect(app(CurrentOrganization::class)->has())->toBeFalse();

    expect(fn () => app(DeactivateMembershipAction::class)->handle(new MembershipUpdateData(
        membershipId: $owner->id,
        roles: [MembershipRole::Owner],
        status: MembershipStatus::Inactive,
    )))->toThrow(LastActiveAdminException::class);

    expect($owner->fresh()?->trashed())->toBeFalse();
});

test('demoting an organization\'s only owner fails with no current organization, whatever other organizations have', function () {
    $owner = Membership::factory()->owner()->create();
    Membership::factory()->owner()->create();

    expect(fn () => app(UpdateMembershipAction::class)->handle(new MembershipUpdateData(
        membershipId: $owner->id,
        roles: [MembershipRole::Staff],
        status: MembershipStatus::Active,
    )))->toThrow(LastActiveAdminException::class);
});

test('deactivating an owner with no current organization passes when their own organization keeps another', function () {
    $owner = Membership::factory()->owner()->create();
    Membership::factory()->admin()->create(['organization_id' => $owner->organization_id]);

    app(DeactivateMembershipAction::class)->handle(new MembershipUpdateData(
        membershipId: $owner->id,
        roles: [MembershipRole::Owner],
        status: MembershipStatus::Inactive,
    ));

    expect($owner->fresh()?->trashed())->toBeTrue();
});
