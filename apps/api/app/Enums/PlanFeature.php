<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Functions a plan may leave out (#237). The values are part of the REST
 * contract: `GET /plan` lists them and `plans.feature_unavailable` names one.
 */
enum PlanFeature: string
{
    /** Inviting admins or staff, or more professionals than the plan's limit. */
    case Team = 'team';
    case WaitingRoom = 'waiting_room';
    case Prescriptions = 'prescriptions';
    case ProfessionalBookingLinks = 'professional_booking_links';
}
