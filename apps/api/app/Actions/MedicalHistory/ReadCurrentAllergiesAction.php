<?php

declare(strict_types=1);

namespace App\Actions\MedicalHistory;

use App\Actions\ClinicalAccess\ReadPatientHistoryAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Data\MedicalHistory\CurrentAllergiesReadData;
use App\Enums\ClinicalAccessAction;
use App\Enums\MedicalHistoryCategory;
use App\Models\MedicalHistoryEntry;
use App\Support\ClinicalAccess;
use Illuminate\Database\Eloquent\Collection;

/**
 * The patient's current allergies the professional reads, shown above the form that indicates medication (#362), on
 * an appointment or outside one (#382): a read of the patient's background like the patient page's, with its row in
 * the access log, but without the antecedents the form doesn't need. Without an appointment near today it reads
 * nothing and answers null, rather than failing: the form still opens, and the history is opened from the patient
 * page.
 *
 * @implements Action<CurrentAllergiesReadData>
 */
class ReadCurrentAllergiesAction implements Action
{
    public function __construct(
        private readonly ReadPatientHistoryAction $read,
    ) {}

    /**
     * @param  CurrentAllergiesReadData  $dto
     * @return Collection<int, MedicalHistoryEntry>|null
     */
    public function handle(Data $dto): ?Collection
    {
        if (ClinicalAccess::requiresReason($dto->organizationId, $dto->membershipId, $dto->patientId)) {
            return null;
        }

        $this->read->handle(new PatientHistoryReadData(
            organizationId: $dto->organizationId,
            membershipId: $dto->membershipId,
            patientId: $dto->patientId,
            action: ClinicalAccessAction::MedicalHistoryViewed,
        ));

        return MedicalHistoryEntry::query()
            ->where('patient_id', $dto->patientId)
            ->where('category', MedicalHistoryCategory::Allergy)
            ->whereDoesntHave('withdrawal')
            ->readableBy($dto->membershipId)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();
    }
}
