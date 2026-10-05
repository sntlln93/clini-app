<?php

declare(strict_types=1);

// Every authenticated platform-operator route, as [method, uri template];
// placeholders are filled by adminRouteUri() (tests/Pest.php).
dataset('admin_routes', [
    'logout' => ['post', '/api/v1/admin/logout'],
    'me' => ['get', '/api/v1/admin/me'],
    'overview' => ['get', '/api/v1/admin/overview'],
    'stats' => ['get', '/api/v1/admin/stats'],
    'organizations index' => ['get', '/api/v1/admin/organizations'],
    'organizations show' => ['get', '/api/v1/admin/organizations/{organization}'],
    'organizations suspend' => ['post', '/api/v1/admin/organizations/{organization}/suspension'],
    'organizations reactivate' => ['delete', '/api/v1/admin/organizations/{organization}/suspension'],
    'users index' => ['get', '/api/v1/admin/users'],
    'users show' => ['get', '/api/v1/admin/users/{user}'],
    'users block' => ['post', '/api/v1/admin/users/{user}/block'],
    'users unblock' => ['delete', '/api/v1/admin/users/{user}/block'],
    'users verify email' => ['post', '/api/v1/admin/users/{user}/email-verification'],
    'subscriptions index' => ['get', '/api/v1/admin/subscriptions'],
    'subscriptions show' => ['get', '/api/v1/admin/subscriptions/{subscription}'],
    'subscriptions extend grace' => ['post', '/api/v1/admin/subscriptions/{subscription}/grace-extension'],
    'subscription events' => ['get', '/api/v1/admin/subscription-events'],
    'audit logs' => ['get', '/api/v1/admin/audit-logs'],
    'platform admins' => ['get', '/api/v1/admin/platform-admins'],
]);
