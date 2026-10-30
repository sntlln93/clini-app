<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalHistory;

use App\Actions\ClinicalAccess\ReadPatientHistoryAction;
use App\Actions\MedicalHistory\RecordMedicalHistoryEntryAction;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Data\MedicalHistory\MedicalHistoryEntryDraftData;
use App\Enums\ClinicalAccessAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalHistory\StoreMedicalHistoryEntryRequest;
use App\Http\Resources\MedicalHistory\BloodTypeRecordResource;
use App\Http\Resources\MedicalHistory\MedicalHistoryEntryResource;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MedicalHistoryController extends Controller
{
    /**
     * Everything MedicalHistoryEntryResource renders, so it never lazy-loads.
     */
    public const array ENTRY_RELATIONS = ['author.user', 'versions', 'withdrawal'];

    /**
     * The patient's whole background, of every author, as the medication (#359): every blood type recorded, newest
     * first, and every allergy and antecedent. One read of the history, logged once.
     */
    public function show(Request $request, Patient $patient, ReadPatientHistoryAction $read): JsonResponse
    {
        Gate::authorize('viewAnyForPatient', [MedicalHistoryEntry::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $read->handle(new PatientHistoryReadData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            action: ClinicalAccessAction::MedicalHistoryViewed,
        ));

        // Every author's the reader may read (#364): the latest of them is the blood type they see.
        $bloodTypes = BloodTypeRecord::query()
            ->where('patient_id', $patient->id)
            ->readableBy($membership->id)
            ->with('author.user')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $entries = MedicalHistoryEntry::query()
            ->where('patient_id', $patient->id)
            ->readableBy($membership->id)
            ->with(self::ENTRY_RELATIONS)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'data' => [
                'blood_types' => BloodTypeRecordResource::collection($bloodTypes)->resolve($request),
                'entries' => MedicalHistoryEntryResource::collection($entries)->resolve($request),
            ],
        ]);
    }

    public function store(
        StoreMedicalHistoryEntryRequest $request,
        Appointment $appointment,
        RecordMedicalHistoryEntryAction $action
    ): JsonResponse {
        Gate::authorize('create', [MedicalHistoryEntry::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $entry = $action->handle(new MedicalHistoryEntryDraftData(
            organizationId: $appointment->organization_id,
            appointmentId: $appointment->id,
            patientId: $appointment->patient_id,
            membershipId: $membership->id,
            category: $request->category(),
            content: $request->content(),
        ));

        return (new MedicalHistoryEntryResource($entry->load(self::ENTRY_RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
