import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Link-preview crawlers (Facebook, Messenger, Zalo...) must be able to read the page and its og image
      { userAgent: ['facebookexternalhit', 'Facebot', 'meta-externalagent'], allow: '/' },
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] },
    ],
  };
}
