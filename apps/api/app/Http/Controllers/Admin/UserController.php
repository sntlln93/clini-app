<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexUserRequest;
use App\Http\Resources\Admin\AdminUserDetailResource;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function index(IndexUserRequest $request): AnonymousResourceCollection
    {
        $users = User::query()
            ->search($request->string('q')->toString() ?: null)
            ->verified($request->filled('verified') ? $request->boolean('verified') : null)
            ->blocked($request->filled('blocked') ? $request->boolean('blocked') : null)
            ->withAdminListing()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page') ?: 15)
            ->withQueryString();

        return AdminUserResource::collection($users);
    }

    public function show(User $user): AdminUserDetailResource
    {
        return new AdminUserDetailResource(User::query()->withAdminDetail()->findOrFail($user->id));
    }
}
