<?php

declare(strict_types=1);

namespace App\Http\Controllers\Patients;

use App\Actions\Patients\RegisterPatientAction;
use App\Data\Patients\PatientRegistrationData;
use App\Enums\DocumentType;
use App\Enums\Sex;
use App\Exceptions\Patients\PatientNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patients\IndexPatientRequest;
use App\Http\Requests\Patients\LookupPatientRequest;
use App\Http\Requests\Patients\StorePatientRequest;
use App\Http\Requests\Patients\UpdatePatientRequest;
use App\Http\Resources\Patients\PatientAppointmentResource;
use App\Http\Resources\Patients\PatientResource;
use App\Models\Patient;
use App\Support\CurrentOrganization;
use Illuminate\Http\JsonResponse;
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
            ->with('insuranceProvider')
            ->orderBy('name')
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
            email: $request->string('email')->toString() ?: null,
            phone: $request->string('phone')->toString() ?: null,
            sex: $request->filled('sex') ? Sex::from($request->string('sex')->toString()) : null,
            birthDate: $request->string('birth_date')->toString() ?: null,
            insuranceProviderId: $request->integer('insurance_provider_id') ?: null,
        );

        $patient = $action->handle($dto);

        return (new PatientResource($patient))->response()->setStatusCode(201);
    }

    public function show(Patient $patient): PatientResource
    {
        Gate::authorize('view', $patient);

        return new PatientResource($patient->load('insuranceProvider'));
    }

    public function appointmentHistory(Patient $patient): AnonymousResourceCollection
    {
        Gate::authorize('view', $patient);

        // Appointment's own BelongsToOrganization global scope already
        // restricts this to the active organization (set by the
        // `organization` route middleware before this controller runs).
        $appointments = $patient->appointments()
            ->with(['membership.user', 'service', 'organization'])
            ->orderBy('start_at', 'desc')
            ->get();

        return PatientAppointmentResource::collection($appointments);
    }

    public function update(UpdatePatientRequest $request, Patient $patient): PatientResource
    {
        Gate::authorize('update', $patient);

        $patient->update($request->validated());

        return new PatientResource($patient);
    }

    // Deliberate, narrow exception to organization scoping: resolves a patient by document pair globally so the create form can be prefilled before it is linked to this organization. Requires the same permission as create(), since it exists to support it.
    public function lookup(LookupPatientRequest $request): PatientResource
    {
        Gate::authorize('create', Patient::class);

        $documentType = $request->string('document_type')->toString();
        $documentNumber = $request->string('document_number')->toString();

        $patient = Patient::query()
            ->where('document_type', $documentType)
            ->where('document_number', $documentNumber)
            ->first();

        if ($patient === null) {
            throw new PatientNotFoundException($documentType, $documentNumber);
        }

        return new PatientResource($patient);
    }
}
