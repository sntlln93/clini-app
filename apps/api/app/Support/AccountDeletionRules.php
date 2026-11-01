<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\AppointmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Account\AccountDeletionFutureAppointmentsException;
use App\Exceptions\Account\AccountDeletionLastActiveAdminException;
use App\Jobs\Subscriptions\SyncSubscriptionAmountJob;
use App\Models\AccountDeletionRequest;
use App\Models\AccountDeletionRequestMembership;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The rules a clinic user's own account deletion shares between the request and its completion (#384, ADR 0034).
 * Every query names its organization: the account spans all of them, and none is current.
 */
final class AccountDeletionRules
{
    public const int GRACE_DAYS = 7;

    /** The name a deleted account keeps when it signed no clinical record. */
    public const string ANONYMOUS_NAME = 'Usuario eliminado';

    /** For a user with no organization left to take the zone from. */
    private const string DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

    /** An appointment still to attend: the ones `CancelAppointmentAction` can still cancel. */
    private const array OPEN_APPOINTMENT_STATUSES = [
        AppointmentStatus::Scheduled,
        AppointmentStatus::Confirmed,
        AppointmentStatus::Arrived,
    ];

    /**
     * What the user has to resolve first. Expects the user's memberships locked by the caller; this locks the other
     * owners and admins of their organizations.
     *
     * @param  Collection<int, Membership>  $memberships
     *
     * @throws AccountDeletionLastActiveAdminException
     * @throws AccountDeletionFutureAppointmentsException
     */
    public static function ensureNothingBlocks(int $userId, Collection $memberships): void
    {
        $active = $memberships->filter(fn (Membership $membership): bool => $membership->status === MembershipStatus::Active);

        $lastAdminOf = $active->filter(function (Membership $membership): bool {
            /** @var array<int, MembershipRole> $roles */
            $roles = $membership->roles;

            return OrganizationAdministrators::includesOwnerOrAdmin($roles)
                && ! OrganizationAdministrators::anotherActiveExists($membership);
        });

        if ($lastAdminOf->isNotEmpty()) {
            throw new AccountDeletionLastActiveAdminException($userId, self::organizations($lastAdminOf->pluck('organization_id')));
        }

        $withAppointments = Appointment::withoutGlobalScope('organization')
            ->whereIn('membership_id', $active->pluck('id'))
            ->whereIn('status', self::OPEN_APPOINTMENT_STATUSES)
            ->where('end_at', '>', now())
            ->distinct()
            ->pluck('organization_id');

        if ($withAppointments->isNotEmpty()) {
            throw new AccountDeletionFutureAppointmentsException($userId, self::organizations($withAppointments));
        }
    }

    /**
     * Puts back exactly the memberships the request deactivated, each in the status it had. One whose public link
     * someone else took in the meantime comes back without it.
     */
    public static function restoreMemberships(AccountDeletionRequest $request): void
    {
        $request->deactivatedMemberships()->get()->each(function (AccountDeletionRequestMembership $deactivated): void {
            $membership = Membership::withoutGlobalScope('organization')
                ->withTrashed()
                ->lockForUpdate()
                ->find($deactivated->membership_id);

            if ($membership === null || ! $membership->trashed()) {
                return;
            }

            /** @var MembershipStatus $status */
            $status = $deactivated->previous_status;

            $membership->restore();
            $membership->update([
                'status' => $status,
                'slug' => self::slugTakenByOther($membership) ? null : $membership->slug,
            ]);

            /** @var array<int, MembershipRole> $roles */
            $roles = $membership->roles;

            if ($status === MembershipStatus::Active && in_array(MembershipRole::Professional, $roles, true)) {
                SyncSubscriptionAmountJob::dispatch($membership->organization_id);
            }
        });
    }

    /**
     * Whether the user wrote any record of a clinical history, under any of their memberships, deactivated ones
     * included: the law keeps the history and the name of who signed it (Ley 26.529, art. 18).
     */
    public static function isClinicalAuthor(int $userId): bool
    {
        $membershipIds = Membership::withoutGlobalScope('organization')
            ->withTrashed()
            ->where('user_id', $userId)
            ->pluck('id');

        if ($membershipIds->isEmpty()) {
            return false;
        }

        return collect(self::CLINICAL_AUTHOR_TABLES)->contains(
            fn (string $table): bool => DB::table($table)->whereIn('membership_id', $membershipIds)->exists()
        );
    }

    /** Every clinical record table with an author: base records, amendments and annulments or withdrawals. */
    private const array CLINICAL_AUTHOR_TABLES = [
        'clinical_notes',
        'clinical_note_versions',
        'clinical_note_annulments',
        'prescriptions',
        'prescription_versions',
        'prescription_annulments',
        'vital_signs',
        'vital_sign_versions',
        'vital_sign_annulments',
        'blood_type_records',
        'medical_history_entries',
        'medical_history_entry_versions',
        'medical_history_entry_withdrawals',
    ];

    private static function slugTakenByOther(Membership $membership): bool
    {
        if ($membership->slug === null) {
            return false;
        }

        return Organization::withTrashed()->where('slug', $membership->slug)->exists()
            || Membership::withoutGlobalScope('organization')
                ->whereKeyNot($membership->id)
                ->where('slug', $membership->slug)
                ->exists();
    }

    /**
     * A deleted account's address: unique per user, and under `.invalid` (RFC 2606), a domain no mail can reach.
     */
    public static function anonymousEmail(int $userId): string
    {
        return "cuenta-eliminada-{$userId}@clini.invalid";
    }

    /**
     * A date as the user reads it, in the zone of the organization of the given membership (their newest).
     */
    public static function localDate(CarbonImmutable $instant, ?Membership $membership): string
    {
        $timezone = $membership === null
            ? null
            : Organization::query()->whereKey($membership->organization_id)->value('timezone');

        return $instant
            ->setTimezone(is_string($timezone) ? $timezone : self::DEFAULT_TIMEZONE)
            ->settings(['locale' => 'es'])
            ->translatedFormat('j \\d\\e F \\d\\e Y');
    }

    /**
     * @param  Collection<int, mixed>  $organizationIds
     * @return array<int, array{id: int, name: string}>
     */
    private static function organizations(Collection $organizationIds): array
    {
        return Organization::query()
            ->whereKey($organizationIds->unique()->values()->all())
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Organization $organization): array => ['id' => $organization->id, 'name' => (string) $organization->name])
            ->values()
            ->all();
    }
}
