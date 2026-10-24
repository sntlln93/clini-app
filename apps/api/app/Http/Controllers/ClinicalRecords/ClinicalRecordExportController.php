<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalRecords;

use App\Actions\ClinicalAccess\RecordExportedPatientsAction;
use App\Actions\ClinicalRecords\RecordClinicalRecordExportAction;
use App\Data\ClinicalAccess\ExportedPatientsData;
use App\Data\ClinicalRecords\ClinicalRecordExportData;
use App\Enums\ClinicalRecordExportFormat;
use App\Enums\ClinicalRecordExportScope;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalRecords\ExportPatientClinicalRecordRequest;
use App\Http\Resources\ClinicalRecords\ClinicalRecordExportResource;
use App\Http\Resources\ClinicalRecords\ClinicalRecordResource;
use App\Models\ClinicalRecordExport;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use App\Support\ClinicalRecordLoader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Takes the clinical history out of Clini (#326, ADR 0021). Each export is recorded before it is read, and none of it is
 * stored. The API answers its data; the panel builds the file, PDF or JSON, in the browser that asked (ADR 0023). Reads
 * stay open on an expired subscription, so a practice can always take its history with it.
 */
class ClinicalRecordExportController extends Controller
{
    public const int JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;

    /**
     * A copy of a clinical history: never cached, never sniffed into something the browser renders.
     */
    public const array HEADERS = [
        'Cache-Control' => 'no-store, private',
        'X-Content-Type-Options' => 'nosniff',
    ];

    /**
     * One patient's history. `format` is the file the panel will build from it, and goes on the export's record.
     */
    public function patient(
        ExportPatientClinicalRecordRequest $request,
        Patient $patient,
        RecordClinicalRecordExportAction $record,
    ): JsonResponse {
        Gate::authorize('exportForPatient', [ClinicalRecordExport::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $export = $record->handle(new ClinicalRecordExportData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            scope: ClinicalRecordExportScope::Patient,
            format: $request->exportFormat(),
        ));

        return response()->json([
            'export' => (new ClinicalRecordExportResource($export->load(['organization', 'exporter.user'])))->resolve($request),
            ...(new ClinicalRecordResource(
                ClinicalRecordLoader::patient($patient, $membership->organization_id, $membership->id)
            ))->resolve($request),
        ], 200, self::HEADERS, self::JSON_FLAGS | JSON_PRETTY_PRINT);
    }

    /**
     * Every patient the membership attended, as one JSON document streamed a chunk of patients at a time, so its size
     * never sits in memory. What it holds per patient is the same as the patient export, and each patient's trail gets
     * the export's row as the export reaches them.
     */
    public function attended(
        Request $request,
        RecordClinicalRecordExportAction $record,
        RecordExportedPatientsAction $recordExported,
    ): StreamedResponse {
        Gate::authorize('exportAttended', ClinicalRecordExport::class);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $export = $record->handle(new ClinicalRecordExportData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: null,
            scope: ClinicalRecordExportScope::AttendedPatients,
            format: ClinicalRecordExportFormat::Json,
        ));

        $heading = (new ClinicalRecordExportResource($export->load(['organization', 'exporter.user'])))->resolve($request);
        $organizationId = $membership->organization_id;
        $membershipId = $membership->id;
        $exportId = $export->id;

        return response()->stream(function () use ($request, $heading, $organizationId, $membershipId, $exportId, $recordExported): void {
            echo '{"export":'.json_encode($heading, self::JSON_FLAGS).',"patients":[';

            $separator = '';
            $patients = ClinicalRecordLoader::attendedPatients(
                $organizationId,
                $membershipId,
                fn (array $patientIds) => $recordExported->handle(new ExportedPatientsData(
                    organizationId: $organizationId,
                    membershipId: $membershipId,
                    clinicalRecordExportId: $exportId,
                    patientIds: $patientIds,
                )),
            );

            foreach ($patients as $patient) {
                echo $separator.json_encode((new ClinicalRecordResource($patient))->resolve($request), self::JSON_FLAGS);
                $separator = ',';
            }

            echo ']}';
        }, 200, [...self::HEADERS, 'Content-Type' => 'application/json; charset=utf-8']);
    }
}
