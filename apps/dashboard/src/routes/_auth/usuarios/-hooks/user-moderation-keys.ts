/** Every read a user's moderation state shows up in (organization detail lists its members' state too). */
export const USER_MODERATION_KEYS = [
    ['users'],
    ['organizations'],
    ['audit-logs'],
    ['overview'],
] as const;
