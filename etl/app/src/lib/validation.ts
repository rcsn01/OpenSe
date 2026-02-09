/**
 * Centralized validation & sanitization module.
 *
 * Rationale (Audit S1, S2, S5):
 * - Registration accepted passwords with only minLength=6 (OWASP A07)
 * - Workflow imports parsed arbitrary JSON with no schema check (OWASP A03)
 * - checkCheckoutSession returned "complete" for any string (OWASP A01)
 *
 * This module provides reusable, well-tested validators used across the app.
 */

// ────────────────────────────────────────────
// Password Strength
// ────────────────────────────────────────────
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/**
 * Validates password strength against OWASP guidelines.
 * Requirements: >=8 chars, upper + lower case, digit, special character.
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required.'] };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit.');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }

  return { valid: errors.length === 0, errors };
};

// ────────────────────────────────────────────
// UUID Validation
// ────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUUID = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value);

// ────────────────────────────────────────────
// Text Sanitisation
// ────────────────────────────────────────────
/**
 * Strips HTML tags and trims whitespace. Prevents stored XSS when
 * user-supplied strings (workflow names, org names) are persisted.
 */
export const sanitizeText = (input: string, maxLength = 255): string => {
  if (typeof input !== 'string') return '';
  // Strip HTML tags
  const stripped = input.replace(/<[^>]*>/g, '');
  // Collapse whitespace and trim
  return stripped.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

// ────────────────────────────────────────────
// Email Validation
// ────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && EMAIL_REGEX.test(value);

// ────────────────────────────────────────────
// Workflow Import Schema Validation
// ────────────────────────────────────────────
/**
 * Validates the structure of an imported workflow JSON. Rejects
 * payloads that don't match the expected schema to prevent injection
 * of unexpected node types or data shapes (Audit S5).
 */
export interface WorkflowImportPayload {
  name?: string;
  graph_data?: {
    nodes?: unknown[];
    edges?: unknown[];
  };
  nodes?: unknown[];
  edges?: unknown[];
}

export const validateWorkflowImport = (
  raw: unknown
): { valid: true; data: WorkflowImportPayload } | { valid: false; error: string } => {
  if (raw === null || typeof raw !== 'object') {
    return { valid: false, error: 'Import must be a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;

  // Accept either { graph_data: { nodes, edges } } or { nodes, edges }
  const graph = (obj.graph_data ?? obj) as Record<string, unknown>;

  if (graph.nodes !== undefined && !Array.isArray(graph.nodes)) {
    return { valid: false, error: '"nodes" must be an array.' };
  }
  if (graph.edges !== undefined && !Array.isArray(graph.edges)) {
    return { valid: false, error: '"edges" must be an array.' };
  }

  // Validate each node has required fields
  const nodes = (graph.nodes ?? []) as Record<string, unknown>[];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (typeof node !== 'object' || node === null) {
      return { valid: false, error: `Node at index ${i} is not an object.` };
    }
    if (typeof node.id !== 'string') {
      return { valid: false, error: `Node at index ${i} is missing a valid "id".` };
    }
    if (typeof node.type !== 'string') {
      return { valid: false, error: `Node at index ${i} is missing a valid "type".` };
    }
    if (typeof node.position !== 'object' || node.position === null) {
      return { valid: false, error: `Node at index ${i} is missing a valid "position".` };
    }
  }

  // Validate each edge has required fields
  const edges = (graph.edges ?? []) as Record<string, unknown>[];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (typeof edge !== 'object' || edge === null) {
      return { valid: false, error: `Edge at index ${i} is not an object.` };
    }
    if (typeof edge.source !== 'string') {
      return { valid: false, error: `Edge at index ${i} is missing a valid "source".` };
    }
    if (typeof edge.target !== 'string') {
      return { valid: false, error: `Edge at index ${i} is missing a valid "target".` };
    }
  }

  return {
    valid: true,
    data: {
      name: typeof obj.name === 'string' ? sanitizeText(obj.name, 100) : undefined,
      graph_data: obj.graph_data
        ? { nodes: graph.nodes as unknown[], edges: graph.edges as unknown[] }
        : undefined,
      nodes: !obj.graph_data ? (graph.nodes as unknown[]) : undefined,
      edges: !obj.graph_data ? (graph.edges as unknown[]) : undefined,
    },
  };
};
