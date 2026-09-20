import 'reflect-metadata';
import { validate } from 'class-validator';
import { ElementInteractionDto } from './element-interaction.dto';
import { PageBackgroundDto, HeaderFadeDto } from './page-background.dto';
import { ElementTransformDto } from './element-transform.dto';

describe('Strict DTO Validations (Req 6, 7, 14, 17, 18, 19)', () => {
  describe('ElementInteractionDto', () => {
    it('should pass with valid action and string or number target', async () => {
      const dto = new ElementInteractionDto();
      dto.action = 'open-video';
      dto.target = 'https://example.com/video.mp4';
      dto.enabled = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);

      // Number target (e.g. page index for navigate-page)
      dto.action = 'navigate-page';
      dto.target = 5;
      const errors2 = await validate(dto);
      expect(errors2.length).toBe(0);
    });

    it('should reject invalid action not in ELEMENT_INTERACTION_ACTIONS', async () => {
      const dto = new ElementInteractionDto();
      dto.action = 'invalid-action' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('action');
    });

    it('should reject arbitrary object or array in target', async () => {
      const dto = new ElementInteractionDto();
      dto.action = 'open-link';
      dto.target = { malicious: true } as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('target');
    });
  });

  describe('PageBackgroundDto', () => {
    it('should reject non-boolean enabled in headerFade or gutterFade', async () => {
      const dto = new PageBackgroundDto();
      dto.type = 'color';
      const headerFade = new HeaderFadeDto();
      headerFade.enabled = 'yes' as any;
      dto.headerFade = headerFade;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid boolean enabled and numeric bounds', async () => {
      const dto = new PageBackgroundDto();
      dto.type = 'color';
      dto.color = '#F9F5EC';
      const headerFade = new HeaderFadeDto();
      headerFade.enabled = true;
      headerFade.height = 0.35;
      headerFade.startOpacity = 0.9;
      headerFade.endOpacity = 0;
      dto.headerFade = headerFade;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ElementTransformDto', () => {
    it('should reject negative width or height', async () => {
      const dto = new ElementTransformDto();
      dto.x = 0.1;
      dto.y = 0.1;
      dto.width = -0.5; // Invalid!
      dto.height = 0.4;
      dto.rotation = 0;
      dto.scale = 1;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'width')).toBe(true);
    });

    it('should reject scale <= 0', async () => {
      const dto = new ElementTransformDto();
      dto.x = 0;
      dto.y = 0;
      dto.width = 0.5;
      dto.height = 0.5;
      dto.rotation = 0;
      dto.scale = 0; // Invalid!

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'scale')).toBe(true);
    });
  });
});
