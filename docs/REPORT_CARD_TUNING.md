# Report Card Tuning Guide

This guide explains how the UI in `src/components/ReportCard.tsx` is structured and which pieces to tweak when you want to change the layout, content, or styling of the report card modal.

## 1. High-Level Layout

- **Container** – The root modal is a centered flex wrapper with a gradient background. The main card lives in a `max-w-5xl` wrapper so you can widen or narrow the design by editing that class.
- **Section cards** – Most inner blocks share the `sectionCardClass` variable. Update the class string near the top of the component if you want to adjust borders, radius, or background for every card at once.
- **Responsive behavior** – The component relies on Tailwind utility breakpoints (`sm:`, `md:`, `lg:`). When altering layouts, keep the `grid` + `flex` pairings so mobile stacks correctly.

## 2. Data Sources

- **Summary metrics** come from `analysis`, `recs`, and `repoIQ`, which originate in `@/lib/report-card`.
- To change how many resources/exercises surface, adjust the `topResources` and `topExercises` slices (currently `slice(0, 3)` and `slice(0, 2)`).
- If you need more granular data (e.g., average time per question), extend the libs first, then render inside the relevant sections.

## 3. Hero Summary Panel

- Located near the top of the JSX: the gradient header with the close button and stat tiles.
- **Colors/gradient** – Edit the `bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600` class string.
- **Stat tiles** – Each tile is a small card inside a three-column grid; add/remove tiles by editing the markup in the hero `grid grid-cols-2 ...`.
- **Repo IQ block** – Uses `repoIQ.reasoning.slice(0, 2)` to list two bullets. Increase or decrease the count there.

## 4. Strengths & Weak Spots

- These sections live in the first `md:grid-cols-2` grid after the hero.
- To change the icons or highlight colors, edit the inline spans (currently ✅ and ⚠️). If you prefer ASCII icons, swap them for text such as `[+]` and `[!]`.
- Empty states use short fallback copy; update those strings for custom guidance.

## 5. Performance Trends

- Controlled by `languageEntries` and `typeBreakdownEntries`.
- **Adding metrics** – Duplicate one of the mapped blocks to create new bars (e.g., accuracy by difficulty). Feed it the appropriate data and progress class.
- **Animations** – The progress bars animate with Framer Motion. Remove the `<motion.div>` wrappers if you prefer static bars.

## 6. Next Moves (Resources & Exercises)

- Wrapped in the right-hand card of the trends row.
- Change the layout by editing the lists under the `Resources` and `Exercises` headings.
- To link internally within the app instead of new tabs, replace the `<a>` tags with `next/link` components.

## 7. Targeted Tickets

- Tickets are rendered inside the large card near the bottom.
- **Empty state** – Update the message inside the dashed border block to change the call to action when there are no tickets.
- **Ticket styling** – The card background switches based on `t.done`. Change the two class strings inside the template literal to adjust complete vs. open styling.
- **Textarea defaults** – The "Your Fix" textarea pre-fills with a template comment. Edit the string inside `userCodeById[t.id] ?? ...` to tune that default.
- **Button labels** – Update the strings in the motion button components to change button copy (`Mark Complete`, `Copy Summary`, etc.).

## 8. Results Modal

- The modal for ticket grading results appears at the bottom of the component.
- Progress bars reuse a simple width style. Tailor colors via the `color` values (`bg-emerald-600`, etc.).
- You can add more breakdown rows by extending the `codeBars` or `writtenBars` arrays.

## 9. Icon & Emoji Usage

- The current design still uses emoji for status markers (e.g., ✅, ⚠️, 🔥). If you need ASCII-only output, replace them with textual equivalents.

## 10. Quick Customization Workflow

1. Decide which card or section you want to modify and locate the block as described above.
2. Adjust a shared class (like `sectionCardClass`) if you want consistent styling changes across the board; otherwise tweak inline classes in that block.
3. For structural changes, duplicate or remove the card markup and update the surrounding `grid` or `flex` utilities so breakpoints remain logical.
4. Verify responsiveness by testing at 360 px, 768 px, and 1280 px widths.
5. If you introduce new data requirements, add fields in `@/lib/report-card` and ensure the props feeding the component include them.

Keeping edits scoped to the helper variables and the labeled sections above will let you iterate on the design quickly without losing responsive behavior or shared styling.
