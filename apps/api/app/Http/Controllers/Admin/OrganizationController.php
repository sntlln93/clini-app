<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexOrganizationRequest;
use App\Http\Resources\Admin\AdminOrganizationDetailResource;
use App\Http\Resources\Admin\AdminOrganizationResource;
use App\Models\Organization;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrganizationController extends Controller
{
    public function index(IndexOrganizationRequest $request): AnonymousResourceCollection
    {
        $sort = $request->string('sort')->toString() === 'name' ? 'name' : 'created_at';
        $direction = match ($request->string('direction')->toString()) {
            'asc' => 'asc',
            'desc' => 'desc',
            default => $sort === 'name' ? 'asc' : 'desc',
        };

        $organizations = Organization::query()
            ->search($request->string('q')->toString() ?: null)
            ->suspensionState($request->string('status')->toString() ?: null)
            ->subscriptionState($request->string('subscription_status')->toString() ?: null)
            ->withAdminListing()
            ->orderBy($sort, $direction)
            ->orderBy('id', $direction)
            ->paginate($request->integer('per_page') ?: 15)
            ->withQueryString();

        return AdminOrganizationResource::collection($organizations);
    }

    public function show(Organization $organization): AdminOrganizationDetailResource
    {
        return new AdminOrganizationDetailResource(
            Organization::query()->withAdminDetail()->findOrFail($organization->id),
        );
    }
}
