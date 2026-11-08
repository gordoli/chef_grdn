# Pixel chef identity

Created with the built-in image generation tool, using Gordon’s cooking portrait as the identity/clothing reference and the existing Fami-Li mascot as a style reference. The original photograph is excluded from the repository.

## Generation prompt

Create one single, cute large-headed chibi pixel chef based on the portrait: short tousled black hair, warm medium skin, black sleeveless shirt, black apron with ivory straps, and simple line tattoos on the exposed arm. Face directly toward the camera with a big warm happy smile and cheerful eyes. Hold a cooking spatula upright in one hand and an ordinary silver kitchen knife upright in the other in a friendly cooking pose. Match the Fami-Li reference’s crisp blocky pixels, chunky dark outlines, limited palette, rosy cheeks and subtle pixel shading. Both utensils fully inside a square transparent canvas. No scenery, text, watermark or additional characters.

## Final framing edit prompt

Make only this framing change: use a waist-up composition, cropped cleanly at the waist/apron belt, with no lower apron, hips, legs, pants, feet or shoes. Enlarge the waist-up portrait within a square canvas, centered, with clear transparent margin; keep every part of both utensils, hands, arms and hair inside the canvas. Preserve the exact character identity, smiling happy face, pixel style, palette, hair, apron, arm tattoos, and both utensils. Real transparency, no added text or watermark.

## Outputs

- `public/brand/chef-grdn-mascot.png`: final transparent master.
- `public/favicon.ico` and `public/icons/`: favicon, Apple touch, installable and maskable app variants.
- `public/og-image.png`: 1600×900 white social preview matching Fami-Li’s composition, with real Poppins Semibold text “Chef GRDN” below the portrait.
- `scripts/build-brand.mjs`: deterministic icon resizing and branded social-card layout; does not regenerate the character.
