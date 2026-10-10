<?php

declare(strict_types=1);

namespace App\Http\Controllers\Appointments;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Appointments\IndexWaitingRoomRequest;
use App\Http\Resources\Appointments\AppointmentResource;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * The waiting room's queue (#224): arrived appointments in the range, with
 * the agenda's own visibility. Its own route so the plan gate (#237) covers
 * the screen without touching the agenda.
 */
class WaitingRoomController extends Controller
{
    public function index(IndexWaitingRoomRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Appointment::class);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $appointments = Appointment::query()
            ->visibleTo($membership)
            ->whereBetween('start_at', [$request->string('from')->toString(), $request->string('to')->toString()])
            ->where('status', AppointmentStatus::Arrived)
            ->with(['membership.user', 'patient', 'service'])
            ->orderBy('start_at')
            ->get();

        return AppointmentResource::collection($appointments);
    }
}
