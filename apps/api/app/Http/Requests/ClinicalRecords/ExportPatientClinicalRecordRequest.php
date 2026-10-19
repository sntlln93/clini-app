<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalRecords;

use App\Enums\ClinicalRecordExportFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The controller authorizes; validating the format first reads nothing of the patient.
 */
class ExportPatientClinicalRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'format' => ['required', Rule::enum(ClinicalRecordExportFormat::class)],
        ];
    }

    public function exportFormat(): ClinicalRecordExportFormat
    {
        return $this->enum('format', ClinicalRecordExportFormat::class) ?? ClinicalRecordExportFormat::Pdf;
    }
}
