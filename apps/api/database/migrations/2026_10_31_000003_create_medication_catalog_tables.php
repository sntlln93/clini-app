<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The medication catalog (#377, ADR 0031): a global cache of what the national medication search answered, filled on
 * demand as professionals search, never by a bulk import. A product is one GTIN, with the substances its drug text
 * names. Each search records its term, so the catalog knows which terms it already holds.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('medication_products', function (Blueprint $table) {
            $table->id();
            // GTIN-14: the source writes some with fewer digits.
            $table->string('gtin', 14)->unique();
            $table->string('name');
            $table->string('presentation')->nullable();
            $table->string('pharmaceutical_form')->nullable();
            $table->string('administration_route')->nullable();
            $table->string('laboratory')->nullable();
            $table->string('troquel', 20)->nullable();
            $table->string('snomed', 20)->nullable();
            // As the source writes it: abbreviated, inverted and sometimes cut short (`composition_incomplete`).
            $table->string('drug', 500)->nullable();
            $table->string('drug_code', 20)->nullable();
            $table->string('therapeutic_action')->nullable();
            $table->string('therapeutic_action_code', 20)->nullable();
            // «Venta Libre», «Venta Bajo Receta», «Venta Bajo Receta Archivada»…
            $table->string('dispensing_condition')->nullable();
            // «PSICOTROPICO IV», «ESTUPEFACIENTE III», «VENTA VIGILADA»; null when not controlled.
            $table->string('control_mark')->nullable();
            $table->boolean('withdrawn');
            $table->boolean('in_force');
            $table->date('source_updated_on')->nullable();
            $table->boolean('composition_incomplete');
            $table->timestampsTz();
        });

        Schema::create('medication_ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medication_product_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            // As the source writes it.
            $table->string('name');
            // Expanded, without its salt, with its accents: what the panel shows and the allergy warning folds.
            $table->string('substance');

            $table->unique(['medication_product_id', 'position']);
        });

        Schema::create('medication_searches', function (Blueprint $table) {
            $table->id();
            // `MedicationSearch::key()`, which is also what the source was asked. The source answers whole, so a recent
            // search holds everything it and any longer term containing it can find.
            $table->string('term', 100)->unique();
            $table->dateTimeTz('searched_at')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medication_searches');
        Schema::dropIfExists('medication_ingredients');
        Schema::dropIfExists('medication_products');
    }
};
