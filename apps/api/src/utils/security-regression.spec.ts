import { safeDeepMerge } from './safe-merge';
import { isValidHttpUrl, validateInteractionTarget } from '@phucandtrang/shared';
import { ALLOWED_CLOUDINARY_FOLDERS } from '../media/media.service';

describe('Security Hardening Regression Tests (Prompt 35)', () => {
  describe('Prototype Pollution Prevention (safeDeepMerge)', () => {
    it('must ignore __proto__, constructor, and prototype injection attempts', () => {
      const maliciousPayload = JSON.parse(
        '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"hacked": true}}, "normalField": "safe"}'
      );

      const target: Record<string, any> = { existing: 'data' };
      const merged = safeDeepMerge(target, maliciousPayload);

      expect((target as any).polluted).toBeUndefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((target as any).hacked).toBeUndefined();
      expect((Object.prototype as any).hacked).toBeUndefined();
      expect(merged.existing).toBe('data');
      expect((merged as any).normalField).toBe('safe');
    });
  });

  describe('URL & Open-Link Safety Validation', () => {
    it('should strictly allow only valid HTTP and HTTPS protocols', () => {
      expect(isValidHttpUrl('https://phucandtrang.love')).toBe(true);
      expect(isValidHttpUrl('http://example.com/test')).toBe(true);

      // Malicious or unauthorized protocols must be rejected
      expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
      expect(isValidHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidHttpUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isValidHttpUrl('file:///etc/passwd')).toBe(false);
      expect(isValidHttpUrl('ftp://ftp.example.com')).toBe(false);
      expect(isValidHttpUrl('')).toBe(false);
    });

    it('validateInteractionTarget strictly validates action-dependent targets', () => {
      // open-link: null means valid (0 error), string means error message
      expect(validateInteractionTarget('open-link', 'https://love.phuchuwu.io.vn')).toBeNull();
      expect(validateInteractionTarget('open-link', 'javascript:void(0)')).not.toBeNull();

      // navigate-page requires non-empty target
      expect(validateInteractionTarget('navigate-page', 'page-123')).toBeNull();
      expect(validateInteractionTarget('navigate-page', '')).not.toBeNull();

      // play-audio requires non-empty audioTrackId
      expect(validateInteractionTarget('play-audio', 'audio-track-1')).toBeNull();
      expect(validateInteractionTarget('play-audio', '')).not.toBeNull();

      // none and zoom do not require target
      expect(validateInteractionTarget('none', '')).toBeNull();
      expect(validateInteractionTarget('zoom', '')).toBeNull();
    });
  });

  describe('Cloudinary Folder Whitelist Enforcement', () => {
    it('allowed folders must be strictly confined to defined project boundaries', () => {
      expect(ALLOWED_CLOUDINARY_FOLDERS.has('phuc_trang_memories')).toBe(true);
      expect(ALLOWED_CLOUDINARY_FOLDERS.has('phuc_trang_backgrounds')).toBe(true);
      expect(ALLOWED_CLOUDINARY_FOLDERS.has('phuc_trang_audio')).toBe(true);

      // Disallow path traversal or foreign folders
      expect(ALLOWED_CLOUDINARY_FOLDERS.has('../root')).toBe(false);
      expect(ALLOWED_CLOUDINARY_FOLDERS.has('system')).toBe(false);
      expect(ALLOWED_CLOUDINARY_FOLDERS.has('hack_folder')).toBe(false);
    });
  });
});
