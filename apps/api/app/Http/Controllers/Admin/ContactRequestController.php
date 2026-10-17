<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\ContactRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexContactRequestRequest;
use App\Http\Resources\Admin\AdminContactRequestResource;
use App\Models\ContactRequest;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContactRequestController extends Controller
{
    public function index(IndexContactRequestRequest $request): AnonymousResourceCollection
    {
        $status = $request->filled('status')
            ? ContactRequestStatus::from($request->string('status')->toString())
            : null;

        $contactRequests = ContactRequest::query()
            ->withStatus($status)
            ->with('handledBy')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page') ?: 15)
            ->withQueryString();

        return AdminContactRequestResource::collection($contactRequests);
    }
}
