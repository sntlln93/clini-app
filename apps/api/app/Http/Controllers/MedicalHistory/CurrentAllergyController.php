<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalHistory;

use App\Actions\MedicalHistory\ReadCurrentAllergiesAction;
use App\Data\MedicalHistory\CurrentAllergiesReadData;
use App\Http\Controllers\Controller;
use App\Http\Resources\MedicalHistory\MedicalHistoryEntryResource;
use App\Models\Appointment;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * The patient's current allergies above the form that indicates medication (#362): on one of the professional's
 * appointments, or outside one (#382). Without an appointment near today they read nothing and say so
 * (`reason_required`) rather than failing.
 */
class CurrentAllergyController extends Controller
{
    public function index(Request $request, Appointment $appointment, ReadCurrentAllergiesAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewCurrentAllergies', [MedicalHistoryEntry::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $allergies = $read->handle(new CurrentAllergiesReadData(
            organizationId: $appointment->organization_id,
            membershipId: $membership->id,
            patientId: $appointment->patient_id,
        ));

        return MedicalHistoryEntryResource::collection($allergies?->load(MedicalHistoryController::ENTRY_RELATIONS) ?? [])
            ->additional(['meta' => ['reason_required' => $allergies === null]]);
    }

    public function indexForPatient(Request $request, Patient $patient, ReadCurrentAllergiesAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewCurrentAllergiesForPatient', [MedicalHistoryEntry::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $allergies = $read->handle(new CurrentAllergiesReadData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
        ));

        return MedicalHistoryEntryResource::collection($allergies?->load(MedicalHistoryController::ENTRY_RELATIONS) ?? [])
            ->additional(['meta' => ['reason_required' => $allergies === null]]);
    }
}
