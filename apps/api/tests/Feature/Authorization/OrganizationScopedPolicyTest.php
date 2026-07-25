<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\Permission;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use App\Policies\OrganizationScopedPolicy;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Model;

/**
 * Minimal concrete subclass exposing the abstract, protected allows() —
 * OrganizationScopedPolicy has no real policy yet (issue #19 is
 * infrastructure only), so this is the only way to exercise it directly.
 */
final class ConcreteOrganizationScopedPolicy extends OrganizationScopedPolicy
{
    public function check(User $user, Permission $permission, ?Model $resource = null): bool
    {
        return $this->allows($user, $permission, $resource);
    }
}

beforeEach(function () {
    $this->policy = new ConcreteOrganizationScopedPolicy;
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('denies when the user has no membership in the currently active organization (CU-32)', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();

    $membership = Membership::factory()->owner()->create(['organization_id' => $organizationB->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    expect($this->policy->check($membership->user, Permission::PatientsView))->toBeFalse();
});

test('denies when the resource belongs to another organization, even with an org-wide permission', function () {
    $organizationA = Organization::factory()->create();
    $membershipA = Membership::factory()->owner()->create(['organization_id' => $organizationA->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    $organizationB = Organization::factory()->create();
    $resource = Availability::factory()->create(['organization_id' => $organizationB->id]);

    expect($this->policy->check($membershipA->user, Permission::AvailabilityManage, $resource))->toBeFalse();
});

test('allows via an org-wide permission over any resource in the own organization', function () {
    $organization = Organization::factory()->create();
    $ownerMembership = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    app(CurrentOrganization::class)->set($organization->id);

    $otherMembership = Membership::factory()->create(['organization_id' => $organization->id]);
    $resource = Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $otherMembership->id,
    ]);

    expect($this->policy->check($ownerMembership->user, Permission::AvailabilityManage, $resource))->toBeTrue();
});

test('allows a professional via the .own permission over their own resource', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    app(CurrentOrganization::class)->set($organization->id);

    $resource = Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
    ]);

    expect($this->policy->check($membership->user, Permission::AvailabilityManage, $resource))->toBeTrue();
});

test("denies a professional via the .own permission over another membership's resource", function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $otherMembership = Membership::factory()->create(['organization_id' => $organization->id]);

    app(CurrentOrganization::class)->set($organization->id);

    $resource = Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $otherMembership->id,
    ]);

    expect($this->policy->check($membership->user, Permission::AvailabilityManage, $resource))->toBeFalse();
});

test("a membership with owner and professional roles allows via the org-wide permission over another membership's resource", function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()
        ->withRoles(MembershipRole::Owner, MembershipRole::Professional)
        ->create(['organization_id' => $organization->id]);
    $otherMembership = Membership::factory()->create(['organization_id' => $organization->id]);

    app(CurrentOrganization::class)->set($organization->id);

    $resource = Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $otherMembership->id,
    ]);

    expect($this->policy->check($membership->user, Permission::AvailabilityManage, $resource))->toBeTrue();
});

test('without a resource, allows only via the org-wide permission and denies via the .own variant alone', function () {
    $organization = Organization::factory()->create();
    $ownerMembership = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professionalMembership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    app(CurrentOrganization::class)->set($organization->id);

    expect($this->policy->check($ownerMembership->user, Permission::AvailabilityManage))->toBeTrue();
    expect($this->policy->check($professionalMembership->user, Permission::AvailabilityManage))->toBeFalse();
});
