<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminRefResource;
use App\Models\PlatformAdmin;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PlatformAdminController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return AdminRefResource::collection(PlatformAdmin::query()->orderBy('name')->orderBy('id')->get());
    }
}
