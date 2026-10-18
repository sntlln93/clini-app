<?php

declare(strict_types=1);

namespace App\Http\Requests\Prescriptions;

/**
 * Same payload as issuing one: an edit replaces the whole item list.
 */
class UpdatePrescriptionRequest extends StorePrescriptionRequest {}
