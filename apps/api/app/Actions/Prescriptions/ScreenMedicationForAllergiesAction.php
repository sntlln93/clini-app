<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Actions\ClinicalAccess\ReadPatientHistoryAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Data\Prescriptions\AllergyMatchData;
use App\Data\Prescriptions\MedicationAllergyScreeningData;
use App\Data\Prescriptions\PrescriptionItemData;
use App\Enums\ClinicalAccessAction;
use App\Enums\MedicalHistoryCategory;
use App\Exceptions\Prescriptions\PrescriptionAllergyWarningException;
use App\Models\MedicalHistoryEntry;
use App\Models\MedicalHistoryEntryVersion;
use App\Support\ClinicalAccess;
use App\Support\FoldedText;

/**
 * Checks the medication about to be indicated against the patient's current allergies (#362, ADR 0030): an allergy
 * matches when its substance appears in a medication or its presentation, ignoring case and accents. Every current
 * allergy counts, another author's too, since missing one could harm the patient; its detail goes to the warning only
 * when the professional reads it as they would read the patient's background (`readableBy`, without a pending
 * exceptional access), and that read is logged. Until every match is confirmed, the medication is not indicated.
 *
 * @implements Action<MedicationAllergyScreeningData>
 */
class ScreenMedicationForAllergiesAction implements Action
{
    public function __construct(
        private readonly ReadPatientHistoryAction $read,
    ) {}

    /**
     * @param  MedicationAllergyScreeningData  $dto
     * @return list<AllergyMatchData> the confirmed matches, to keep with the version they warned about
     */
    public function handle(Data $dto): array
    {
        $reasonRequired = ClinicalAccess::requiresReason($dto->organizationId, $dto->membershipId, $dto->patientId);
        $matches = $this->matches($dto, $reasonRequired);
        $unconfirmed = array_filter($matches, fn (AllergyMatchData $match): bool => ! in_array($match->entryId, $dto->confirmedAllergyIds, true));

        if ($unconfirmed === []) {
            return $matches;
        }

        $shown = array_values(array_filter($matches, fn (AllergyMatchData $match): bool => $match->detailShown));

        if ($shown !== []) {
            $this->read->handle(new PatientHistoryReadData(
                organizationId: $dto->organizationId,
                membershipId: $dto->membershipId,
                patientId: $dto->patientId,
                action: ClinicalAccessAction::MedicalHistoryViewed,
            ));
        }

        throw new PrescriptionAllergyWarningException(
            patientId: $dto->patientId,
            allergies: array_map(fn (AllergyMatchData $match): array => [
                'id' => $match->entryId,
                'description' => $match->description,
                'reaction' => $match->reaction,
                'severity' => $match->severity?->value,
            ], $shown),
            hiddenAllergyIds: array_values(array_map(
                fn (AllergyMatchData $match): int => $match->entryId,
                array_filter($matches, fn (AllergyMatchData $match): bool => ! $match->detailShown),
            )),
            reasonRequired: $reasonRequired,
        );
    }

    /**
     * @return list<AllergyMatchData>
     */
    private function matches(MedicationAllergyScreeningData $dto, bool $reasonRequired): array
    {
        $medication = array_map(
            fn (PrescriptionItemData $item): string => FoldedText::fold("{$item->medication} {$item->presentation}"),
            $dto->items,
        );

        $allergies = MedicalHistoryEntry::query()
            ->where('organization_id', $dto->organizationId)
            ->where('patient_id', $dto->patientId)
            ->where('category', MedicalHistoryCategory::Allergy)
            ->whereDoesntHave('withdrawal')
            ->with('versions')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        if ($allergies->isEmpty()) {
            return [];
        }

        $readable = $reasonRequired
            ? []
            : MedicalHistoryEntry::query()
                ->whereKey($allergies->modelKeys())
                ->readableBy($dto->membershipId)
                ->pluck('id')
                ->all();

        $matches = [];

        foreach ($allergies as $allergy) {
            /** @var MedicalHistoryEntryVersion $current */
            $current = $allergy->versions->last();
            $substance = FoldedText::fold($current->description);

            if ($substance === '' || ! $this->appearsIn($substance, $medication)) {
                continue;
            }

            $matches[] = new AllergyMatchData(
                entryId: $allergy->id,
                entryVersionId: $current->id,
                detailShown: in_array($allergy->id, $readable, true),
                description: $current->description,
                reaction: $current->reaction,
                severity: $current->severity,
            );
        }

        return $matches;
    }

    /**
     * @param  list<string>  $medication
     */
    private function appearsIn(string $substance, array $medication): bool
    {
        foreach ($medication as $text) {
            if (str_contains($text, $substance)) {
                return true;
            }
        }

        return false;
    }
}
