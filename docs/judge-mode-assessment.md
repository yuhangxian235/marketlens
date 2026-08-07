# Homepage Judge Mode — Assessment

## Recommendation: Do NOT build a separate Judge Mode for this submission.

**Reason**: The current page architecture is a 7-step sequential wizard. Adding a separate "judge path" would require either duplicating the step logic (violating the constraint against duplicating business logic) or significantly restructuring the existing routing — which risks breaking the working product with less than 24 hours before submission.

## What IS achievable without restructuring

The current page already provides the judge's required information in order if navigated linearly:

1. **Problem** → Step 1 (Agent proposals) + Hero tagline
2. **Difference** → Step 2 (User policy) shows what batch-level checking means
3. **Contradictory Intent demo** → Live Local Lab "Contradictory Intent" button
4. **Hidden Cumulative Spend demo** → Live Local Lab "Hidden Cumulative Spend" button
5. **Monad proof** → Monad Attestation component at page bottom
6. **Engineering evidence** → Technical evidence drawer

## Three low-risk improvements already applied

1. ✅ Hero now leads with judge-facing tagline instead of technical description
2. ✅ Boundary strip says MONAD-ATTESTED (not NOT DEPLOYED ON MONAD)
3. ✅ "Not published yet" dead code removed from attestation component

## Suggested post-submission enhancement

Add a `?mode=judge` URL parameter that:
- Hides the step rail navigation
- Auto-advances through steps on scroll
- Collapses the technical evidence drawer by default
- Shows the Monad attestation card at the top after verification completes

This is ~50 lines of conditional rendering without touching business logic. It would not change what the policy engine does or how evidence is verified.
