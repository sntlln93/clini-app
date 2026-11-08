<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalDocumentData;
use App\Data\Professionals\RegistryDocumentData;
use App\Exceptions\Professionals\ProfessionalDocumentLockedException;
use App\Exceptions\Professionals\ProfessionalDocumentNotInRegistryException;
use App\Exceptions\Professionals\ProfessionalDocumentTakenException;
use App\Models\User;
use App\Support\DocumentIndex;
use App\Support\ProfessionalLicenseSync;
use App\Support\RegistrySpecialtyCatalog;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Loads the DNI of an account that has none yet (#380, #417): only one the registry holds someone under, whose name
 * becomes the account's, and only once. From then on neither the DNI nor the name is the user's to change: support
 * does it (`user:reset-professional-document`, `user:rename`). One DNI, one account: a DNI another account holds,
 * found by its blind index under every key in use, is a 409. The lookup runs outside any transaction; its answer also
 * brings the licenses the registry holds for the DNI, for the professional to add (#387).
 *
 * @implements Action<ProfessionalDocumentData>
 */
class UpdateProfessionalDocumentAction implements Action
{
    public function __construct(private readonly IdentifyRegistryProfessionalAction $identify) {}

    /**
     * @param  ProfessionalDocumentData  $dto
     */
    public function handle(Data $dto): User
    {
        $user = User::query()->findOrFail($dto->userId);

        if (is_string($user->document_number)) {
            // Sending the loaded DNI again changes nothing.
            if (DocumentIndex::normalize($user->document_number) === DocumentIndex::normalize($dto->documentNumber)) {
                return $user;
            }

            throw new ProfessionalDocumentLockedException;
        }

        $identity = $this->identify->handle(new RegistryDocumentData($dto->documentNumber));

        if ($identity === null) {
            throw new ProfessionalDocumentNotInRegistryException($dto->userId);
        }

        try {
            DB::transaction(function () use ($dto, $identity): void {
                $user = User::query()->whereKey($dto->userId)->lockForUpdate()->firstOrFail();

                if ($user->document_number !== null) {
                    throw new ProfessionalDocumentLockedException;
                }

                if (User::query()->withDocument($dto->documentNumber)->whereKeyNot($user->id)->exists()) {
                    throw new ProfessionalDocumentTakenException($user->id);
                }

                $catalog = RegistrySpecialtyCatalog::record($identity->professionals);

                $user->forceFill([
                    'document_number' => $dto->documentNumber,
                    'name' => $identity->name,
                    'document_checked_at' => now(),
                ])->save();

                ProfessionalLicenseSync::apply($user->id, $identity->professionals, $catalog);
            });
        } catch (UniqueConstraintViolationException $exception) {
            // Another account took the DNI between the check and the write; any other violation is unexpected.
            if (! str_contains($exception->getMessage(), 'document_number_index')) {
                throw $exception;
            }

            throw new ProfessionalDocumentTakenException($dto->userId);
        }

        return User::query()->findOrFail($dto->userId);
    }
}
