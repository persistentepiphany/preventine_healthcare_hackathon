/**
 * Test defensive handling of invalid/missing input
 */

import {
  assessUrgency,
  assessHealthCheckEligibility,
  assessScreeningEligibility,
  findMissingMeasurements,
  assessQriskReadiness,
} from './index.js';

console.log('=== Testing Defensive Handling ===\n');

// Test 1: Missing age
console.log('Test 1: Missing age');
try {
  const result = assessHealthCheckEligibility({} as any);
  console.log('✓ No crash. Status:', result.status);
  console.log('  Explanation:', result.explanation);
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 2: Invalid age (negative)
console.log('\nTest 2: Negative age');
try {
  const result = assessHealthCheckEligibility({ age: -5 } as any);
  console.log('✓ No crash. Status:', result.status);
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 3: Invalid age (NaN)
console.log('\nTest 3: NaN age');
try {
  const result = assessHealthCheckEligibility({ age: NaN } as any);
  console.log('✓ No crash. Status:', result.status);
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 4: Missing redFlags (undefined)
console.log('\nTest 4: Missing redFlags');
try {
  const result = assessUrgency({ age: 45 } as any);
  console.log('✓ No crash. Level:', result.level);
  console.log('  Requires emergency:', result.requiresEmergencyServices);
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 5: Invalid redFlags (not an array)
console.log('\nTest 5: Invalid redFlags (not array)');
try {
  const result = assessUrgency({ age: 45, redFlags: 'not_an_array' as any });
  console.log('✓ No crash. Level:', result.level);
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 6: Undefined optional booleans (should be treated as unknown, not false)
console.log('\nTest 6: Undefined boolean (hasCvd)');
try {
  const result = assessHealthCheckEligibility({ age: 45, hasCvd: undefined } as any);
  console.log('✓ No crash. Status:', result.status);
  console.log('  Note: hasCvd=undefined should NOT add to exclusions');
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 7: Screening eligibility with invalid age
console.log('\nTest 7: Screening eligibility with undefined age');
try {
  const result = assessScreeningEligibility({ age: undefined } as any);
  console.log('✓ No crash. Matches:', result.length);
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 8: QRISK readiness with NaN values
console.log('\nTest 8: QRISK readiness with NaN systolic BP');
try {
  const result = assessQriskReadiness({ age: 45, systolicBp: NaN, cholesterolRatio: 4, smoker: false, bmi: 25, sexAtBirth: 'male' } as any);
  console.log('✓ No crash. Ready:', result.ready);
  console.log('  Missing data:', result.missingData);
} catch (e) {
  console.log('✗ Crashed:', e);
}

// Test 9: Missing measurements should handle gracefully
console.log('\nTest 9: Missing measurements with empty input');
try {
  const result = findMissingMeasurements({} as any);
  console.log('✓ No crash. Missing count:', result.length);
} catch (e) {
  console.log('✗ Crashed:', e);
}

console.log('\n=== All defensive tests completed ===');