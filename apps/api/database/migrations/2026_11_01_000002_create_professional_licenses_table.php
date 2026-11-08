<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A professional's DNI and licenses, checked against the national registry (#380, ADR 0032). Both belong to the
     * user: a professional carries them to every organization, and so the specialties they back (#387, ADR 0038).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Only to look the user's licenses up in the registry: encrypted (model cast), never searched by, and hidden
            // from every serialization.
            $table->text('document_number')->nullable()->after('email');
        });

        Schema::create('professional_licenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // What the professional declares.
            $table->string('number', 40);
            $table->string('province');
            $table->string('profession');
            // What the registry last said, and when. Only the minimum (no CUIL, sex or name): the REFEPS code, the
            // issuer, the specialty and the situation; the number, province and profession are the declared ones. The
            // specialty is the catalog row of the registry's profession and specialty, or of the profession alone.
            $table->string('status')->default('unverified');
            $table->string('mismatch_reason')->nullable();
            $table->string('refeps_code', 20)->nullable();
            $table->string('issuer')->nullable();
            $table->foreignId('specialty_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('situation')->nullable();
            $table->dateTimeTz('checked_at')->nullable();
            // Last time Clini asked, answered or not: the daily reverification goes oldest attempt first, so a DNI
            // whose lookup keeps failing never holds the others back.
            $table->dateTimeTz('attempted_at')->nullable();
            $table->timestampsTz();

            $table->unique(['user_id', 'province', 'profession', 'number']);
            $table->index('checked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('professional_licenses');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('document_number');
        });
    }
};
