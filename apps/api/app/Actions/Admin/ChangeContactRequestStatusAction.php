<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\ContactRequestStatusChangeData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Enums\ContactRequestStatus;
use App\Exceptions\Contact\ContactRequestStatusUnchangedException;
use App\Models\ContactRequest;
use Illuminate\Support\Facades\DB;

/**
 * Moves a contact request to another status (any of them, so a request
 * closed by mistake can be reopened), recording the operator who did it.
 * The audit label is the request number, not the visitor's name or email:
 * audit rows are never deleted, and the request itself is pruned after its
 * retention window.
 *
 * @implements Action<ContactRequestStatusChangeData>
 */
class ChangeContactRequestStatusAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  ContactRequestStatusChangeData  $dto
     */
    public function handle(Data $dto): ContactRequest
    {
        return DB::transaction(function () use ($dto): ContactRequest {
            $contactRequest = ContactRequest::query()->lockForUpdate()->findOrFail($dto->contactRequestId);

            /** @var ContactRequestStatus $previous */
            $previous = $contactRequest->status;

            if ($previous === $dto->status) {
                throw new ContactRequestStatusUnchangedException($contactRequest->id, $previous);
            }

            $contactRequest->forceFill([
                'status' => $dto->status,
                'handled_by_id' => $dto->actor->platformAdminId,
                'closed_at' => $dto->status === ContactRequestStatus::Closed ? now() : null,
            ])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::ContactRequestStatusChanged,
                subjectType: AdminAuditSubject::ContactRequest,
                subjectId: $contactRequest->id,
                metadata: [
                    'subject_label' => "Consulta #{$contactRequest->id}",
                    'from' => $previous->value,
                    'to' => $dto->status->value,
                ],
            ));

            return $contactRequest;
        });
    }
}
