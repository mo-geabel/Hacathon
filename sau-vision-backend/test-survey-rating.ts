/**
 * test-survey-rating.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests how survey (anket) answers affect an organizer's eventRating.
 *
 * Covers:
 *  1. The scoring formula (calculateSurveyScore → 0-100 → /20 → 0-5 rating)
 *  2. Per-question contribution breakdown
 *  3. Multi-respondent averaging (how each new submission shifts the rating)
 *  4. Extreme & edge cases (all 1s, all 5s, single respondent, 10 respondents)
 *
 * Run with:
 *   npx ts-node test-survey-rating.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SURVEY_QUESTIONS, calculateSurveyScore } from './src/config/surveyQuestions';

// ── Helpers ───────────────────────────────────────────────────────────────────

const toRating = (score: number) => parseFloat((score / 20).toFixed(2));

function avgScores(scores: number[]) {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return parseFloat(avg.toFixed(1));
}

function line(char = '─', len = 70) { return char.repeat(len); }

function printScoreBreakdown(answers: Record<string, any>) {
  console.log('\n  Per-question contribution:');
  let totalWeight = 0;
  let weightedSum = 0;

  for (const q of SURVEY_QUESTIONS) {
    if (!q.weight || q.type === 'text') continue;
    const answer = answers[q.id];
    if (answer === undefined || answer === null) continue;

    let normalised = 0;
    if (q.type === 'rating' && q.min !== undefined && q.max !== undefined) {
      normalised = (Number(answer) - q.min) / (q.max - q.min);
    } else if (q.type === 'boolean') {
      normalised = answer === true || answer === 'true' ? 1 : 0;
    }

    const contribution = normalised * q.weight;
    weightedSum += contribution;
    totalWeight += q.weight;

    const answerLabel = q.type === 'boolean'
      ? (answer ? 'YES' : 'NO')
      : `${answer}/5`;

    console.log(
      `    ${q.id.padEnd(18)} answer=${answerLabel.padEnd(6)} `+
      `weight=${(q.weight * 100).toFixed(0).padStart(2)}%  `+
      `normalised=${normalised.toFixed(2)}  `+
      `→ contributes ${(contribution * 100).toFixed(1)} pts`
    );
  }

  const rawScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  console.log(`\n  Weighted sum / total weight = ${weightedSum.toFixed(4)} / ${totalWeight.toFixed(2)}`);
  console.log(`  Raw score (0-100) = ${rawScore}`);
  console.log(`  eventRating (÷20) = ${toRating(rawScore)} / 5.00`);
}

// ── Test Scenarios ─────────────────────────────────────────────────────────────

console.log(line('═'));
console.log('  SAÜ-Vision Survey Rating Test');
console.log(`  Questions: ${SURVEY_QUESTIONS.filter(q => q.type !== 'text').length} scored  |  Weights must sum to 1.0`);
const totalW = SURVEY_QUESTIONS.reduce((s, q) => s + (q.weight ?? 0), 0);
console.log(`  Total weight sum: ${totalW.toFixed(2)}`);
console.log(line('═'));

// ── SCENARIO 1: Perfect score ──────────────────────────────────────────────
console.log('\n📗 SCENARIO 1: All 5-stars + Would Recommend = YES (Perfect)');
const perfect = { organization: 5, content_quality: 5, time_management: 5, engagement: 5, would_recommend: true };
const s1 = calculateSurveyScore(perfect);
console.log(`  Score: ${s1}/100  →  eventRating: ${toRating(s1)}/5.00`);
printScoreBreakdown(perfect);

// ── SCENARIO 2: Worst score ────────────────────────────────────────────────
console.log('\n' + line());
console.log('📕 SCENARIO 2: All 1-stars + Would Recommend = NO (Worst)');
const worst = { organization: 1, content_quality: 1, time_management: 1, engagement: 1, would_recommend: false };
const s2 = calculateSurveyScore(worst);
console.log(`  Score: ${s2}/100  →  eventRating: ${toRating(s2)}/5.00`);
printScoreBreakdown(worst);

// ── SCENARIO 3: Average student feedback ──────────────────────────────────
console.log('\n' + line());
console.log('📘 SCENARIO 3: Typical / Average Feedback');
const average = { organization: 3, content_quality: 3, time_management: 3, engagement: 3, would_recommend: true };
const s3 = calculateSurveyScore(average);
console.log(`  Score: ${s3}/100  →  eventRating: ${toRating(s3)}/5.00`);
printScoreBreakdown(average);

// ── SCENARIO 4: Good but would not recommend ──────────────────────────────
console.log('\n' + line());
console.log('📙 SCENARIO 4: Good ratings but Would Recommend = NO');
const goodNoRec = { organization: 4, content_quality: 5, time_management: 4, engagement: 4, would_recommend: false };
const s4 = calculateSurveyScore(goodNoRec);
console.log(`  Score: ${s4}/100  →  eventRating: ${toRating(s4)}/5.00`);
printScoreBreakdown(goodNoRec);

// ── SCENARIO 5: Multi-respondent average simulation ────────────────────────
console.log('\n' + line());
console.log('📊 SCENARIO 5: How each new submission shifts the organizer\'s eventRating');
console.log('   Simulating 5 students submitting different feedback for the same organizer:\n');

const respondents = [
  { name: 'Student 1', answers: { organization: 5, content_quality: 5, time_management: 5, engagement: 5, would_recommend: true  } },
  { name: 'Student 2', answers: { organization: 4, content_quality: 4, time_management: 3, engagement: 4, would_recommend: true  } },
  { name: 'Student 3', answers: { organization: 2, content_quality: 3, time_management: 2, engagement: 2, would_recommend: false } },
  { name: 'Student 4', answers: { organization: 5, content_quality: 4, time_management: 5, engagement: 5, would_recommend: true  } },
  { name: 'Student 5', answers: { organization: 1, content_quality: 1, time_management: 2, engagement: 1, would_recommend: false } },
];

const cumulativeScores: number[] = [];

for (const r of respondents) {
  const score = calculateSurveyScore(r.answers);
  cumulativeScores.push(score);
  const avg = avgScores(cumulativeScores);
  const rating = toRating(avg);
  const bar = '█'.repeat(Math.round(rating * 4)).padEnd(20);
  console.log(
    `   ${r.name} submits → score=${score.toString().padStart(3)}/100  ` +
    `| cumulative avg=${avg.toFixed(1).padStart(5)}/100  ` +
    `| eventRating=${rating.toFixed(2)}/5.00  ${bar}`
  );
}

// ── SCENARIO 6: Single question impact analysis ───────────────────────────
console.log('\n' + line());
console.log('🔍 SCENARIO 6: What if ONE question changes? (base = all 3/5 + YES)');
console.log('   Shows how much each individual question affects the final eventRating:\n');

const base = { organization: 3, content_quality: 3, time_management: 3, engagement: 3, would_recommend: true };
const baseScore = calculateSurveyScore(base);

// Test bumping each question to 5 (or YES)
const experiments: { label: string; answers: typeof base }[] = [
  { label: 'organization → 5',     answers: { ...base, organization: 5 } },
  { label: 'content_quality → 5',  answers: { ...base, content_quality: 5 } },
  { label: 'time_management → 5',  answers: { ...base, time_management: 5 } },
  { label: 'engagement → 5',       answers: { ...base, engagement: 5 } },
  { label: 'would_recommend → NO', answers: { ...base, would_recommend: false } },
];

console.log(`   Base (all 3/5 + YES): score=${baseScore}/100  eventRating=${toRating(baseScore)}/5.00\n`);

for (const exp of experiments) {
  const expScore = calculateSurveyScore(exp.answers);
  const diff = expScore - baseScore;
  const ratingDiff = toRating(expScore) - toRating(baseScore);
  const sign = diff >= 0 ? '+' : '';
  console.log(
    `   ${exp.label.padEnd(26)} score=${expScore.toString().padStart(3)}/100  ` +
    `Δ score=${sign}${diff}  ` +
    `Δ rating=${sign}${ratingDiff.toFixed(2)}/5.00`
  );
}

console.log('\n' + line('═'));
console.log('  ✅ Test complete. The formula: Score(0-100) ÷ 20 = eventRating(0-5)');
console.log('  The organizer\'s eventRating is the AVERAGE of all feedback scores ever received.');
console.log(line('═') + '\n');
