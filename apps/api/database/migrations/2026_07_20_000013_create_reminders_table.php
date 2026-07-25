<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_id');
            $table->string('channel');
            $table->string('status')->default('pending');
            $table->timestamp('scheduled_at');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->foreign(['appointment_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('appointments')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
