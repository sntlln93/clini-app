<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The medication catalog (#377, ADR 0031): a global cache of what ANMAT's public vademecum lookup answered, filled
 * on demand as professionals search, never by a bulk import. A product is one GTIN; its active ingredients arrive with
 * its detail. Each search records its term, so the catalog knows which terms it already holds in full.
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
            $table->string('gtin', 14)->unique();
            $table->string('certificate_number', 20);
            $table->string('laboratory');
            $table->string('commercial_name');
            $table->string('pharmaceutical_form');
            $table->string('presentation');
            $table->string('generic_name', 500);
            $table->string('administration_route')->nullable();
            $table->string('dispensing_condition')->nullable();
            $table->string('troquel', 20)->nullable();
            // The search that listed it last, which its detail replays: ANMAT's detail page reads the product from the
            // session of a search, never from its URL.
            $table->string('listed_by_field', 20);
            $table->string('listed_by_term', 100);
            $table->dateTimeTz('detail_fetched_at')->nullable();
            $table->timestampsTz();
        });

        Schema::create('medication_ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medication_product_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->string('name');
            // The substance without its salt or hydrate, folded: what the allergy warning compares.
            $table->string('substance');
            $table->string('quantity', 50)->nullable();
            $table->string('unit', 50)->nullable();
            $table->string('as_name')->nullable();
            $table->string('as_quantity', 50)->nullable();
            $table->string('as_unit', 50)->nullable();

            $table->unique(['medication_product_id', 'position']);
        });

        Schema::create('medication_searches', function (Blueprint $table) {
            $table->id();
            // Folded, as the catalog compares it.
            $table->string('term', 100);
            // Fewer results than a page: nothing a longer term could find is missing.
            $table->boolean('complete');
            $table->dateTimeTz('searched_at');

            $table->index(['term', 'searched_at']);
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
