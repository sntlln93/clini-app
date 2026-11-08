<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Admin\SpecialtyCatalogUsageData;
use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Models\Membership;
use App\Models\ProfessionalLicense;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * How the specialties catalog is used across the platform, for the operators' dashboard (#418). Only counts, never who:
 * no user, membership, DNI or license number leaves this class (ADR 0032, ADR 0038).
 *
 * - Backed professionals: distinct users whose verified license in Clini backs the specialty (`Specialty::backedFor()`).
 * - Offers: a practice's specialty for one of its professionals (`professional_specialties`) that a patient can book
 *   right now: an active professional membership of a live, unsuspended practice. A deactivated membership or a
 *   suspended practice keeps its rows but offers nothing.
 * - Unbacked offers: those no verified license of the professional backs anymore (the panel's «sin respaldo de
 *   matrícula», `Specialty::withBacking()`).
 * - Licenses: only the ones professionals added to Clini; the rest are just what the registry holds for a DNI.
 */
class SpecialtyCatalogUsage
{
    public function summarize(): SpecialtyCatalogUsageData
    {
        $specialties = Specialty::query()->orderBy('folded_name')->orderBy('id')->get(['id', 'profession', 'name']);
        $backed = $this->countsBySpecialty(
            ProfessionalLicense::query()->backing()->whereNotNull('specialty_id'),
            'count(distinct user_id)',
        );
        $offers = $this->offers()
            ->toBase()
            ->selectRaw('specialty_id, count(distinct user_id) as professionals, count(distinct organization_id) as organizations')
            ->groupBy('specialty_id')
            ->get()
            ->keyBy('specialty_id');
        $unbacked = $this->countsBySpecialty(
            $this->offers()->whereNotExists(ProfessionalLicense::query()
                ->backing()
                ->whereColumn('professional_licenses.user_id', 'professional_specialties.user_id')
                ->whereColumn('professional_licenses.specialty_id', 'professional_specialties.specialty_id')
                ->toBase()),
            'count(*)',
        );
        $licenses = $this->licensesByProfession();

        $professions = [];
        foreach (HealthProfession::cases() as $profession) {
            $rows = $specialties->filter(fn (Specialty $specialty): bool => $specialty->profession === $profession);
            if ($rows->isEmpty() && ! isset($licenses[$profession->value])) {
                continue;
            }

            $professions[] = [
                'profession' => $profession->value,
                'licenses' => $licenses[$profession->value] ?? $this->emptyLicenseCounts(),
                'specialties' => $rows
                    // The profession's own row, the one the registry answers without a specialty, goes first.
                    ->sortBy(fn (Specialty $specialty): int => $this->isProfessionRow($specialty) ? 0 : 1)
                    ->map(function (Specialty $specialty) use ($backed, $offers, $unbacked): array {
                        $offer = $offers->get($specialty->id);

                        return [
                            'id' => $specialty->id,
                            'name' => $specialty->name,
                            'without_specialty' => $this->isProfessionRow($specialty),
                            'backed_professionals' => $backed[$specialty->id] ?? 0,
                            'offering_professionals' => $this->toInt($offer->professionals ?? 0),
                            'offering_organizations' => $this->toInt($offer->organizations ?? 0),
                            'unbacked_offers' => $unbacked[$specialty->id] ?? 0,
                        ];
                    })
                    ->values()
                    ->all(),
            ];
        }

        return new SpecialtyCatalogUsageData(professions: $professions);
    }

    /**
     * @return Builder<ProfessionalSpecialty>
     */
    private function offers(): Builder
    {
        return ProfessionalSpecialty::withoutGlobalScope('organization')
            ->whereHas('membership', $this->activeProfessional(...))
            ->whereHas('organization', fn (Builder $organization) => $organization->whereNull('suspended_at'));
    }

    /**
     * @param  Builder<Membership>  $membership
     * @return Builder<Membership>
     */
    private function activeProfessional(Builder $membership): Builder
    {
        return $membership->withoutGlobalScope('organization')->activeProfessional();
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  literal-string  $aggregate
     * @return array<int, int>
     */
    private function countsBySpecialty(Builder $query, string $aggregate): array
    {
        return $query->toBase()
            ->selectRaw("specialty_id, {$aggregate} as aggregate")
            ->groupBy('specialty_id')
            ->pluck('aggregate', 'specialty_id')
            ->map(fn (mixed $count): int => $this->toInt($count))
            ->all();
    }

    /**
     * @return array<string, array<string, int|array<string, int>>>
     */
    private function licensesByProfession(): array
    {
        /** @var Collection<int, object{profession: string, status: string, mismatch_reason: ?string, aggregate: mixed}> $rows */
        $rows = ProfessionalLicense::query()
            ->added()
            ->toBase()
            ->selectRaw('profession, status, mismatch_reason, count(*) as aggregate')
            ->groupBy('profession', 'status', 'mismatch_reason')
            ->get();

        $counts = [];
        foreach ($rows as $row) {
            $counts[$row->profession] ??= $this->emptyLicenseCounts();
            $count = $this->toInt($row->aggregate);
            $counts[$row->profession][$row->status] += $count;
            if ($row->status === ProfessionalLicenseStatus::Mismatch->value && $row->mismatch_reason !== null) {
                $counts[$row->profession]['mismatch_reasons'][$row->mismatch_reason] += $count;
            }
        }

        return $counts;
    }

    /**
     * @return array{verified: int, unverified: int, mismatch: int, mismatch_reasons: array<string, int>}
     */
    private function emptyLicenseCounts(): array
    {
        $counts = ['verified' => 0, 'unverified' => 0, 'mismatch' => 0, 'mismatch_reasons' => []];
        foreach (ProfessionalLicenseMismatch::cases() as $reason) {
            $counts['mismatch_reasons'][$reason->value] = 0;
        }

        return $counts;
    }

    /**
     * The registry's answer without a specialty is kept under the profession's own label (`RegistrySpecialtyCatalog`).
     */
    private function isProfessionRow(Specialty $specialty): bool
    {
        return FoldedText::fold($specialty->name) === FoldedText::fold($specialty->profession->label());
    }

    /** Aggregates come back from PDO as int or numeric string. */
    private function toInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
