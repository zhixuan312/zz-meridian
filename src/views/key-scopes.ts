/** The scopes a key can carry: the Create key sheet offers them and the create action accepts nothing else. */
export const SCOPES = ['messages', 'search', 'embeddings', 'files', 'webhooks'] as const;

export type Scope = (typeof SCOPES)[number];
