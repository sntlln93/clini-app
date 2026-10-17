<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ChangeContactRequestStatusAction;
use App\Data\Admin\AdminActorData;
use App\Data\Admin\ContactRequestStatusChangeData;
use App\Enums\ContactRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateContactRequestStatusRequest;
use App\Http\Resources\Admin\AdminContactRequestResource;
use App\Models\ContactRequest;
use App\Models\PlatformAdmin;

class ContactRequestStatusController extends Controller
{
    public function update(
        UpdateContactRequestStatusRequest $request,
        ContactRequest $contactRequest,
        ChangeContactRequestStatusAction $action,
    ): AdminContactRequestResource {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $updated = $action->handle(new ContactRequestStatusChangeData(
            actor: new AdminActorData($admin->id, $request->ip()),
            contactRequestId: $contactRequest->id,
            status: ContactRequestStatus::from($request->string('status')->toString()),
        ));

        return new AdminContactRequestResource($updated->load('handledBy'));
    }
}
