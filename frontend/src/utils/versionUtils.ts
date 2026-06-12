
/**
 * versionUtils.ts — Ligature version management utilities
 *
 * Conventions:
 *   Draft / in-progress  →  0.x  (minor bumps on each workflow step)
 *   Approved / final     →  1.0  (major bump on approval)
 *   Post-approval revisions → 1.x, then 2.0 on next approval cycle
 *
 * Examples:
 *   bumpMinor('0.1')  → '0.2'
 *   bumpMinor('0.9')  → '0.10'
 *   bumpMajor('0.3')  → '1.0'
 *   bumpMajor('1.4')  → '2.0'
 */

/**
 * Increment the minor version component.
 * Used when moving between draft workflow stages (draft → in-review → qc, etc.)
 */
export function bumpMinor(version: string): string {
  const parts = version.split('.');
  if (parts.length < 2) return version;
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  if (isNaN(major) || isNaN(minor)) return version;
  return `${major}.${minor + 1}`;
}

/**
 * Bump to the next major version at .0.
 * Used on approval / finalization.
 */
export function bumpMajor(version: string): string {
  const parts = version.split('.');
  if (parts.length < 1) return version;
  const major = parseInt(parts[0], 10);
  if (isNaN(major)) return version;
  return `${major + 1}.0`;
}

/**
 * Returns true if the version is a draft (major === 0).
 */
export function isDraftVersion(version: string): boolean {
  const major = parseInt(version.split('.')[0], 10);
  return major === 0;
}

/**
 * Returns true if the version is a released version (major >= 1).
 */
export function isReleasedVersion(version: string): boolean {
  return !isDraftVersion(version);
}

/**
 * Format a version string for display.
 * Ensures it always has a leading 'v' stripped (we store bare e.g. '0.1', '1.0').
 */
export function formatVersion(version: string): string {
  return version.startsWith('v') ? version.slice(1) : version;
}

/**
 * Given an authoring document status, return the version bump that should
 * happen when entering that status.
 *
 * Returns null if no bump should occur.
 */
export type WorkflowTransition =
  | 'start-draft'         // not-started → drafting        (content added)
  | 'submit-internal'     // drafting → internal-review
  | 'submit-cross-func'   // internal-review → cross-functional-review
  | 'submit-qc'           // cross-functional → qc-review
  | 'submit-final'        // qc-review → final-review
  | 'approve'             // final-review → approved        (major bump → 1.0)
  | 'revise'              // approved → drafting            (minor bump on new draft cycle)

export function versionForTransition(
  currentVersion: string,
  transition: WorkflowTransition,
): string {
  switch (transition) {
    case 'start-draft':
      // First content added — ensure we're at 0.1
      return currentVersion === '0.0' || currentVersion === '' ? '0.1' : currentVersion;
    case 'submit-internal':
    case 'submit-cross-func':
    case 'submit-qc':
    case 'submit-final':
      return bumpMinor(currentVersion);
    case 'approve':
      return bumpMajor(currentVersion);
    case 'revise':
      // Starting a revision of an approved doc — bump minor from released version
      return bumpMinor(currentVersion);
    default:
      return currentVersion;
  }
}
