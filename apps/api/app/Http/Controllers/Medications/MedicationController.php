<?php

declare(strict_types=1);

namespace App\Http\Controllers\Medications;

use App\Actions\Medications\FetchMedicationDetailAction;
use App\Actions\Medications\SearchMedicationsAction;
use App\Data\Medications\MedicationLookupData;
use App\Data\Medications\MedicationSearchData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Medications\SearchMedicationsRequest;
use App\Http\Resources\Medications\MedicationProductResource;
use App\Models\MedicationProduct;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The medication catalog (#377, ADR 0031): global reference data searched while indicating medication, filled on
 * demand from the national vademecum. No authorization beyond the route middleware, and no write endpoints.
 */
class MedicationController extends Controller
{
    public function index(SearchMedicationsRequest $request, SearchMedicationsAction $action): AnonymousResourceCollection
    {
        return MedicationProductResource::collection($action->handle(new MedicationSearchData($request->term())));
    }

    public function show(MedicationProduct $medicationProduct, FetchMedicationDetailAction $action): MedicationProductResource
    {
        return new MedicationProductResource($action->handle(new MedicationLookupData($medicationProduct->id)));
    }
}
