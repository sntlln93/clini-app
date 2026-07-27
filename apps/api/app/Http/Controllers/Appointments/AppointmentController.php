<?php

declare(strict_types=1);

namespace App\Http\Controllers\Appointments;

use App\Actions\Appointments\BookAppointmentAction;
use App\Actions\Appointments\TransitionAppointmentStatusAction;
use App\Data\Appointments\AppointmentBookingData;
use App\Data\Appointments\AppointmentStatusTransitionData;
use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Appointments\IndexAppointmentRequest;
use App\Http\Requests\Appointments\StoreAppointmentRequest;
use App\Http\Requests\Appointments\UpdateAppointmentStatusRequest;
use App\Http\Resources\Appointments\AppointmentResource;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AppointmentController extends Controller
{
    public function index(IndexAppointmentRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Appointment::class);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $query = Appointment::query()
            ->visibleTo($membership)
            ->whereBetween('start_at', [$request->string('from')->toString(), $request->string('to')->toString()]);

        if ($request->filled('membership_id')) {
            $query->where('membership_id', $request->integer('membership_id'));
        }

        $appointments = $query
            ->with(['membership.user', 'patient', 'service'])
            ->orderBy('start_at')
            ->get();

        return AppointmentResource::collection($appointments);
    }

    public function store(StoreAppointmentRequest $request, BookAppointmentAction $action): JsonResponse
    {
        $membership = Membership::query()->findOrFail($request->integer('membership_id'));

        Gate::authorize('create', [Appointment::class, $membership]);

        /** @var User $user */
        $user = $request->user();

        $appointment = $action->handle(new AppointmentBookingData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $request->integer('patient_id'),
            serviceId: $request->integer('service_id'),
            createdBy: $user->id,
            startAt: CarbonImmutable::parse($request->string('start_at')->toString()),
            origin: AppointmentOrigin::Manual,
            reason: $request->filled('reason') ? $request->string('reason')->toString() : null,
            notes: $request->filled('notes') ? $request->string('notes')->toString() : null,
        ));

        return (new AppointmentResource($appointment))
            ->response()
            ->setStatusCode(201);
    }

    public function updateStatus(
        UpdateAppointmentStatusRequest $request,
        Appointment $appointment,
        TransitionAppointmentStatusAction $action
    ): AppointmentResource {
        Gate::authorize('update', $appointment);

        $updated = $action->handle(new AppointmentStatusTransitionData(
            appointmentId: $appointment->id,
            status: AppointmentStatus::from($request->string('status')->toString()),
        ));

        return new AppointmentResource($updated);
    }
}
