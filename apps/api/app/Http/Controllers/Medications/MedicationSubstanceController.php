<?php

declare(strict_types=1);

namespace App\Http\Controllers\Medications;

use App\Actions\Medications\SearchMedicationSubstancesAction;
use App\Data\Medications\MedicationSearchData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Medications\SearchMedicationsRequest;
use Illuminate\Http\JsonResponse;

/**
 * The active substances of the medication catalog (#383), suggested while recording an allergy so it names a
 * substance the allergy warning finds in a catalog product. Global reference data: no authorization beyond the route
 * middleware, and no write endpoints.
 */
class MedicationSubstanceController extends Controller
{
    public function index(SearchMedicationsRequest $request, SearchMedicationSubstancesAction $action): JsonResponse
    {
        return response()->json(['data' => $action->handle(new MedicationSearchData($request->term()))]);
    }
}
