<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AdminAuditAction;
use App\Models\AdminAuditLog;
use App\Models\PlatformAdmin;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Tests only.
 *
 * @extends Factory<AdminAuditLog>
 */
class AdminAuditLogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'platform_admin_id' => PlatformAdmin::factory(),
            'action' => AdminAuditAction::AuthLogin,
            'subject_type' => null,
            'subject_id' => null,
            'metadata' => [],
            'ip' => '127.0.0.1',
        ];
    }
}
