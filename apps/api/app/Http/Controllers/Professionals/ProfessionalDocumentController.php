<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\UpdateProfessionalDocumentAction;
use App\Data\Professionals\ProfessionalDocumentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Professionals\UpdateProfessionalDocumentRequest;
use App\Http\Resources\Professionals\ProfessionalDocumentResource;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * The caller's own DNI (#380), the one their licenses are looked up with: no user id in the URL, and never another
 * user's.
 */
class ProfessionalDocumentController extends Controller
{
    public function show(Request $request): ProfessionalDocumentResource
    {
        /** @var User $user */
        $user = $request->user();

        return new ProfessionalDocumentResource($user);
    }

    public function update(UpdateProfessionalDocumentRequest $request, UpdateProfessionalDocumentAction $action): ProfessionalDocumentResource
    {
        /** @var User $user */
        $user = $request->user();

        return new ProfessionalDocumentResource($action->handle(new ProfessionalDocumentData(
            userId: $user->id,
            documentNumber: $request->documentNumber(),
        )));
    }
}
