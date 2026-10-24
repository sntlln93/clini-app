<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalRecords;

use App\Actions\ClinicalAccess\RecordExportedPatientsAction;
use App\Actions\ClinicalRecords\RecordClinicalRecordExportAction;
use App\Contracts\PdfRenderer;
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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Takes the clinical history out of Clini (#326, ADR 0021). Each export is recorded before it is built, and none of it
 * is stored: it is generated on the request and only reaches the browser that asked. Reads stay open on an expired
 * subscription, so a practice can always take its history with it.
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

    public function patient(
        ExportPatientClinicalRecordRequest $request,
        Patient $patient,
        RecordClinicalRecordExportAction $record,
        PdfRenderer $pdf,
    ): Response {
        Gate::authorize('exportForPatient', [ClinicalRecordExport::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $format = $request->exportFormat();

        $export = $record->handle(new ClinicalRecordExportData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            scope: ClinicalRecordExportScope::Patient,
            format: $format,
        ));

        $content = [
            'export' => (new ClinicalRecordExportResource($export->load(['organization', 'exporter.user'])))->resolve($request),
            ...(new ClinicalRecordResource(
                ClinicalRecordLoader::patient($patient, $membership->organization_id, $membership->id)
            ))->resolve($request),
        ];

        // Only the id names the file: it lands in the browser's download history.
        $headers = [
            ...self::HEADERS,
            'Content-Disposition' => "attachment; filename=\"historia-clinica-{$patient->id}.{$format->value}\"",
        ];

        if ($format === ClinicalRecordExportFormat::Json) {
            return response()->json($content, 200, $headers, self::JSON_FLAGS | JSON_PRETTY_PRINT);
        }

        /** @var array{export: array<string, mixed>, patient: array<string, mixed>, appointments: list<array<string, mixed>>, access_log: list<array<string, mixed>>} $plain */
        $plain = json_decode(json_encode($content, self::JSON_FLAGS), true, flags: JSON_THROW_ON_ERROR);

        $organization = $export->organization;

        $html = view('clinical-records.patient', [
            'export' => $plain['export'],
            'record' => $plain,
            'timezone' => $organization === null ? Config::string('app.timezone') : $organization->timezone,
        ])->render();

        return response($pdf->render($html), 200, [...$headers, 'Content-Type' => 'application/pdf']);
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

        return response()->streamDownload(function () use ($request, $heading, $organizationId, $membershipId, $exportId, $recordExported): void {
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
        }, 'historia-clinica.json', [...self::HEADERS, 'Content-Type' => 'application/json; charset=utf-8']);
    }
}
