<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalHistory;

use App\Actions\ClinicalAccess\ReadPatientHistoryAction;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Enums\ClinicalAccessAction;
use App\Enums\MedicalHistoryCategory;
use App\Http\Controllers\Controller;
use App\Http\Resources\MedicalHistory\MedicalHistoryEntryResource;
use App\Models\Appointment;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\User;
use App\Support\ClinicalAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CurrentAllergyController extends Controller
{
    /**
     * The patient's current allergies the appointment's professional reads, shown above the form that indicates
     * medication (#362): a read of the patient's background like the patient page's, with its row in the access log,
     * but without the antecedents the form doesn't need. Without an appointment near today it reads nothing and says
     * so (`reason_required`), rather than failing: the form opens on any of the professional's appointments, and the
     * history is opened from the patient page.
     */
    public function index(Request $request, Appointment $appointment, ReadPatientHistoryAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewCurrentAllergies', [MedicalHistoryEntry::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        if (ClinicalAccess::requiresReason($appointment->organization_id, $membership->id, $appointment->patient_id)) {
            return MedicalHistoryEntryResource::collection([])->additional(['meta' => ['reason_required' => true]]);
        }

        $read->handle(new PatientHistoryReadData(
            organizationId: $appointment->organization_id,
            membershipId: $membership->id,
            patientId: $appointment->patient_id,
            action: ClinicalAccessAction::MedicalHistoryViewed,
        ));

        $allergies = MedicalHistoryEntry::query()
            ->where('patient_id', $appointment->patient_id)
            ->where('category', MedicalHistoryCategory::Allergy)
            ->whereDoesntHave('withdrawal')
            ->readableBy($membership->id)
            ->with(MedicalHistoryController::ENTRY_RELATIONS)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return MedicalHistoryEntryResource::collection($allergies)->additional(['meta' => ['reason_required' => false]]);
    }
}
