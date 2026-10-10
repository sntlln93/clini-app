<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per organization and month whose Free-plan warning (#238)
     * went out. The unique key is what sends it once: BookAppointmentAction
     * inserts with insertOrIgnore and mails only when a row was written.
     * `month` is the first day of the month, in the organization's timezone.
     */
    public function up(): void
    {
        Schema::create('appointment_limit_warnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->date('month');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['organization_id', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_limit_warnings');
    }
};
