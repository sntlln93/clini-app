<?php

declare(strict_types=1);

namespace App\Http\Resources\ClinicalRecords;

use App\Enums\ClinicalRecordExportScope;
use App\Models\ClinicalRecordExport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The heading of an export (#326): its own record row says who generated it, where and when, plus what it leaves out,
 * so a copy read years later still says what it holds.
 *
 * @mixin ClinicalRecordExport
 */
class ClinicalRecordExportResource extends JsonResource
{
    public const string NOT_A_PRESCRIPTION = 'Este documento no es una receta.';

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $export = $this->export();

        return [
            'id' => $export->id,
            'generated_at' => $export->created_at,
            'organization' => $export->organization?->name,
            'generated_by' => [
                'membership_id' => $export->membership_id,
                'name' => $export->exporter?->user?->name,
            ],
            'scope' => $export->scope,
            'notice' => $this->notice($export),
        ];
    }

    private function notice(ClinicalRecordExport $export): string
    {
        $patients = $export->scope === ClinicalRecordExportScope::Patient
            ? 'del paciente'
            : 'de todos los pacientes que atendió quien la generó';

        return "Copia de la historia clínica {$patients} en este consultorio: los turnos y las notas clínicas de todos "
            .'sus profesionales, con cada versión, enmienda, diagnóstico y anulación, su autor y su fecha. '
            .'La medicación indicada incluye solo la que indicó quien generó la copia. '
            .'El registro de accesos dice quién leyó, escribió, enmendó, anuló o exportó la historia y cuándo, sin lo '
            .'que hicieron otros profesionales con la medicación que indicaron. '
            .'No incluye nada de otros consultorios. '.self::NOT_A_PRESCRIPTION;
    }

    private function export(): ClinicalRecordExport
    {
        /** @var ClinicalRecordExport $export */
        $export = $this->resource;

        return $export;
    }
}
