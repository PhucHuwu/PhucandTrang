/**
 * Publish Validation Engine (Prompt 34)
 * =====================================
 * Thorough pre-publish inspection system that audits all book entities, pages,
 * elements, media references, audio, and covers before compiling a live snapshot.
 * 
 * Errors (BLOCKING - CANNOT PUBLISH):
 * - missing required media
 * - broken mediaId (referenced mediaId does not exist in Media table)
 * - invalid video poster (VIDEO element with neither posterMediaId nor thumbnailUrl)
 * - invalid interaction target (open-link without URL, navigate-page without page, play-audio without audio)
 * - invalid page order (gaps, duplicate order indices, negative orders)
 * - invalid layout
 * - missing cover (front cover backgroundUrl/mediaId missing)
 * - malformed element transform (NaN, negative width/height, out-of-bounds)
 * - deleted audio references (audioTrackId does not exist)
 * 
 * Warnings (NON-BLOCKING - INFORMATIVE):
 * - empty page (page with 0 elements)
 * - no alt text (IMAGE element without alt text)
 * - very large media (> 10MB)
 * - missing video poster
 */

export type ValidationSeverity = 'ERROR' | 'WARNING';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  location: {
    type: 'BOOK' | 'COVER' | 'PAGE' | 'ELEMENT' | 'AUDIO';
    pageId?: string;
    pageNumber?: number;
    pageOrder?: number;
    elementId?: string;
    elementType?: string;
    mediaId?: string;
  };
  fixLink?: string;
}

export interface ValidationReport {
  isValid: boolean; // false if any ERROR exists
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}
