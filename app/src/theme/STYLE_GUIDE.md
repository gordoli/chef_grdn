# Chef GRDN design system

The source of truth is `src/theme/tokens.css`. `src/styles.css` only composes the theme layers and Tailwind. Feature CSS modules use these tokens; `npm run theme:check` rejects new raw colors outside this folder and raw spacing, font sizes, rounding or animation durations outside the token definitions.

## Foundations

- **Typography:** local Poppins, weights 400/500/600. Body is `--text-14`; form labels `--text-12`; captions/pills `--text-11`; row titles `--text-16`; section titles `--text-20` or `--text-24`. The display scale is reserved for page headings. Do not shrink text below the caption size to make a control fit.
- **Spacing:** use the shared `--space-*` scale. It follows a four-pixel rhythm with half steps for compact controls. Standard field gaps are 16, section gaps 24/32, and page padding 20/24/48. Values are rem-based so text zoom scales the interface.
- **Rounding:** use `--radius-4/8/12/16/20/24`; pills use `--radius-pill`, circles use 50%. Inputs and thumbnails use 12; content cards 16; dialogs 24. Avoid one-off corner values.
- **Colors:** `--background`, `--foreground`, `--muted-foreground`, `--border`, `--primary` and other semantic roles adapt to light/dark themes. Neutral content surfaces stay quiet. Green signals primary actions or meaningful state. Material recipes and specialized reference-chart colors live here. Social branding uses explicit `--brand-*` tokens and never changes app-wide semantic colors.
- **Glass:** `.glass-control` is the shared material for navigation and floating controls. Use ordinary neutral surfaces for content; do not create another glass material in a feature component.
- **Focus:** keep a visible focus ring. Native radios/checkboxes, meaningful labels, and a single owner for selection state support keyboard and assistive technology.

## Layout and media

`media.ts` specifies intrinsic image dimensions and responsive sizes. The restaurant board frame is `--size-thumbnail` (64 CSS pixels); its optimized source can be larger for high-density screens. Gallery previews and full images have separate size hints. Keep frames reserved before loading so content does not jump. Only the allowlisted public Yelp CDN uses server image optimization; other HTTPS photos load directly with asynchronous decoding. Failed optimization falls back to the original image, then to a neutral icon.

Physical geometry is an intentional exception to spacing tokens: one-pixel borders, percentages, aspect ratios, SVG paths, map coordinates, image export dimensions, and responsive breakpoints describe geometry rather than visual spacing. Keep such values in the owning theme recipe or a named configuration. Do not turn every 0/1 or aspect ratio into a token.

## Motion

- `--motion-fast` (160 ms): small feedback and step entry.
- `--motion-standard` (240 ms): navigation and dismissal.
- `--motion-panel` (320 ms): large panel entry.
- `--ease-enter` and `--ease-exit`: shared directional curves.
- `--motion-pulse`: loading feedback only.
- `--motion-roll-duration` (4000 ms): the requested restaurant-roll sequence; JavaScript reads this CSS value. `--motion-roll-cycle` drives the tumbling die and card shuffle, and `--motion-dice-idle` controls the gentle idle float. Reduced-motion skips the roll delay. Closing the sheet disposes its timer.

Animate opacity and transforms. Keep wizard frame height and footer position stable while changing steps. The navigation selection has a server-rendered active-state fallback until its measured highlight is ready. Recipe dismissal waits for the animation and reads its fallback duration from the CSS token instead of a second hardcoded timer. `gestures.ts` documents physical touch thresholds. Reduced-motion disables transitions, animations and smooth scrolling; reduced-transparency has an opaque control fallback.

## Ownership and changes

Theme files own global materials and domain styles. Feature CSS modules own layout composition using the same tokens. Change an existing selector in its owning file; do not append another conflicting override. Theme layers retain the existing cascade order to protect current screens during this consolidation. Historical compatibility selectors can be removed only after checking both themes and responsive layouts.

`palette.ts` supplies literal colors to browser metadata and image-export APIs that cannot consume CSS variables. Its semantic colors are checked against the CSS tokens by `palette.test.ts`. `theme.ts` owns the storage key and trusted first-paint bootstrap; cross-tab changes apply the same light/dark class.

`src/config/loading.ts` owns operational freshness, signing and import policies. These are separate from visual tokens. Validation limits remain near their schemas. Recipe JSON and `upsert_recipe` are independent of presentation changes.

Before delivery run typechecking, lint (including the theme check), business/permission tests, a production build and formatting checks. Verify mobile/desktop, light/dark, keyboard focus, gallery selection persistence and the reduced-motion paths for affected flows.
