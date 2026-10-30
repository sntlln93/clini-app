<?php

declare(strict_types=1);

namespace App\Http\Controllers\Patients;

use App\Actions\Patients\LookUpPatientAction;
use App\Actions\Patients\RegisterPatientAction;
use App\Actions\Patients\UpdatePatientAction;
use App\Data\ClinicalAccess\ClinicalAccessStateData;
use App\Data\Patients\PatientLookupData;
use App\Data\Patients\PatientRegistrationData;
use App\Data\Patients\PatientUpdateData;
use App\Enums\DocumentType;
use App\Enums\Sex;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patients\IndexPatientRequest;
use App\Http\Requests\Patients\LookupPatientRequest;
use App\Http\Requests\Patients\StorePatientRequest;
use App\Http\Requests\Patients\UpdatePatientRequest;
use App\Http\Resources\Patients\PatientAppointmentResource;
use App\Http\Resources\Patients\PatientResource;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use App\Support\ClinicalAccess;
use App\Support\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class PatientController extends Controller
{
    public function index(IndexPatientRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Patient::class);

        $organizationId = app(CurrentOrganization::class)->getOrFail();
        $perPage = $request->integer('per_page') ?: 15;

        $patients = Patient::query()
            ->whereHas('organizations', fn ($query) => $query->whereKey($organizationId))
            ->search($request->string('q')->toString() ?: null)
            ->with(['insuranceProvider', 'contacts'])
            ->orderBy('name')
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        return PatientResource::collection($patients);
    }

    public function store(StorePatientRequest $request, RegisterPatientAction $action): JsonResponse
    {
        Gate::authorize('create', Patient::class);

        $organizationId = app(CurrentOrganization::class)->getOrFail();

        $dto = new PatientRegistrationData(
            organizationId: $organizationId,
            createdBy: $request->user()?->id,
            name: $request->string('name')->toString(),
            documentType: DocumentType::from($request->string('document_type')->toString()),
            documentNumber: $request->string('document_number')->toString(),
            contacts: $request->contacts(),
            sex: $request->filled('sex') ? Sex::from($request->string('sex')->toString()) : null,
            birthDate: $request->string('birth_date')->toString() ?: null,
            insuranceProviderId: $request->integer('insurance_provider_id') ?: null,
            insuranceMemberNumber: $request->string('insurance_member_number')->toString() ?: null,
        );

        $patient = $action->handle($dto);

        return (new PatientResource($patient->load('contacts')))->response()->setStatusCode(201);
    }

    public function show(Request $request, Patient $patient): PatientResource
    {
        Gate::authorize('view', $patient);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $canView = Gate::allows('viewAnyForPatient', [ClinicalNote::class, $patient]);

        return (new PatientResource($patient->load(['insuranceProvider', 'contacts'])))->withClinicalAccess(new ClinicalAccessStateData(
            canView: $canView,
            reasonRequired: $canView
                && ClinicalAccess::requiresReason($membership->organization_id, $membership->id, $patient->id),
        ));
    }

    public function appointmentHistory(Patient $patient): AnonymousResourceCollection
    {
        Gate::authorize('view', $patient);

        // Appointment's own BelongsToOrganization global scope already
        // restricts this to the active organization (set by the
        // `organization` route middleware before this controller runs).
        // A past appointment keeps its professional and service after a
        // deactivation or removal soft-deletes them.
        $appointments = $patient->appointments()
            ->with([
                'membership' => fn ($query) => $query->withTrashed(),
                'membership.user',
                'service' => fn ($query) => $query->withTrashed(),
                'organization',
            ])
            ->orderBy('start_at', 'desc')
            ->get();

        return PatientAppointmentResource::collection($appointments);
    }

    public function update(UpdatePatientRequest $request, Patient $patient, UpdatePatientAction $action): PatientResource
    {
        Gate::authorize('update', $patient);

        /** @var User $user */
        $user = $request->user();

        $patient = $action->handle(new PatientUpdateData(
            patientId: $patient->id,
            updatedBy: $user->id,
            attributes: $request->safe()->except('contacts'),
            contacts: $request->input('contacts') !== null ? $request->contacts() : null,
        ));

        return new PatientResource($patient->load('contacts'));
    }

    // Deliberate, narrow exception to organization scoping: resolves a patient by their exact document globally so the create form can be prefilled with the personal data the platform shares (#365). Requires the same permission as create(), since it exists to support it, and is throttled and logged per membership.
    public function lookup(LookupPatientRequest $request, LookUpPatientAction $action): PatientResource
    {
        Gate::authorize('create', Patient::class);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        return new PatientResource($action->handle(new PatientLookupData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            documentType: DocumentType::from($request->string('document_type')->toString()),
            documentNumber: $request->string('document_number')->toString(),
        )));
    }
}
