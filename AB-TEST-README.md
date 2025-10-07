# A/B Testing Setup for Tim Meko Portfolio

## Quick Overview
Your site now includes A/B testing to compare your **existing scrolling hero** against a **traditional clean hero** design.

## Configuration
Edit `src/_data/abtest.json` to control the test:

```json
{
  "heroTest": {
    "active": true,           // Turn test on/off
    "splitRatio": 0.5,        // 50/50 split (0.0-1.0) 
    "testName": "hero-design-2025",
    "variants": ["scrolling", "traditional"],
    "gaTrackingId": "G-RFFKWQDXGN"
  }
}
```

## What Gets Tracked
- ⏱️ **Time on page**: 10s, 30s, 60s, 120s, 300s intervals
- 📊 **Scroll depth**: 25%, 50%, 75%, 90%, 100% milestones
- 🎯 **Portfolio clicks**: Featured, insights, editing, more work sections
- 💼 **LinkedIn clicks**: Profile, articles, company links

## Testing & Development

### Toggle Variants Manually
Press `Ctrl+Shift+A` while developing to switch between variants

### View Current Assignment
Check browser console for: `🎯 A/B Test Variant: scrolling/traditional`

### Force Specific Variant
In browser console:
```javascript
localStorage.setItem('ab_test_variant', 'traditional');
location.reload();
```

## View Results in Google Analytics

1. **GA4 → Events → View all events**  
2. **Filter by**: `hero-design-2025_*`
3. **Key events to analyze**:
   - `hero-design-2025_variant_assigned` (user assignments)
   - `hero-design-2025_time_on_page` (engagement metrics)
   - `hero-design-2025_scroll_depth` (user behavior)
   - `hero-design-2025_portfolio_click` (conversion tracking)
   - `hero-design-2025_linkedin_click` (social engagement)

## The Two Variants

### Variant A: Scrolling (Your Original Design)
- Beautiful scrolling grid background with project thumbnails
- Immersive full-height experience
- Your existing hero content and styling

### Variant B: Traditional
- Clean gradient background  
- Focused content with key highlights
- Clear call-to-action buttons
- Professional, conventional layout

## Turn Test On/Off

**To activate**: Set `"active": true` in `src/_data/abtest.json`  
**To disable**: Set `"active": false` (will show scrolling variant by default)

## Files Added
- `src/_data/abtest.json` - Configuration
- `src/assets/js/ab-test.js` - Tracking system
- `src/css/ab-test.css` - Variant B styles
- Updates to `base.njk` and `index.njk` for integration

The system is completely non-destructive - your existing design and functionality remain unchanged!
