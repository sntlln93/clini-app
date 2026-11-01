<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The DNI a professional's licenses are looked up with (#380): only ever to its owner.
 *
 * @mixin User
 */
class ProfessionalDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;

        return [
            'document_number' => $user->document_number,
        ];
    }
}
