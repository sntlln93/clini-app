<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The DNI a professional's licenses are looked up with (#380): only ever to its owner. `locked` once a license of
 * theirs is in Clini (#387); `registry` says whether the registry found anyone under it: `unchecked` until it answers.
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
            'locked' => $user->hasLockedProfessionalDocument(),
            'registry' => match (true) {
                $user->document_number === null || $user->document_checked_at === null => 'unchecked',
                $user->professionalLicenses()->exists() => 'found',
                default => 'not_found',
            },
        ];
    }
}
