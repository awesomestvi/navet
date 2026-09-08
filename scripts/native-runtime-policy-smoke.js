// Native NJS smoke checks. Run through check-native-runtime-policies.mjs.
import fs from 'fs';
import occurrence from '../docker/njs/chore-occurrence-policy.js';
import calendar from '../docker/njs/chore-calendar-policy.js';
import resource from '../docker/njs/resource-host-policy.js';
import credential from '../docker/shared/credential-policy.js';
import profile from '../docker/shared/dashboard-profile-policy.js';

var checks = 0;
function equal(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(label + ': ' + JSON.stringify(actual) + ' != ' + JSON.stringify(expected));
  }
  checks++;
}
var vectors = JSON.parse(fs.readFileSync('../packages/core/src/chore-conformance-vectors.json', 'utf8'));
var fixture = vectors.occurrenceFixture;
vectors.occurrenceTransitions.forEach(function (vector) {
  var result;
  var error = null;
  try {
    result = occurrence.applyChoreOccurrenceCommand({
      definition: Object.assign({}, fixture.definition, vector.definition),
      occurrence: Object.assign({}, fixture.occurrence, vector.occurrence),
      command: vector.command,
      timestamp: fixture.timestamp,
      commandId: 'native-njs-conformance'
    });
  } catch (caught) { error = caught.message; }
  equal(error, vector.error, vector.name + ' error');
  if (!error) {
    equal(result.activity.type, vector.event, vector.name + ' event');
    Object.keys(vector.expected).forEach(function(key) {
      var actual = result.occurrence[key];
      equal(actual === undefined ? null : actual, vector.expected[key], vector.name + ' ' + key);
    });
  }
});
equal(calendar.addCalendarDays('2028-02-28', 1), '2028-02-29', 'leap date');
equal(calendar.rotationIndexForDate(['2026-08-03','2026-08-04','2026-08-10'], 2, 'weekly'), 0, 'weekly rotation reset');
equal(calendar.isScheduledOnDate({frequency:'monthly',startDate:'2028-01-01',dayOfMonth:31},'2028-02-29'), true, 'clamp day');
equal(calendar.isScheduledOnDate({frequency:'monthly',startDate:'2028-01-01',nthWeekday:{ordinal:-1,weekday:1},excludedDates:['2028-02-28']},'2028-02-28'), false, 'excluded last weekday');
['127.0.0.1','::1','::ffff:127.0.0.1','0x7f000001','2130706433','[fe80::1]'].forEach(function (address) { equal(resource.isPrivateResourceIpAddress(address),true,address); });
equal(resource.isPrivateResourceIpAddress('8.8.8.8'),false,'public ipv4');
equal(resource.isBlockedResourceHostname('localhost'),true,'localhost');
equal(resource.isAllowedResourceXmlContentType('application/rss+xml; charset=utf-8'),true,'xml');
['//user@example.com/image','/image?%61pi_key=secret','/image#access_token=secret','/image?view=full;password=secret'].forEach(function(url) {equal(credential.isCredentialBearingUrl(url),true,url);});
equal(credential.isCredentialBearingUrl('/image?width=400'),false,'public URL');
var sanitized = profile.sanitizeDashboardProfile({app:'navet',version:3,dashboard:{title:'Kitchen'},access_token:'secret'});
equal(profile.isValidProfile(sanitized),true,'valid sanitized profile');
equal(sanitized.access_token,undefined,'remove credential');
var patched = profile.applyDashboardProfilePatch(sanitized,[{op:'replace',path:'/dashboard/title',value:'Hall'}]);
equal(patched.dashboard.title,'Hall','patch title');
equal(profile.areDashboardProfilesEquivalent(patched,patched),true,'equivalence');
console.log('Native njs ' + njs.version + ': ' + checks + ' policy assertions passed');
