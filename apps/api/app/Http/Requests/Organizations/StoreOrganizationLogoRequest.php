<?php

declare(strict_types=1);

namespace App\Http\Requests\Organizations;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Raster formats only: an SVG can carry script, and the logo is served
 * from the API's own origin.
 */
class StoreOrganizationLogoRequest extends FormRequest
{
    public const MAX_KILOBYTES = 512;

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
            'logo' => [
                'required',
                'file',
                'mimetypes:image/png,image/jpeg,image/webp',
                'max:'.self::MAX_KILOBYTES,
                'dimensions:max_width=2000,max_height=2000',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'logo.required' => 'Elegí una imagen para el logo.',
            'logo.file' => 'Elegí una imagen para el logo.',
            'logo.mimetypes' => 'El logo tiene que ser una imagen PNG, JPG o WebP.',
            'logo.max' => 'El logo puede pesar hasta '.self::MAX_KILOBYTES.' KB.',
            'logo.dimensions' => 'El logo puede medir hasta 2000 px por lado.',
        ];
    }
}
