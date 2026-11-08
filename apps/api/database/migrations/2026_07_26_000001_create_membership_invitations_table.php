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
        Schema::create('membership_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->string('email');
            $table->json('roles');
            $table->string('token')->unique();
            $table->dateTimeTz('expires_at');
            $table->dateTimeTz('accepted_at')->nullable();
            // The DNIs looked up to accept as a professional (#417): three at most, and a third that doesn't serve
            // expires the invitation. Only the count: the DNI itself waits for the acceptance in the session.
            $table->unsignedSmallInteger('document_lookups')->default(0);
            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_invitations');
    }
};
