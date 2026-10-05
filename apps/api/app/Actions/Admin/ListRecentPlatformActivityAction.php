<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\ActivityFeedQueryData;
use App\Data\Admin\PlatformActivityData;
use App\Models\Organization;
use App\Models\SubscriptionEvent;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * The overview's recent-activity feed: the latest `limit` of organizations
 * created, users registered and provider subscription events, merged and
 * sorted newest first. Events whose subscription is gone or belongs to a
 * soft-deleted organization are skipped.
 *
 * @implements Action<ActivityFeedQueryData>
 */
class ListRecentPlatformActivityAction implements Action
{
    /**
     * @param  ActivityFeedQueryData  $dto
     * @return array<int, PlatformActivityData>
     */
    public function handle(Data $dto): array
    {
        /** @var array<int, array{at: CarbonImmutable, id: int, item: PlatformActivityData}> $entries */
        $entries = [];

        $organizations = Organization::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($dto->limit)
            ->get();

        foreach ($organizations as $organization) {
            $at = CarbonImmutable::parse($organization->created_at);
            $entries[] = ['at' => $at, 'id' => $organization->id, 'item' => new PlatformActivityData(
                kind: 'organization_created',
                occurredAt: $at,
                subjectType: 'organization',
                subjectId: $organization->id,
                subjectLabel: $organization->name,
                detail: null,
            )];
        }

        $users = User::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($dto->limit)
            ->get();

        foreach ($users as $user) {
            $at = CarbonImmutable::parse($user->created_at);
            $entries[] = ['at' => $at, 'id' => $user->id, 'item' => new PlatformActivityData(
                kind: 'user_registered',
                occurredAt: $at,
                subjectType: 'user',
                subjectId: $user->id,
                subjectLabel: $user->email,
                detail: null,
            )];
        }

        $events = SubscriptionEvent::query()
            ->whereHas('subscription', fn (Builder $query) => $query->withoutGlobalScope('organization')->whereHas('organization'))
            ->with(['subscription' => fn ($query) => $query->withoutGlobalScope('organization')->with('organization')])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($dto->limit)
            ->get();

        foreach ($events as $event) {
            $subscription = $event->subscription;
            $organization = $subscription?->organization;

            if ($subscription === null || $organization === null) {
                continue;
            }

            $at = CarbonImmutable::parse($event->created_at);
            $entries[] = ['at' => $at, 'id' => $event->id, 'item' => new PlatformActivityData(
                kind: 'subscription_event',
                occurredAt: $at,
                subjectType: 'subscription',
                subjectId: $subscription->id,
                subjectLabel: $organization->name,
                detail: $event->type,
            )];
        }

        usort($entries, fn (array $a, array $b): int => [$b['at']->getTimestamp(), $b['id']] <=> [$a['at']->getTimestamp(), $a['id']]);

        return array_map(
            fn (array $entry): PlatformActivityData => $entry['item'],
            array_slice($entries, 0, $dto->limit),
        );
    }
}
