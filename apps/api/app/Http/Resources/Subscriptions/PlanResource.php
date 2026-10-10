<?php

declare(strict_types=1);

namespace App\Http\Resources\Subscriptions;

use App\Data\Subscriptions\PlanOverviewData;
use App\Enums\PlanFeature;
use App\Support\PracticePricing;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * `restricted`: more active professionals than the plan allows, which makes
 * the agenda read-only (EnsureSubscriptionActive). `practice_pricing` lets
 * the panel show what Practice costs before an owner changes plan or adds
 * a professional.
 *
 * @mixin PlanOverviewData
 */
class PlanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PlanOverviewData $overview */
        $overview = $this->resource;
        $pricing = app(PracticePricing::class);
        $limit = $overview->plan->professionalLimit();

        $features = [];
        foreach (PlanFeature::cases() as $feature) {
            $features[$feature->value] = $overview->plan->includes($feature);
        }

        return [
            'plan' => $overview->plan->value,
            'assigned_by_platform' => $overview->assignedByPlatform,
            'features' => $features,
            'professional_limit' => $limit,
            'active_professionals' => $overview->activeProfessionals,
            'restricted' => $limit !== null && $overview->activeProfessionals > $limit,
            'practice_pricing' => [
                'base_amount' => $pricing->baseAmount(),
                'included_professionals' => $pricing->includedProfessionals(),
                'extra_professional_amount' => $pricing->extraProfessionalAmount(),
                'currency' => $pricing->currency(),
            ],
        ];
    }
}
