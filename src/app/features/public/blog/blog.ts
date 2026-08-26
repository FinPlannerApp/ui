import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogLoaderService } from './blog-loader.service';
import { Auth } from '../../../core/services/auth';

export const BLOG_POSTS = [
  {
    id: 'mastering-personal-cash-flow-guide-2026',
    tag: 'Guide',
    tagColor: '#10b981',
    title: 'Mastering Personal Cash Flow: The Complete 2026 Financial Planner Guide',
    excerpt: 'Discover how smart account categorization, automated recurring tracking, and real-time net worth signals empower complete financial control in 2026.',
    date: 'Aug 26, 2026',
    _dateValue: new Date('2026-08-26'),
    content: `
      <h2>1. Net Worth vs. Monthly Cash Flow</h2>
      <p>Achieving financial independence begins with clarity over your daily cash flow. Whether you are managing daily merchant spend, credit card statements, or long-term investments, keeping track of where every rupee goes is the single most powerful habit for building sustainable wealth.</p>
      <ul>
        <li><strong>Net Worth</strong> = Total Assets (Savings + Investments) − Total Liabilities (Credit Card Debt + Loans)</li>
        <li><strong>Monthly Cash Flow</strong> = Inflows (Income) − Outflows (Expenses + Debt Repayments)</li>
      </ul>
      <p>Tracking both metrics simultaneously allows you to see both your immediate liquidity and your long-term wealth trajectory.</p>

      <h2>2. Optimizing Assets & Liabilities</h2>
      <h3>Managing Assets</h3>
      <p>Divide your assets into clear operational buckets:</p>
      <ul>
        <li><strong>Emergency Funds:</strong> 3 to 6 months of living expenses stored in high-yield liquid accounts.</li>
        <li><strong>Goal-Oriented Buckets:</strong> Designated savings for planned major purchases, vacations, or tax commitments.</li>
      </ul>

      <h3>Controlling Debt</h3>
      <ul>
        <li><strong>Credit Card Billing Cycles:</strong> Always align your budget with your statement closing date and due date to avoid interest charges.</li>
        <li><strong>Pay Off High Interest First:</strong> Prioritize revolving credit card debt before expanding discretionary investments.</li>
      </ul>

      <h2>3. Automation is Key to Discipline</h2>
      <p>Manually recording every small daily expense can lead to budgeting fatigue. By utilizing <strong>recurring subscription tracking</strong> and <strong>scheduled balance adjustments</strong>, your financial dashboard remains up-to-date with zero hassle.</p>
      <p><em>Pro Tip: Set up recurring transfer reminders for your savings buckets on the day your salary is credited. Pay your future self first!</em></p>
    `
  },
  // ─── v6.0.0 — PWA + UI OVERHAUL ───────────────────────────────────────────
  {
    id: 'v6-0-0-release',
    tag: 'v6.0.0',
    tagColor: '#6366f1',
    title: 'v6.0.0 — Progressive Web App, UI Overhaul & Responsiveness',
    excerpt: 'Financial Planner is now an installable PWA with instant loading, plus a complete UI overhaul — responsive layouts, template extraction, filter bar redesigns, and dashboard polish.',
    date: 'May 31, 2026',
    _dateValue: new Date('2026-05-31'),
    content: `
      <h2>What is v6.0.0?</h2>
      <p>Version 6.0.0 is a dual release: the app is now a <strong>Progressive Web App</strong> (installable, offline-ready, instant loading), and the entire frontend has received a <strong>comprehensive UI and responsiveness overhaul</strong> across every major page.</p>

      <h2>📲 Progressive Web App</h2>
      <p>Financial Planner can now be <strong>installed</strong> on any device — phone, tablet, or desktop. It launches in its own window like a native app, loads <strong>instantly from cache</strong> on repeat visits, and notifies you when a new version is available.</p>
      <ul>
        <li><strong>Install Banner:</strong> A glassmorphism-styled banner slides up at the bottom when the app is installable. One click to add to your home screen.</li>
        <li><strong>Instant Boot:</strong> The app no longer blocks while waiting for the Render backend. Public pages (Home, Blog, About, Features) load immediately — the backend wakes up silently in the background.</li>
        <li><strong>Update Toast:</strong> When a new version is deployed, a "Reload Now" toast appears — no stale cached versions.</li>
        <li><strong>iOS Support:</strong> Full Apple PWA meta tags — standalone mode, translucent status bar, touch icon.</li>
      </ul>

      <h2>🎨 Dashboard Layout Cleanup</h2>
      <p>The dashboard template has been restructured for cleaner nesting and better responsive behavior:</p>
      <ul>
        <li>Removed unnecessary wrapper <code>&lt;div class="p-4"&gt;</code> — content now flows naturally within the layout shell without double-padding.</li>
        <li>Summary cards grid uses <code>col-12 sm:col-6 lg:col-3</code> — stacking on mobile, 2-up on tablet, 4-across on desktop.</li>
        <li>Deep Insights panel and chart sections follow the same responsive grid pattern.</li>
      </ul>

      <h2>📋 Resource Page Responsive Redesign</h2>
      <p>The generic <code>ResourcePage</code> (Accounts, Categories, Budgets) received a full responsive overhaul:</p>
      <ul>
        <li>Header bar now uses <code>flex-column md:flex-row</code> — filter controls stack vertically on mobile, sit inline on desktop.</li>
        <li>Search bar + category filter + "New" button properly wrap with <code>gap-2</code> spacing.</li>
        <li>Removed hard-coded <code>p-4</code> padding wrapper — aligns with the layout shell pattern used by all other pages.</li>
        <li>"Back to..." link label now uses <code>singularTitle</code> computed property instead of <code>title.replace('s', '')</code> — fixes issues like "Account Categorie" → "Account Category".</li>
      </ul>

      <h2>💳 Transaction Pages — Filter Bar & Table Responsiveness</h2>
      <p>Both the <strong>Transactions Page</strong> and <strong>Transaction List</strong> received significant CSS work:</p>
      <ul>
        <li><strong>Filter bar</strong> now uses <code>display: flex; align-items: center; justify-content: center</code> with proper wrapping — no more overflow on narrow screens.</li>
        <li><strong>Fieldset-based filters</strong> (Period, Category) wrapped in <code>p-fieldset</code> with custom styling: 12px border-radius, emerald green focus ring, uppercase legend labels, and transparent inner controls for a clean embedded look.</li>
        <li><strong>Table horizontal scroll:</strong> Transaction tables now scroll horizontally on mobile via <code>overflow-x: auto</code> — no more clipped columns.</li>
        <li><strong>Bulk Transaction table</strong> gets <code>min-width: 93rem</code> to prevent column crushing, with horizontal scroll enabled.</li>
        <li><strong>Summary stat cards</strong> in transaction views replaced custom <code>p-card</code> templates with the reusable <code>&lt;app-stat-card&gt;</code> component for consistency.</li>
      </ul>

      <h2>🧩 Template Extraction</h2>
      <p>Several large components had their inline HTML templates extracted to separate <code>.html</code> files for maintainability:</p>
      <ul>
        <li><code>analytics-dashboard.component.ts</code> → <code>analytics-dashboard.component.html</code></li>
        <li><code>leaderboard.component.ts</code> → <code>leaderboard.component.html</code></li>
        <li><code>roadmap.component.ts</code> → <code>roadmap.component.html</code></li>
        <li><code>stat-card.ts</code> → <code>stat-card.html</code></li>
      </ul>

      <h2>🧹 Form & Dialog Polish</h2>
      <ul>
        <li><strong>Account Form:</strong> Removed redundant <code>p-4</code> padding class from form wrapper — dialog content padding handles spacing. Footer buttons aligned with <code>align-items-center</code>.</li>
        <li><strong>Category Form:</strong> Same padding cleanup — consistent with Account Form.</li>
        <li><strong>Transaction Form:</strong> Layout refinements for field alignment and focus order — amount field no longer auto-activates over description.</li>
      </ul>

      <h2>📦 Infrastructure</h2>
      <ul>
        <li>Frontend version bumped to <strong>v6.0.0</strong> across <code>package.json</code>, <code>environment.ts</code>, and <code>environment.prod.ts</code>.</li>
        <li><code>nginx.conf</code> updated with PWA headers (service worker no-cache, manifest MIME type) and non-Docker paths.</li>
        <li><code>@angular/service-worker</code> added as a dependency.</li>
        <li>Content Security Policy updated with <code>manifest-src 'self'</code>.</li>
      </ul>
    `
  },
  // ─── v5.0.1 — URGENT FIX: CLEANUP & POLISH ─────────────────────────────────
  {
    id: 'v5-0-1-release',
    tag: 'v5.0.1',
    tagColor: '#ef4444',
    title: 'v5.0.1 — Urgent Fix: UI Polish & Support System Consolidation',
    excerpt: 'An urgent patch release to resolve a layout regression in generic views and consolidate the feedback channels by removing the obsolete legacy support form.',
    date: 'May 29, 2026',
    _dateValue: new Date('2026-05-29'),
    content: `
      <h2>Why v5.0.1?</h2>
      <p>Following the successful launch of <strong>v5.0.0</strong>, we noticed a minor layout regression on generic resource views and identified a redundancy in our user support flows. This patch release quickly addresses these issues to ensure a seamless experience.</p>

      <h2>🧹 Support Channels Consolidation</h2>
      <p>With the introduction of the powerful full-stack <strong>Feedback Hub</strong> in v5.0.0, the old, simple support form is now fully obsolete. To prevent user confusion and focus all interactions in our rich, gamified environment, we have consolidated our channels:</p>
      <ul>
        <li><strong>Obsolescence Cleanup:</strong> The legacy and redundant <code>/app/support</code> page has been completely removed from navigation routes and sidebar menus.</li>
        <li><strong>Unified Feedback:</strong> Users can now direct all bugs, questions, and feature requests to the <strong>Feedback Hub</strong>, where they can earn karma, interact with comments, and track issue lifecycles.</li>
      </ul>

      <h2>🐛 Generic View Layout Fix</h2>
      <p>We fixed a minor layout regression in the generic <code>ResourcePage</code> views (used for Accounts, Budgets, and Categories):</p>
      <ul>
        <li><strong>Search Bar Duplication:</strong> Resolved a bug that caused an extra, non-functional search input box to render at the top of the resource tables.</li>
        <li><strong>Style Alignment:</strong> Cleaned up layout properties to ensure perfect alignment and cross-browser visual consistency.</li>
      </ul>

      <p>This quick patch keeps the platform robust and polished as we gather community feedback on the new release!</p>
    `
  },
  // ─── v5.0.0 — COMMUNITY FEEDBACK & GAMIFICATION ─────────────────────────────
  {
    id: 'v5-0-0-release',
    tag: 'v5.0.0',
    tagColor: '#8b5cf6',
    title: 'v5.0.0 — Community Feedback Hub, Pain-Driven Prioritization & Gamification',
    excerpt: 'Our biggest release yet: a full-stack community feedback system with pain-score ranking, voting, threaded discussions, product roadmap, gamified karma, badges, and an analytics dashboard.',
    date: 'May 29, 2026',
    _dateValue: new Date('2026-05-29'),
    content: `
      <h2>What is v5.0.0?</h2>
      <p>Version 5.0.0 transforms Financial Planner from a personal finance tool into a <strong>community-driven product</strong>. Users can now report bugs, request features, vote on priorities, participate in threaded discussions, earn karma points, collect badges, and track the product roadmap — all from within the app.</p>

      <h2>🎯 Pain-Driven Prioritization</h2>
      <p>Traditional issue trackers let you pick "High / Medium / Low" priority. We replaced that with a <strong>Pain Score</strong> — a mathematically computed ranking that surfaces the issues causing the most real damage.</p>
      <p>The formula: <code>Pain Score = (Impact × Frequency × Severity) + Financial Risk + Trust Penalty</code></p>
      <ul>
        <li><strong>Impact:</strong> Does this issue cause financial loss? If yes, the weight is <strong>100×</strong>. If not, it's <strong>10×</strong>.</li>
        <li><strong>Frequency:</strong> How often does it occur? Always (×10), Frequent (×5), Sometimes (×3), or Rare (×1).</li>
        <li><strong>Severity:</strong> Critical (×5), Major (×3), or Minor (×1).</li>
        <li><strong>Financial Risk:</strong> The estimated monetary impact (₹) is added directly to the score.</li>
        <li><strong>Trust Penalty:</strong> An additional weight for issues that erode user trust.</li>
      </ul>
      <p>The result: a critical financial bug that happens always scores <strong>5,000+</strong> while a minor cosmetic issue scores under 10. The Feedback Hub auto-sorts by Pain Score so the team always sees the most painful problems first.</p>

      <h2>🗳️ Voting System</h2>
      <p>Every issue and comment supports <strong>upvotes and downvotes</strong>. Votes act as tie-breakers — when two issues have similar Pain Scores, community votes push the more-wanted fix to the top. Voting is one-per-user-per-issue to prevent manipulation.</p>

      <h2>💬 Threaded Discussions</h2>
      <p>Each issue has a rich-text <strong>threaded comment system</strong> with nested replies, structured comment types (General, Workaround, Repro Steps, Solution), inline editing, and emoji reactions (👍 ❤️ 🎉 😄 😕 👀). Comments can be flagged as "Helpful Solution", "Root Cause", or "Repro Confirmed" to surface high-quality contributions.</p>

      <h2>🏆 Gamification & Karma</h2>
      <p>Every contribution earns <strong>karma points</strong>:</p>
      <ul>
        <li>Issue upvote received: <strong>+5</strong> karma</li>
        <li>Issue downvote received: <strong>−3</strong> karma</li>
        <li>Comment upvote received: <strong>+2</strong> karma</li>
        <li>Issue created: <strong>+1</strong> karma</li>
        <li>Issue verified/released: <strong>+10</strong> karma</li>
        <li>Helpful comment: <strong>+5</strong> karma</li>
        <li>Root cause comment: <strong>+10</strong> karma</li>
        <li>Repro confirmed comment: <strong>+5</strong> karma</li>
      </ul>
      <p>Karma thresholds unlock <strong>contributor tags</strong>: Active Contributor (5+), Bronze Reporter (20+), Silver Reporter (50+), Gold Reporter (100+). <strong>Badges</strong> are awarded automatically: First Report, Bug Hunter (5+ issues), Top Reporter (50+ karma), Legend (100+ karma).</p>

      <h2>🗺️ Product Roadmap</h2>
      <p>A public-facing <strong>Kanban roadmap</strong> shows what's Planned, In Progress, and Released. Users can upvote items to influence priorities. Admins can drag-and-drop issues between phases and create new roadmap items with a WYSIWYG editor.</p>

      <h2>📊 Analytics Dashboard (Admin)</h2>
      <p>Admins get a dedicated analytics view with pie/doughnut charts for issues by status and by type, plus summary cards for total issues, open/closed counts, and average resolution time.</p>

      <h2>🔄 Issue Lifecycle</h2>
      <p>Issues follow a structured workflow: <strong>New → Acknowledged → Triaged → Planned → In Progress → Released → Verified → Closed</strong>. Every status transition is logged in a timeline-style Activity Feed with the user who made the change and when.</p>

      <h2>Additional Features in v5.0.0</h2>
      <ul>
        <li><strong>Issue Types:</strong> Bug, Feature, or Question — each with a distinct visual tag.</li>
        <li><strong>Taxonomy System:</strong> Hierarchical categories and subcategories for organizing issues. Create new ones inline while submitting.</li>
        <li><strong>Labels:</strong> Colored labels (like GitHub) that can be toggled on/off per issue.</li>
        <li><strong>Assignees & Milestones:</strong> Assign team members and group issues by milestone.</li>
        <li><strong>Issue Relations:</strong> Link issues with relationship types: Blocks, BlockedBy, DuplicateOf, RelatedTo, Causes, ParentOf, ChildOf.</li>
        <li><strong>Attachments:</strong> Upload screenshots and files directly to issues.</li>
        <li><strong>Duplicate Detection:</strong> Live similarity suggestions as you type your issue title.</li>
        <li><strong>Kanban Board:</strong> Toggle between list and Kanban views in the Feedback Hub. Drag-and-drop status changes (admin only).</li>
        <li><strong>GitHub Integration:</strong> Link issues to their GitHub counterparts with a clickable URL.</li>
        <li><strong>Public Access:</strong> The Feedback Hub, Roadmap, and Leaderboard are accessible without login at <code>/feedback</code>.</li>
      </ul>
    `
  },
  {
    id: 'pain-score-deep-dive',
    tag: 'Feature',
    tagColor: '#ef4444',
    title: 'Pain Score Deep Dive: How We Calculate Issue Priority',
    excerpt: 'Traditional priority dropdowns are lazy. Here\'s how our weighted Pain Score formula mathematically surfaces the issues causing the most real damage to users.',
    date: 'May 29, 2026',
    _dateValue: new Date('2026-05-29'),
    content: `
      <h2>Why Not Just "High / Medium / Low"?</h2>
      <p>Every project management tool gives you a priority dropdown. The problem? <strong>Everything becomes "High".</strong> When everything is high priority, nothing is. Pain Score replaces subjective priority with a <strong>mathematically weighted ranking</strong> that accounts for real user impact.</p>

      <h2>The Formula</h2>
      <p>Each issue is scored using:</p>
      <pre><code>Pain Score = (Impact × Frequency × Severity) + Financial Risk + Trust Penalty</code></pre>

      <h2>Factor 1: Impact (Does It Cost Money?)</h2>
      <p>The single most important question. If the issue causes direct financial loss or discrepancy:</p>
      <ul>
        <li><strong>Impacts Money = Yes:</strong> Weight = <strong>100</strong></li>
        <li><strong>Impacts Money = No:</strong> Weight = <strong>10</strong></li>
      </ul>
      <p>This 10× multiplier ensures that a minor UX annoyance never outranks a bug that silently miscalculates your bank balance.</p>

      <h2>Factor 2: Frequency (How Often?)</h2>
      <ul>
        <li><strong>Always</strong> (happens every time): Weight = <strong>10</strong></li>
        <li><strong>Frequent</strong> (happens most times): Weight = <strong>5</strong></li>
        <li><strong>Sometimes</strong> (intermittent): Weight = <strong>3</strong></li>
        <li><strong>Rare</strong> (edge case): Weight = <strong>1</strong></li>
      </ul>

      <h2>Factor 3: Severity (How Bad Is It?)</h2>
      <ul>
        <li><strong>Critical</strong> (data loss, security breach): Weight = <strong>5</strong></li>
        <li><strong>Major</strong> (broken workflow): Weight = <strong>3</strong></li>
        <li><strong>Minor</strong> (cosmetic, workaround exists): Weight = <strong>1</strong></li>
      </ul>

      <h2>Factor 4: Financial Risk</h2>
      <p>If the issue has a dollar/rupee amount attached (e.g. "this bug caused a ₹5,000 discrepancy"), that amount is added directly to the Pain Score. A ₹50,000 financial risk will dominate the ranking regardless of other factors.</p>

      <h2>Factor 5: Trust Penalty</h2>
      <p>A manually-assigned weight for issues that erode user trust — for example, incorrect balance displays or failed login flows. Even if rare, trust-breaking bugs deserve elevated attention.</p>

      <h2>Score Examples</h2>
      <table>
        <thead><tr><th>Scenario</th><th>Impact</th><th>Freq</th><th>Sev</th><th>Score</th></tr></thead>
        <tbody>
          <tr><td>Balance calculation wrong (always)</td><td>100</td><td>10</td><td>5</td><td><strong>5,000</strong></td></tr>
          <tr><td>Export fails with large datasets</td><td>10</td><td>5</td><td>3</td><td><strong>150</strong></td></tr>
          <tr><td>Dark mode icon color mismatch</td><td>10</td><td>10</td><td>1</td><td><strong>100</strong></td></tr>
          <tr><td>Minor typo on about page</td><td>10</td><td>1</td><td>1</td><td><strong>10</strong></td></tr>
        </tbody>
      </table>

      <h2>Where Votes Fit In</h2>
      <p>Votes are intentionally <strong>not</strong> part of the Pain Score formula. As our codebase notes: <em>"Upvotes are lazy. You need weighted pain."</em> Votes are tracked separately as a <strong>tie-breaker</strong> when sorting — ensuring community voice matters without letting popularity trump objective severity.</p>

      <h2>Visual Indicators</h2>
      <ul>
        <li>Score &gt; 500: <strong>Red left border</strong> — immediate attention needed</li>
        <li>Score 100–500: <strong>Yellow left border</strong> — significant issue</li>
        <li>Score &lt; 100: <strong>Green left border</strong> — under control</li>
      </ul>
    `
  },
  {
    id: 'feedback-hub-guide',
    tag: 'Guide',
    tagColor: '#3b82f6',
    title: 'Feedback Hub: Your Voice Shapes the Product',
    excerpt: 'A complete user guide to the Feedback Hub — how to report bugs, request features, vote on priorities, filter issues, and switch between List and Kanban views.',
    date: 'May 28, 2026',
    _dateValue: new Date('2026-05-28'),
    content: `
      <h2>What Is the Feedback Hub?</h2>
      <p>The Feedback Hub is a <strong>community-driven issue tracker</strong> built directly into Financial Planner. Instead of filing bugs through email or external tools, you can report issues, request features, and ask questions — all from within the app.</p>

      <h2>Accessing the Hub</h2>
      <ul>
        <li><strong>Logged In:</strong> Navigate to <code>/app/issues</code> from the sidebar.</li>
        <li><strong>Public:</strong> Visit <code>/feedback</code> — the Hub is accessible without an account so anyone can browse and submit.</li>
      </ul>

      <h2>Submitting an Issue</h2>
      <p>Click <strong>"Report / Request"</strong> to open the submission form. You'll provide:</p>
      <ol>
        <li><strong>Type:</strong> Choose 🐛 Bug Report, ✨ Feature Request, or ❓ Question.</li>
        <li><strong>Title & Description:</strong> Rich-text editor with formatting. As you type the title, <strong>duplicate detection</strong> shows similar existing issues to prevent duplicates.</li>
        <li><strong>Category & Subcategory:</strong> Select from existing taxonomies or <strong>create new ones inline</strong> by typing a name that doesn't exist yet.</li>
        <li><strong>Impact Assessment:</strong> Set Severity (Minor/Major/Critical) and Frequency (Rare/Sometimes/Frequent/Always). Check "Impacts Money" if the issue causes financial loss, and optionally enter the estimated amount in ₹.</li>
        <li><strong>GitHub Link:</strong> Optionally link to an external GitHub issue.</li>
      </ol>

      <h2>Browsing & Filtering</h2>
      <p>The main Hub page offers powerful filtering:</p>
      <ul>
        <li><strong>Search:</strong> Full-text search across issue titles and descriptions.</li>
        <li><strong>Type Filter:</strong> Toggle between All, Bug, Feature, and Question with a select button strip.</li>
        <li><strong>Category Filter:</strong> Dropdown to filter by taxonomy category.</li>
        <li><strong>Severity Filter:</strong> Filter by Minor, Major, or Critical.</li>
        <li><strong>Sort Options:</strong> Sort by 🔥 Pain Score, 📅 Newest, or 👍 Most Voted from the sidebar.</li>
      </ul>

      <h2>List View vs Kanban View</h2>
      <p>Toggle between views using the button in the top-right filter bar:</p>
      <ul>
        <li><strong>List View:</strong> A vertical card-based layout with voting arrows, pain score display, label tags, and status badges. Each card shows a 2-line description preview and metadata (date, comment count, creator).</li>
        <li><strong>Kanban View:</strong> A horizontal board with columns for each workflow status (New, Acknowledged, Triaged, Planned, InProgress, Released, Verified, Closed). Admins can <strong>drag-and-drop</strong> cards between columns to update status instantly.</li>
      </ul>

      <h2>Voting on Issues</h2>
      <p>Each issue card has up/down vote arrows. Click ▲ to upvote or ▼ to downvote. Your vote is highlighted (green for up, red for down) and you can only vote once per issue. Vote counts are color-coded: green for positive, red for negative.</p>

      <h2>Issue Cards at a Glance</h2>
      <p>Every card displays:</p>
      <ul>
        <li>Issue <strong>#ID</strong> and type tag (Bug/Feature/Question)</li>
        <li><strong>Title</strong> and truncated description</li>
        <li><strong>Status</strong> and <strong>Category</strong> tags</li>
        <li>Colored <strong>labels</strong> with dot indicators</li>
        <li><strong>Date</strong>, <strong>comment count</strong>, and <strong>creator name</strong></li>
        <li>The computed <strong>Pain Score</strong> in large bold text</li>
        <li>A color-coded left border based on Pain Score severity</li>
      </ul>

      <h2>Stats & Formula</h2>
      <p>The sidebar shows total issue count and the pain formula for transparency: <code>Pain Score = (Impact × Frequency × Severity) + Financial Risk + Community Votes</code>.</p>
    `
  },
  {
    id: 'gamification-karma-guide',
    tag: 'Feature',
    tagColor: '#f59e0b',
    title: 'Gamification & Karma: Earn Points, Badges, and Climb the Leaderboard',
    excerpt: 'Every contribution earns karma. Unlock badges like Bug Hunter and Legend. Climb the community leaderboard and earn your contributor tag.',
    date: 'May 28, 2026',
    _dateValue: new Date('2026-05-28'),
    content: `
      <h2>Why Gamification?</h2>
      <p>Quality feedback is the lifeblood of a good product. Gamification rewards the users who invest time in reporting bugs, confirming reproduction steps, and suggesting solutions — making them visible to the entire community.</p>

      <h2>How Karma Is Calculated</h2>
      <p>Your karma score is recalculated in real-time based on all your contributions:</p>
      <table>
        <thead><tr><th>Action</th><th>Karma</th></tr></thead>
        <tbody>
          <tr><td>Issue upvote received (someone upvotes your issue)</td><td><strong>+5</strong></td></tr>
          <tr><td>Issue downvote received</td><td><strong>−3</strong></td></tr>
          <tr><td>Comment upvote received</td><td><strong>+2</strong></td></tr>
          <tr><td>Issue created</td><td><strong>+1</strong></td></tr>
          <tr><td>Issue you reported gets Verified or Released</td><td><strong>+10</strong></td></tr>
          <tr><td>Your comment marked as "Helpful Solution"</td><td><strong>+5</strong></td></tr>
          <tr><td>Your comment marked as "Root Cause"</td><td><strong>+10</strong></td></tr>
          <tr><td>Your comment marked as "Repro Confirmed"</td><td><strong>+5</strong></td></tr>
        </tbody>
      </table>

      <h2>Contributor Tags</h2>
      <p>As your karma grows, you automatically earn visible tags next to your name on the leaderboard:</p>
      <ul>
        <li>5+ karma: <strong>Active Contributor</strong></li>
        <li>20+ karma: <strong>Bronze Reporter</strong></li>
        <li>50+ karma: <strong>Silver Reporter</strong></li>
        <li>100+ karma: <strong>Gold Reporter</strong></li>
      </ul>

      <h2>Badges</h2>
      <p>Badges are permanent achievements displayed on your leaderboard profile:</p>
      <ul>
        <li>🏳️ <strong>First Report</strong> — Submitted your first issue (1+ issue).</li>
        <li>🔍 <strong>Bug Hunter</strong> — Reported 5 or more bugs.</li>
        <li>⭐ <strong>Top Reporter</strong> — Earned 50+ karma.</li>
        <li>🏆 <strong>Legend</strong> — Reached 100+ karma.</li>
      </ul>
      <p>Badges are color-coded and displayed with icons. New badges are added as the community grows.</p>

      <h2>The Leaderboard</h2>
      <p>Accessible at <code>/feedback/leaderboard</code> (or <code>/app/issues/leaderboard</code> when logged in), the leaderboard displays the <strong>top 10 contributors</strong> ranked by karma score. The top 3 positions get trophy icons (🥇 Gold, 🥈 Silver, 🥉 Bronze). Each entry shows the contributor's avatar, display name, karma score, contributor tag, and all earned badges.</p>

      <h2>Best Strategies to Earn Karma Fast</h2>
      <ol>
        <li><strong>Report real pain:</strong> Financial bugs that get upvoted earn the most karma (+5 per upvote).</li>
        <li><strong>Confirm reproductions:</strong> Comment on issues with exact repro steps. If admins mark your comment as "Repro Confirmed", you earn +5.</li>
        <li><strong>Share root causes:</strong> If you discover the root cause of a bug, comment with the details. A "Root Cause" tag earns you +10 karma — the highest single reward.</li>
        <li><strong>Be constructive:</strong> Helpful solution comments earn +5 and often receive upvotes too.</li>
        <li><strong>Avoid spam:</strong> Downvotes cost −3 karma. Quality over quantity always wins.</li>
      </ol>
    `
  },
  {
    id: 'roadmap-kanban-guide',
    tag: 'Guide',
    tagColor: '#10b981',
    title: 'Product Roadmap & Kanban: See What\'s Coming Next',
    excerpt: 'The public product roadmap lets you see what\'s planned, what\'s being built, and what\'s been released. Upvote items to influence our development priorities.',
    date: 'May 27, 2026',
    _dateValue: new Date('2026-05-27'),
    content: `
      <h2>The Roadmap: Transparency by Default</h2>
      <p>Our product roadmap is <strong>publicly visible</strong> at <code>/feedback/roadmap</code>. No registration required. We believe in radical transparency — you should always know what we're building, what's next, and what's already shipped.</p>

      <h2>Three Phases</h2>
      <p>The roadmap is organized as a <strong>horizontal Kanban board</strong> with three columns:</p>
      <ul>
        <li>📅 <strong>Planned</strong> (amber border) — Features and fixes queued for development.</li>
        <li>⚙️ <strong>In Progress</strong> (blue border) — Currently being built and tested.</li>
        <li>✅ <strong>Released</strong> (green border) — Fully completed, tested, and live in production.</li>
      </ul>

      <h2>Stats Dashboard</h2>
      <p>The roadmap header shows four live stats: total planned features, items in progress, released items, and total community upvotes across all roadmap items. These update in real-time as items move between phases.</p>

      <h2>Roadmap Cards</h2>
      <p>Each card on the roadmap shows:</p>
      <ul>
        <li><strong>Type</strong> (Feature/Bug/Question) with a colored tag</li>
        <li><strong>Severity</strong> indicator dot (red for Critical, amber for Major, blue for Minor)</li>
        <li><strong>Milestone</strong> flag if assigned</li>
        <li><strong>Title</strong> and a 3-line description preview</li>
        <li>A color-coded <strong>left border</strong> based on type (green for Feature, red for Bug, blue for Question)</li>
      </ul>

      <h2>Voting on the Roadmap</h2>
      <p>Every roadmap card has inline 👍/👎 voting buttons. You can upvote items you want built sooner. The vote count is displayed between the buttons. Your vote is highlighted so you can see what you've already supported. Clicking "View Details →" takes you to the full issue page where you can join the discussion.</p>

      <h2>Admin Capabilities</h2>
      <p>Administrators have additional powers on the roadmap:</p>
      <ul>
        <li><strong>Drag & Drop:</strong> Move cards between Planned, In Progress, and Released columns by dragging.</li>
        <li><strong>Drop Zones:</strong> Each column has a labeled drop zone at the bottom for intuitive placement.</li>
        <li><strong>Context Menu:</strong> Right-click (or click the ⋮ menu) on any card to edit details, move to a specific phase, or view the full issue.</li>
        <li><strong>Create Items:</strong> Click the + button on any column header to create a new roadmap item with a rich-text WYSIWYG editor. Set the type and severity during creation.</li>
        <li><strong>Edit Items:</strong> Modify title, description, type, and severity of existing items via the context menu.</li>
      </ul>

      <h2>Feedback Hub Integration</h2>
      <p>The roadmap prominently features a "Community Feedback Hub Portal" banner encouraging users to submit feedback and visit the leaderboard. Every roadmap item links back to its full issue page where discussions happen.</p>

      <h2>Two Kanban Views in One App</h2>
      <p>Financial Planner has <strong>two separate Kanban views</strong>, each serving a different purpose:</p>
      <ul>
        <li><strong>Feedback Hub Kanban:</strong> Shows all issues grouped by workflow status (New through Closed). Best for tracking issue lifecycle.</li>
        <li><strong>Product Roadmap Kanban:</strong> Shows only Planned, InProgress, and Released items. Best for understanding product direction.</li>
      </ul>
    `
  },
  {
    id: 'issue-detail-collaboration',
    tag: 'Feature',
    tagColor: '#8b5cf6',
    title: 'Issue Detail & Collaboration: Threads, Reactions & Relationships',
    excerpt: 'Deep dive into the issue detail page: threaded discussions, emoji reactions, comment types, label management, issue relations, file attachments, and the activity feed timeline.',
    date: 'May 27, 2026',
    _dateValue: new Date('2026-05-27'),
    content: `
      <h2>The Issue Detail Page</h2>
      <p>Clicking any issue opens a <strong>comprehensive detail page</strong> that serves as the central collaboration hub. It's divided into the issue header, a discussion column (8/12 width), and an activity feed timeline column (4/12 width).</p>

      <h2>Issue Header</h2>
      <p>The header card shows everything at a glance:</p>
      <ul>
        <li><strong>Voting</strong>: Upvote/downvote arrows with the live vote count. Admins can click the count to see the full voter list with names and vote direction.</li>
        <li><strong>Metadata</strong>: Issue #ID, type tag, status tag, category & subcategory tags.</li>
        <li><strong>Inline Editing</strong>: Issue creators and admins can edit the title and description in place with a rich-text editor.</li>
        <li><strong>Severity & Frequency</strong>: Displayed as badge pairs with color-coded text (red for Critical, yellow for Major).</li>
        <li><strong>Financial Impact</strong>: Shown as a red danger tag with the ₹ amount when applicable.</li>
        <li><strong>Pain Score</strong>: The computed score in large bold text — turns red when above 500.</li>
      </ul>

      <h2>Labels System</h2>
      <p>Labels work like GitHub labels. Each label has a name, hex color, and optional description. Labels appear as colored pill badges on the issue. Click any label to <strong>toggle it on/off</strong> — active labels have a filled background, inactive ones are dimmed. This is available to all logged-in users.</p>

      <h2>Assignees & Milestones</h2>
      <p>Issues can have <strong>multiple assignees</strong> (shown as name pills) and be linked to a <strong>milestone</strong> (shown as a flag tag). These help organize work and track progress toward release goals.</p>

      <h2>Issue Relationships</h2>
      <p>Link issues together with typed relationships:</p>
      <ul>
        <li><strong>Blocks / BlockedBy</strong> — Dependency chains</li>
        <li><strong>DuplicateOf / DuplicatedBy</strong> — Consolidate similar reports</li>
        <li><strong>RelatedTo</strong> — General association</li>
        <li><strong>Causes / CausedBy</strong> — Root cause tracking</li>
        <li><strong>ParentOf / ChildOf</strong> — Hierarchical decomposition</li>
      </ul>
      <p>Each relationship is clickable and navigates to the linked issue. A dialog lets you add new relationships by issue ID and type.</p>

      <h2>File Attachments</h2>
      <p>Upload screenshots, logs, or any supporting files directly to the issue. Each attachment shows the filename, content type icon (image or file), and file size. Clicking the filename opens it in a new tab.</p>

      <h2>Threaded Comments</h2>
      <p>The discussion section supports <strong>fully nested threaded replies</strong> with depth indicators (colored left borders that change hue at each depth level). Each comment shows:</p>
      <ul>
        <li><strong>Avatar</strong> with the user's initials</li>
        <li><strong>Display name</strong> and timestamp</li>
        <li><strong>Comment type</strong> tag (Workaround, ReproSteps, Solution)</li>
        <li><strong>Quality flags</strong>: "Helpful Solution" (green), "Root Cause" (red), "Repro Confirmed" (yellow)</li>
        <li><strong>Vote score</strong> with up/down arrows</li>
        <li><strong>Inline editing</strong> and deletion for comment owners</li>
      </ul>

      <h2>Emoji Reactions</h2>
      <p>Below each comment, you can react with: 👍 ❤️ 🎉 😄 😕 👀. Reactions aggregate and display as small pills showing the emoji and count. Click a reaction to toggle yours on/off. Active reactions are highlighted with a primary-colored border.</p>

      <h2>Comment Quality Flags</h2>
      <p>Issue creators and admins can flag comments to elevate quality contributions:</p>
      <ul>
        <li>✅ <strong>Mark Helpful</strong> — Identifies solution-quality comments (+5 karma for the author).</li>
        <li>🔴 <strong>Mark Root Cause</strong> — Identifies the root cause analysis (+10 karma for the author). Admin only.</li>
        <li>⚠️ <strong>Confirm Repro</strong> — Confirms that someone has reproduced the bug (+5 karma for the author). Admin only.</li>
      </ul>

      <h2>Status Workflow</h2>
      <p>The detail page header includes a <strong>status dropdown</strong> and Close/Reopen buttons. Status transitions follow the enforced workflow: New → Acknowledged → Triaged → Planned → InProgress → Released → Verified → Closed. Closing an issue records who closed it and when.</p>

      <h2>Activity Feed Timeline</h2>
      <p>The right-side column shows a <strong>chronological timeline</strong> of all activity on the issue: creation, status changes, comments added, relations added, assignee changes, and more. Each entry has a type-specific icon, description text, the user who performed the action, and a timestamp.</p>

      <h2>GitHub Integration</h2>
      <p>If a GitHub Issue URL is linked, it appears as a clickable <code><i class="pi pi-github"></i> View on GitHub →</code> link in the header, enabling seamless cross-referencing between the community hub and the development repository.</p>
    `
  },
  // ─── PREVIOUS RELEASES ──────────────────────────────────────────────────────
  {
    id: 'v4-7-0-release',
    tag: 'v4.7.0',
    tagColor: '#10b981',
    title: 'v4.7.0 — Redis "Utter Peace" & Infrastructure Stabilization',
    excerpt: 'Drastically reducing Redis command overhead, fixing critical production migrations, and implementing robust service connectivity.',
    date: 'May 15, 2026',
    _dateValue: new Date('2026-05-15'),
    content: `
      <h2>The Redis Quota Challenge</h2>
      <p>Managing serverless Redis on a free tier requires extreme efficiency. Version 4.7.0 introduces "Utter Peace" for our infrastructure, ensuring we stay well within the Upstash command limits without sacrificing functionality.</p>

      <h2>Infrastructure & Performance</h2>
      <ul>
        <li><strong>Hangfire Memory Storage:</strong> Background jobs have been migrated from Redis to In-Memory storage, eliminating thousands of heartbeats and state-management commands per hour.</li>
        <li><strong>Polled Worker Optimization:</strong> The Email Queue Worker has been tuned from a 1-second interval to 1-minute, reducing overhead by 98% while maintaining reliable delivery.</li>
        <li><strong>Robust Connectivity:</strong> Implemented a resilient Redis URL parser supporting <code>rediss://</code> protocols and enforced 30-second timeouts for high-latency environments like Render.</li>
      </ul>

      <h2>Data & Security</h2>
      <ul>
        <li><strong>Migration Resilience:</strong> Resolved a critical foreign key violation in production migrations. The system now safely backfills legacy data before applying constraints, ensuring zero-downtime schema updates.</li>
        <li><strong>Vulnerability Shield:</strong> Updated core dependencies, including <code>Newtonsoft.Json</code> to 13.0.3, to resolve high-severity security advisories.</li>
      </ul>

      <h2>The Road Ahead</h2>
      <p>With a stable and cost-efficient foundation, we are now shifting focus back to feature expansion and advanced analytics. Stay tuned for deeper financial insights!</p>
    `
  },
  {
    id: 'v4-6-0-release',
    tag: 'v4.6.0',
    tagColor: '#10b981',
    title: 'v4.6.0 — Seamless Navigation & Bulk Financial Insights',
    excerpt: 'Enhancing the user experience with smarter navigation, optimized transaction performance, real-time financial summaries, and new account search capabilities.',
    date: 'Mar 29, 2026',
    _dateValue: new Date('2026-03-29'),
    content: `
      <h2>We Have a Domain: FinPlanner is Official!</h2>
      <p>We are thrilled to announce that Financial Planner now has a permanent home. You can now access the application at <strong><a href="https://finplanner.ska97homelab.uk" target="_blank">https://finplanner.ska97homelab.uk</a></strong>. This marks a major milestone in our journey to provide a premium, professional-grade financial management tool.</p>

      <h2>Navigation & Search: Faster, Fluid, Intuitive</h2>
      <p>Version 4.6.0 focuses on the small details that make a big difference in daily usage. We have added <strong>"Back to Dashboard"</strong> navigation points directly within the Accounts and Transactions views, ensuring you are never more than a single click away from your financial high-level overview.</p>

      <p>Managing multiple financial accounts is now easier than ever. We've introduced a <strong>Unified Month-Year Picker</strong> across all transaction views—from the global dashboard to individual account pages. This allows you to filter your entire financial history with a single, intuitive date selector. We've also extended our <strong>Advanced Filtering</strong> (Search, Month, Year, and Category) to individual account views, ensuring you have the same powerful tools whether viewing a unified global list or drilling down into a specific bank account.</p>

      <h2>Performance: On-Demand Financial Intelligence</h2>
      <p>To ensure peak performance, we've implemented <strong>On-Demand Search</strong>—simply press Enter or click the search icon to fetch results. This significantly reduces background API traffic and keeps the interface snappy even with thousands of records. We've also included a quick <strong>Reset</strong> button to clear your search and return to the full view instantly.</p>

      <h2>Transactions: Stability & Comprehensive Summaries</h2>
      <p>We have overhauled the <strong>Transactions engine</strong> to ensure a consistent experience. Whether you are on the main transactions page or viewing a specific account, the summary cards now dynamically recalculate to show the <strong>Total Income</strong>, <strong>Total Expenditure</strong>, and the new <strong>Closing Balance</strong> for your exact selected month and year. By implementing robust re-entrancy guards and smarter event-driven lazy loading, we have eliminated infinite loading cycles, ensuring your data loads instantly every time.</p>

      <h2>Bulk Entry & UI Polish</h2>
      <p>The <strong>Bulk Transaction Add page</strong> continues to evolve as a powerful analytical tool, with real-time session summaries for Income, Expenditure, and Net Amount. From fixing category dropdown bindings to refining the Excel-style grid responsiveness and ensuring <strong>Z-Index Harmony</strong> across all modals, v4.6.0 delivers our most polished and performant experience yet.</p>
    `
  },
  {
    id: 'v4-5-0-release',
    tag: 'v4.5.0',
    tagColor: '#10b981',
    title: 'v4.5.0 — Unified Transactions, Bulk Entry & Advanced Security',
    excerpt: 'Our biggest update yet: a unified transactions engine with smart filtering, an advanced bulk entry grid with Excel support, and a complete security overhaul.',
    date: 'Mar 18, 2026',
    _dateValue: new Date('2026-03-18'),
    content: `
      <h2>A New Way to View Your Finances</h2>
      <p>Version 4.5.0 introduces the <strong>Unified Transactions Page</strong>. No more clicking through individual accounts to see your spending. Our new engine queries your entire financial history in a single pass, providing a comprehensive month-by-month view with advanced category filtering.</p>

      <h2>Power Features in v4.5.0</h2>
      <ul>
        <li><strong>Unified Dashboard:</strong> Real-time summary cards for Balance Brought Forward, Total Income, Total Expenditure, Monthly Savings, and <strong>Closing Balance</strong> — all calculated across all your accounts and respecting your current filters.</li>
        <li><strong>Direct Row Actions:</strong> Edit or Delete transactions directly from the unified list without leaving the page.</li>
        <li><strong>Bulk Add Entry:</strong> A new entry point in the toolbar lets you jump straight into the advanced bulk entry grid.</li>
        <li><strong>Excel-Grade Bulk Entry:</strong> The Bulk Transaction Add page now supports direct Excel/CSV imports with intelligent matching.</li>
        <li><strong>Soft Delete Engine:</strong> Deleting accounts or transactions now uses a "soft delete" pattern, preserving your historical financial integrity.</li>
      </ul>

      <h2>Security First: The v16 Upgrade</h2>
      <p>Infrastructure security is our top priority. In this release, we have upgraded the backend to <strong>AutoMapper v16.1.1</strong>, resolving high-severity vulnerabilities (NU1903) and ensuring your data orchestration is handled by the safest possible libraries.</p>

      <h2>Lightning Fast Performance</h2>
      <p>We\'ve refactored the entire frontend to use <strong>Full Lazy-Loading</strong>. Every feature module, from Transactions to Settings, now loads only when you need it. This significantly reduces the initial bundle size and makes the application feel snappier than ever.</p>

      <h2>Development Resilience</h2>
      <p>Finally, we\'ve made the development environment more robust. The backend now supports a <strong>Resilient Caching Fallback</strong>. If Redis is unavailable (common in local setups), the system automatically degrades to in-process Memory Caching without crashing, ensuring a smooth "out of the box" experience for contributors.</p>
    `
  },
  {
    id: 'v4-3-0-release',
    tag: 'v4.3.0',
    tagColor: '#38bdf8',
    title: 'v4.3.0 — Robust Backend Wake-up & Console Cleanup',
    excerpt: 'Improving infrastructure resilience with a robust backend retry mechanism, a premium splash screen hint system, and a complete cleanup of frontend logs.',
    date: 'Mar 10, 2026',
    _dateValue: new Date('2026-03-10'),
    content: `
      <h2>The Render Cold Start Challenge</h2>
      <p>Deploying on Render\'s free tier brings a unique challenge: the backend spins down after inactivity and can take up to 60 seconds to wake up. Version 4.3.0 introduces a robust "holding" pattern to ensure a smooth transition for users during these cold starts.</p>

      <h2>Robust Infrastructure Resilience</h2>
      <ul>
        <li><strong>Smart Retry Mechanism:</strong> The application now performs up to 15 health check attempts with a 3-second delay, providing a full minute of coverage for server initialization.</li>
        <li><strong>Connection Guard:</strong> A new "Server Connection Required" dialog prevents the application from loading into a broken state if the backend is persistently unavailable, offering a manual Retry option.</li>
        <li><strong>Informative Loading:</strong> Added a delayed hint to the initial splash screen that appears after 20 seconds, explaining the cold start process to manage user expectations perfectly.</li>
      </ul>

      <h2>Runtime Responsiveness</h2>
      <p>It\'s not just about the initial load. Our new <strong>Status Interceptor</strong> monitors HTTP response times during active sessions. If a request takes more than 2 seconds (indicating a backend spin-up), a "Backend is warming up" progress bar appears at the top of the interface.</p>

      <h2>Code Professionalism: Console Cleanup</h2>
      <p>To provide a more production-ready experience, we have conducted a full sweep of the frontend codebase, removing all <code>console.log</code>, <code>console.warn</code>, and <code>console.error</code> calls. Debugging focus has been shifted to the server-side logs, resulting in a perfectly clean and professional developer console in the browser.</p>
    `
  },
  {
    id: 'v4-2-0-release',
    tag: 'v4.2.0',
    tagColor: '#38bdf8',
    title: 'v4.2.0 — Budgets, Recurring Transactions & Sorting Fixes',
    excerpt: 'A major stability and feature update: server-side paging/sorting for Budgets and Recurring Transactions, fixed category sorting, and bulk entry refinements.',
    date: 'Mar 8, 2026',
    _dateValue: new Date('2026-03-08'),
    content: `
      <h2>What Ships in v4.2.0</h2>
      <p>Version 4.2.0 is now live across the entire stack. This release focuses on bringing the new Budget and Recurring Transaction modules to parity with the rest of the application, while resolving critical UI and sorting bugs reported by the community.</p>

      <h2>Budgets & Recurring Transactions Maturity</h2>
      <p>The Budgets and Recurring Transactions modules now support full server-side pagination, global search, and dynamic sorting. This ensures that even with hundreds of budget templates or recurring entries, the interface remains lightning fast.</p>
      <ul>
        <li><strong>Paginated Search:</strong> Both modules now use the <code>[HttpPost("search")]</code> pattern, allowing for efficient backend filtering.</li>
        <li><strong>Dynamic Sorting:</strong> Sort by Category, Account, Amount, or Next Process Date directly from the column headers.</li>
      </ul>

      <h2>The Sorting Fix</h2>
      <p>We addressed a common point of friction where sorting by "Category" or "Account" in the main tables wasn\'t responding correctly. This was due to a field name mismatch between the frontend (<code>accountCategoryName</code>, <code>categoryName</code>) and the backend (<code>category</code>). The backend services for Accounts and Transactions have been updated to explicitly handle these frontend-driven field names.</p>

      <h2>Bulk Entry Reliability</h2>
      <p>A critical bug in the <strong>Bulk Transaction Add</strong> page was resolved. Previously, transactions marked as "Income" (internal value 0) were occasionally flagged as invalid during the pre-save check. The validation logic has been updated to correctly handle falsy numeric values, ensuring all valid entries persist on the first click.</p>

      <h2>UI & UX Refinements</h2>
      <ul>
        <li><strong>Compact Layouts:</strong> Vertical spacing and gaps in popup forms (Budgets, Recurring Transactions) have been reduced by 25% for a more premium, minimalistic feel.</li>
        <li><strong>Accounts API Fix:</strong> Resolved a 404 error during form initialization by adding a dedicated <code>GET /api/Accounts</code> endpoint to fetch all active accounts for dropdowns.</li>
        <li><strong>Z-Index Harmony:</strong> Success toasts and confirmation modals now layer correctly above all other elements.</li>
      </ul>
    `
  },
  {
    id: 'dashboard-deep-insights',
    tag: 'v4.0.0',
    tagColor: '#38bdf8',
    title: 'v4.0.0 — Deep Insights Panel & Global Date Filtering',
    excerpt: 'The biggest dashboard release yet: an interactive Deep Insights panel with glass-morphic design, global month/year filtering, and an upgraded doughnut chart.',
    date: 'Mar 6, 2026',
    _dateValue: new Date('2026-03-06'),
    content: `
      <h2>What Ships in v4.0.0</h2>
      <p>Version 4.0.0 is the current stable release, with the version declared in both <code>environment.ts</code> (<code>appVersion: '4.0.0'</code>) on the frontend and <code>VersionPrefix: 4.0.0</code> in the backend API project. This release focused entirely on the Dashboard experience.</p>

      <h2>Deep Insights Panel</h2>
      <p>A new glass-morphic panel sits directly below the summary cards, powered by a single optimised backend endpoint (<code>GET /api/dashboard/insights</code>) that aggregates your entire transaction history in one query pass. Four analytical lenses are available via toggle buttons:</p>
      <ul>
        <li><strong>💰 Amount:</strong> Instantly surface the top 5 highest or lowest transactions. Click the same button again to flip the sort direction — no page reload, just Angular Signal reactivity.</li>
        <li><strong>📅 Timeline:</strong> See your 5 most recent or oldest recorded transactions — useful for confirming imports landed correctly.</li>
        <li><strong>🏷️ Category Extremes:</strong> Which spending categories have the highest or lowest maximum single transaction.</li>
        <li><strong>🏦 Account Extremes:</strong> Same power, scoped to your financial accounts.</li>
      </ul>

      <h2>Global Month/Year Selector</h2>
      <p>A single <code>p-datepicker</code> at the top of the Dashboard now controls all three data streams simultaneously: Summary Cards, Spending by Category Chart, and the Deep Insights panel. All endpoints accept optional <code>?startDate=&endDate=</code> parameters added in this release — omitting them returns all-time data.</p>

      <h2>Doughnut Chart Upgrade</h2>
      <p>The basic pie chart was replaced with a Chart.js doughnut chart (<code>cutout: '70%'</code>) with seven hardcoded hex colour slices (Blue, Purple, Teal, Orange, Pink, Cyan, Indigo), lighter hover variants, <code>borderRadius: 6</code> rounded edges, animated entry, right-aligned legend, and theme-aware tooltips. Chart options are initialised in <code>ngOnInit</code> with a 50ms delay to ensure CSS variable resolution is complete before Chart.js reads colours.</p>

      <h2>Bulk Excel Transaction Add</h2>
      <p>Also ships in v4.0.0: the interactive Bulk Transaction Add page — an HTML table styled like a spreadsheet with sticky column headers, per-row validation, account/category auto-complete, Transfer type support (adds a Destination Account column dynamically), Excel/CSV import, and partial-save logic so valid rows persist even if individual rows fail.</p>
    `
  },
  {
    id: 'master-budget',
    tag: 'Guide',
    tagColor: '#10b981',
    title: '5 Steps to Master Your Monthly Budget',
    excerpt: 'Learn practical budgeting techniques that actually stick — from auditing last month to the 5-minute monthly review ritual.',
    date: 'Mar 1, 2026',
    _dateValue: new Date('2026-03-01'),
    content: `
      <h2>Why Most Budgets Fail</h2>
      <p>Most people abandon a budget within two weeks — not from lack of discipline, but because the budget wasn't connected to real spending data. Financial Planner is built to close that gap by making your actual numbers visible and actionable.</p>

      <h2>Step 1: Audit Last Month First</h2>
      <p>Open the Dashboard, set the Month/Year filter to last month, and look at the Spending by Category doughnut chart. Note the three biggest slices — those are your starting points. Never build a budget without knowing where money actually went first.</p>

      <h2>Step 2: Bucket Into Needs, Wants, Savings (50/30/20)</h2>
      <ul>
        <li><strong>50% Needs:</strong> Rent, groceries, utilities, transport, insurance.</li>
        <li><strong>30% Wants:</strong> Dining out, entertainment, subscriptions, holidays.</li>
        <li><strong>20% Savings/Investments:</strong> Emergency fund, retirement, investments.</li>
      </ul>

      <h2>Step 3: Build an Emergency Cushion First</h2>
      <p>Create a dedicated Savings account and record all transfers to it as Transfer transactions (not Expenses) so they don't inflate your expense totals. Target: 3–6 months of essential expenses.</p>

      <h2>Step 4: Log Every Transaction — Even Small Ones</h2>
      <p>Use Bulk Transaction Add to log a week's worth in one sitting. Small frequent purchases become visible on the Dashboard chart — and seeing them is often enough to change the habit.</p>

      <h2>Step 5: Review on the 1st of Every Month</h2>
      <ol>
        <li>Did total expenses exceed total income?</li>
        <li>Did any savings transfer happen?</li>
        <li>What is the single largest "Want" category that could be trimmed?</li>
      </ol>
      <p>The Dashboard date filter makes this monthly ritual take under five minutes.</p>
    `
  },
  {
    id: 'bulk-excel-transactions',
    tag: 'Feature',
    tagColor: '#0ea5e9',
    title: 'Bulk Transaction Add: Excel-Like Mass Entry',
    excerpt: 'Replacing one-by-one form entry with a full interactive grid — import, validate, auto-suggest, and save dozens of transactions at once.',
    date: 'Feb 25, 2026',
    _dateValue: new Date('2026-02-25'),
    content: `
      <h2>Motivation</h2>
      <p>Adding transactions one form at a time is painful when catching up on a week of expenses or returning from a trip. The Bulk Transaction Add page removes all of that friction.</p>

      <h2>The Grid Layout</h2>
      <p>Each row in the HTML grid is a pending transaction with columns for Date, Account, Category, Type, Amount, and Description — styled to look and feel like Excel. When the Transfer type is selected, a Destination Account column appears dynamically on that row only.</p>

      <h2>Excel/CSV Import</h2>
      <p>Users with exported bank statements can upload an <code>.xlsx</code> or <code>.csv</code> file. The parser maps column headers to grid fields, pre-populates all rows, and runs instant validation — giving a clear preview before committing.</p>

      <h2>Row-Level Status Indicators</h2>
      <ul>
        <li>🟢 Green check — valid and ready.</li>
        <li>🟡 Yellow triangle — missing required fields.</li>
        <li>🔴 Red circle — backend rejected this row.</li>
        <li>🔵 Blue spinner — currently saving.</li>
      </ul>
      <p>The Save action runs each valid row in parallel. Failed rows remain editable and highlighted — valid rows have already been persisted so you never lose progress.</p>

      <h2>Sticky Column Headers</h2>
      <p>Headers use <code>position: sticky; top: 0; z-index: 20</code> with a fully opaque background so column labels stay fixed and legible while data rows scroll underneath — identical to a frozen header row in Excel.</p>
    `
  },
  {
    id: 'master-record-manager',
    tag: 'Feature',
    tagColor: '#10b981',
    title: 'Master Record Manager: Soft Delete, Toggles & Audit Logging',
    excerpt: 'Per-record saves, active/inactive toggles, soft delete with is_deleted, and smarter audit logging that only writes when data actually changes.',
    date: 'Feb 25, 2026',
    _dateValue: new Date('2026-02-25'),
    content: `
      <h2>The Problem with Bulk Save</h2>
      <p>The original design queued all edits for a manual "Update on Server" click — slow, confusing, and error-prone. The new design removes that button entirely. Every single action fires its own immediate API call with instant row-level feedback.</p>

      <h2>Individual Record Updates</h2>
      <ul>
        <li><strong>Inline edit:</strong> Fires on blur from the edited cell.</li>
        <li><strong>Active/Inactive toggle:</strong> Fires immediately on toggle click.</li>
        <li><strong>Delete:</strong> Fires immediately after a confirmation prompt.</li>
      </ul>

      <h2>Soft Delete (is_deleted)</h2>
      <p>Deleting a record sets <code>is_deleted = true</code> rather than physically removing it. Historical transactions that referenced the record remain valid. Records can be recovered by an administrator. The migration scripts were updated to add both <code>is_active</code> and <code>is_deleted</code> columns with sensible defaults.</p>

      <h2>Audit Log Efficiency</h2>
      <p>The upsert stored procedure now compares incoming values against the current row and only writes an audit record when at least one field actually changed — preventing duplicate noise from no-op updates.</p>
    `
  },
  {
    id: 'categories-pro',
    tag: 'Tips',
    tagColor: '#818cf8',
    title: 'How to Categorize Transactions Like a Pro',
    excerpt: 'Granular categories unlock the full power of the Dashboard doughnut chart — here is how to structure them for maximum insight.',
    date: 'Feb 20, 2026',
    _dateValue: new Date('2026-02-20'),
    content: `
      <h2>Two Category Systems</h2>
      <ul>
        <li><strong>Transaction Categories:</strong> Where money went (Dining Out, Groceries, Fuel, Salary, Subscriptions).</li>
        <li><strong>Account Categories:</strong> What kind of container holds the money (Current Account, Savings, Credit Card, Cash, Investment).</li>
      </ul>

      <h2>The Transfer Category Trick</h2>
      <p>Record inter-account movements as <strong>Transfer</strong> transactions — not Expenses. Financial Planner creates two linked entries (debit + credit) and excludes both from the "Total Expenses" dashboard card. This prevents artificially inflating your expense totals every time you top up your savings account.</p>

      <h2>Pro Tips</h2>
      <ul>
        <li><strong>Naming conventions:</strong> "Food › Dining Out" and "Food › Groceries" create implicit groupings without needing a formal sub-category system.</li>
        <li><strong>One-Off category:</strong> Tag unusual non-recurring expenses (car repair, holiday) as One-Off to prevent them from skewing your monthly averages.</li>
        <li><strong>Quarterly review:</strong> Rename vague categories and re-tag historical transactions periodically for cleaner charts.</li>
      </ul>
    `
  },
  {
    id: 'jwt-otp-guide',
    tag: 'Security',
    tagColor: '#ef4444',
    title: 'Why We Use JWT + OTP Authentication',
    excerpt: 'A plain-English explanation of how HTTP-Only cookies, refresh token rotation, and email OTP keep your financial data safe.',
    date: 'Feb 15, 2026',
    _dateValue: new Date('2026-02-15'),
    content: `
      <h2>The Threat Model</h2>
      <p>Financial data is among the most sensitive personal information a web app can handle. Our authentication system was designed with three primary threats in mind: stolen passwords, Cross-Site Scripting (XSS token theft), and abandoned sessions on shared devices.</p>

      <h2>JWT + Refresh Token Architecture</h2>
      <ul>
        <li><strong>Short-lived Access Token (JWT):</strong> Expires quickly — limits damage if intercepted.</li>
        <li><strong>Long-lived Refresh Token:</strong> 32 cryptographic random bytes, stored in PostgreSQL. Automatically rotated on every use.</li>
        <li><strong>One token per IP:</strong> Only one active refresh token per device IP is permitted — a new token from the same IP removes the old one.</li>
      </ul>

      <h2>Email OTP for Registration & Password Reset</h2>
      <p>All OTPs are generated via <code>RandomNumberGenerator.GetInt32()</code> (cryptographically secure), stored in Redis with a 10-minute TTL, and immediately deleted after successful use. The password reset flow never confirms whether an email exists (prevents enumeration attacks).</p>

      <h2>Idle Timeout & Cross-Tab Sync</h2>
      <p>The <code>IdleTimerService</code> auto-logs out after inactivity. The <code>SessionSyncService</code> uses the native <code>BroadcastChannel API</code> to sync logout events across all open browser tabs instantly.</p>
    `
  },
  {
    id: 'account-management',
    tag: 'Guide',
    tagColor: '#f59e0b',
    title: 'Managing Multiple Accounts in Financial Planner',
    excerpt: 'Bank accounts, wallets, credit cards — here is how to structure multiple accounts for maximum clarity and accurate balance tracking.',
    date: 'Feb 10, 2026',
    _dateValue: new Date('2026-02-10'),
    content: `
      <h2>The Account Model</h2>
      <p>An Account represents any financial container — bank account, digital wallet, cash envelope, credit card, or investment portfolio. The platform is intentionally agnostic to the institution; it cares only that you want to track the balance inside.</p>

      <h2>Setting an Opening Balance</h2>
      <p>When creating a new account, enter its real-world balance at that moment. Every transaction recorded thereafter adjusts this mathematically — Financial Planner never guesses your balance.</p>

      <h2>Inter-Account Transfers</h2>
      <p>Paying off a credit card from your current account? Record it as a Transfer transaction. Two linked entries are created (debit from source, credit to destination) and both are excluded from your expense totals — so your Dashboard always shows money that actually left your possession, not self-directed movements.</p>
    `
  },
  {
    id: 'glassmorphism-ui',
    tag: 'Update',
    tagColor: '#f59e0b',
    title: 'Glassmorphism UI & Dark Mode: The Visual Overhaul',
    excerpt: 'How the public site, authenticated app, and every component were redesigned with a glass aesthetic and seamless light/dark mode switching.',
    date: 'Oct 6, 2025',
    _dateValue: new Date('2025-10-06'),
    content: `
      <h2>Glassmorphism Design Language</h2>
      <ul>
        <li><code>.glass-card</code>: <code>backdrop-filter: blur(24px)</code>, semi-transparent background, 1px semi-opaque border.</li>
        <li><code>.block-orbs</code>: Three slow-drifting animated gradient blobs for depth without distraction.</li>
        <li><code>.gradient-text</code>: App logo and accent headings use a green-to-sky-blue CSS gradient clip effect.</li>
      </ul>

      <h2>Light & Dark Mode</h2>
      <p>The <code>ThemeService</code> toggles PrimeNG's stylesheet between <code>lara-light-blue</code> and <code>lara-dark-blue</code> and persists the choice to <code>localStorage</code>. All custom CSS tokens update immediately — ensuring every UI primitive follows the active theme automatically.</p>

      <h2>Public Site</h2>
      <p>The public site at <code>/</code> (Home, Features, Blog, About, Contact) shares the same design system with a sticky frosted-glass navigation header, animated orb backgrounds, and glass cards.</p>
    `
  },
  {
    id: 'auth-system',
    tag: 'Security',
    tagColor: '#ef4444',
    title: 'Auth System Deep Dive: OTP Registration, JWT & Refresh Token Rotation',
    excerpt: 'A full breakdown of the two-step OTP-verified registration, concurrent session detection, refresh token rotation, and the complete forgot/reset password flow.',
    date: 'Oct 4, 2025',
    _dateValue: new Date('2025-10-04'),
    content: `
      <h2>Two-Step OTP Registration</h2>
      <ol>
        <li><strong>Initiate:</strong> User submits credentials. The server stores the payload in <strong>Redis with a 10-minute TTL</strong> and sends a 6-digit OTP to the email address.</li>
        <li><strong>Verify:</strong> The user enters the OTP. Server validates it, retrieves the cached payload, creates the user via ASP.NET Core Identity, sets <code>EmailConfirmed = true</code>, and deletes the Redis keys.</li>
      </ol>

      <h2>Login & Concurrent Session Detection</h2>
      <p>Every login checks <code>user.CurrentSessionId</code>. If a session is already active and <code>ForceLogin</code> is false, the API returns a <code>Auth.ConcurrentLogin</code> error. The frontend prompts: <em>"You are already logged in on another device. Do you want to continue here?"</em></p>

      <h2>Refresh Token Rotation</h2>
      <p>On every token refresh: the old token is immediately revoked, a new token is issued, all expired tokens are pruned, and one-token-per-IP is enforced.</p>

      <h2>Forgot Password Flow</h2>
      <ol>
        <li>User submits email → 6-digit OTP stored in Redis with 10-minute TTL → styled HTML email dispatched.</li>
        <li>User enters OTP → validated against Redis.</li>
        <li>User enters new password → hashed and saved via <code>UserManager.ResetPasswordAsync()</code> → Redis key deleted to prevent replay.</li>
      </ol>
      <p>The API never reveals whether an email exists — preventing enumeration attacks.</p>
    `
  },
  {
    id: 'accounts-categories',
    tag: 'Feature',
    tagColor: '#10b981',
    title: 'Accounts & Categories: Structuring Your Financial World',
    excerpt: 'How the account and category systems work — and the elegant generic patterns that power them without code duplication.',
    date: 'Oct 4, 2025',
    _dateValue: new Date('2025-10-04'),
    content: `
      <h2>Account Categories & Accounts</h2>
      <p>Users first create <strong>Account Categories</strong> (Current Account, Savings, Credit Card, Cash Wallet, etc.), then create <strong>Accounts</strong> assigned to those categories. Every Account stores a live <code>Balance</code> that the <code>TransactionService</code> adjusts automatically on every create, update, and delete.</p>

      <h2>The ResourcePage Pattern</h2>
      <p>Rather than creating a separate list, create, edit, and delete page for every entity, a single reusable <code>ResourcePage</code> component accepts configuration via Angular's route <code>data</code> property. One component handles Accounts, Account Categories, and Transaction Categories — saving hundreds of lines of duplicated view code.</p>

      <h2>Generic CRUD Service</h2>
      <p>The <code>GenericCrudService</code> provides typed <code>getAll()</code>, <code>create()</code>, <code>update()</code>, and <code>delete()</code> methods wired to any REST endpoint string. All list pages share this single service — no duplicated HTTP logic.</p>
    `
  },
  {
    id: 'project-genesis',
    tag: 'Architecture',
    tagColor: '#64748b',
    title: 'Project Genesis: The Technology Blueprint',
    excerpt: 'Before any feature was built, we designed the data model, chose the stack, and locked in Clean Architecture as the structural foundation.',
    date: 'Sep 25, 2025',
    _dateValue: new Date('2025-09-25'),
    content: `
      <h2>The Stack</h2>
      <p>Financial Planner runs on <strong>Angular 18+</strong> (Standalone Components, Signals, OnPush) on the frontend and <strong>ASP.NET Core (.NET 10)</strong> with Clean Architecture on the backend. PostgreSQL is the primary data store, Redis handles ephemeral data (OTPs, pending registrations) with automatic TTL expiry. Current version across both projects: <strong>4.0.0</strong>.</p>

      <h2>Clean Architecture Layers</h2>
      <ul>
        <li><strong>Domain:</strong> Pure C# entities — no framework dependencies.</li>
        <li><strong>Application:</strong> Service interfaces, business logic, DTOs, validators.</li>
        <li><strong>Infrastructure:</strong> EF Core, email, Redis.</li>
        <li><strong>Presentation:</strong> ASP.NET Core controllers — thin HTTP orchestration only.</li>
      </ul>

      <h2>Frontend Principles</h2>
      <ul>
        <li>Standalone components everywhere — no NgModules.</li>
        <li>Signals for all state — no <code>BehaviorSubject</code> in components.</li>
        <li><code>OnPush</code> change detection on every component.</li>
        <li>Fully <strong>lazy-loaded routes</strong> — every feature loads on demand via <code>loadComponent()</code>.</li>
        <li><strong>GenericCrudService</strong> — one typed service handles CRUD for any entity.</li>
        <li><strong>ResourcePage</strong> — one generic list component driven by route <code>data</code> config.</li>
      </ul>
    `
  }
];

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './blog.html',
})
export class Blog implements OnInit {
  private blogLoader = inject(BlogLoaderService);
  auth = inject(Auth);
  sortAscending = signal(false); // default: newest first (descending)
  posts = signal<any[]>([]);

  searchQuery = signal('');
  selectedTag = signal('All');
  currentPage = signal(1);
  pageSize = signal(6);
  totalItems = signal(0);
  isLoading = signal(false);

  availableTags = ['All', 'Guide', 'Release', 'Security', 'Feature', 'Architecture'];

  async ngOnInit(): Promise<void> {
    await this.loadServerSide();
  }

  async loadServerSide(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.blogLoader.loadPaged(
        this.currentPage(),
        this.pageSize(),
        this.searchQuery(),
        this.selectedTag(),
        this.auth.isAdmin()
      );

      if (res.items && res.items.length > 0) {
        const mapped = res.items.map(m => ({
          id: m.slug || m.id,
          tag: m.tag || (m.isPublished === false ? 'Draft' : (m.slug && m.slug.includes('release')) ? 'Release' : 'Guide'),
          tagColor: m.tagColor || (m.isPublished === false ? '#f59e0b' : (m.slug && m.slug.includes('release')) ? '#6366f1' : '#10b981'),
          title: m.title,
          excerpt: m.excerpt,
          isPublished: m.isPublished ?? true,
          date: m.publishedAt ? new Date(m.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Draft',
          _dateValue: m.publishedAt ? new Date(m.publishedAt) : new Date()
        }));
        this.posts.set(mapped);
        this.totalItems.set(res.totalCount);
      } else {
        // Fallback to client filtered static list if DB returned 0
        const query = this.searchQuery().toLowerCase().trim();
        const tag = this.selectedTag();
        const filtered = BLOG_POSTS.filter(p => {
          const matchesSearch = !query || p.title.toLowerCase().includes(query) || p.excerpt.toLowerCase().includes(query);
          const matchesTag = tag === 'All' || p.tag.toLowerCase().includes(tag.toLowerCase()) || (tag === 'Release' && p.id.includes('release'));
          return matchesSearch && matchesTag;
        });
        const start = (this.currentPage() - 1) * this.pageSize();
        this.posts.set(filtered.slice(start, start + this.pageSize()));
        this.totalItems.set(filtered.length);
      }
    } catch {
      // Fallback
      this.posts.set(BLOG_POSTS.slice(0, this.pageSize()));
      this.totalItems.set(BLOG_POSTS.length);
    } finally {
      this.isLoading.set(false);
    }
  }

  filteredPosts = computed(() => {
    const asc = this.sortAscending();
    return [...this.posts()].sort((a, b) =>
      asc
        ? a._dateValue.getTime() - b._dateValue.getTime()
        : b._dateValue.getTime() - a._dateValue.getTime()
    );
  });

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  paginatedPosts = computed(() => this.filteredPosts());

  setTag(tag: string): void {
    this.selectedTag.set(tag);
    this.currentPage.set(1);
    this.loadServerSide();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadServerSide();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadServerSide();
    }
  }

  toggleSort(): void {
    this.sortAscending.update(v => !v);
  }
}
