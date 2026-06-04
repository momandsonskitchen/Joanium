import { formatGoogleDate, requireParam } from '../../../Common.js';

export { requireParam };
export const formatDate = formatGoogleDate;

function formatDueDate(dueDate = {}, dueTime = {}) {
  if (!dueDate.year) return '';
  const date = [
    String(dueDate.year).padStart(4, '0'),
    String(dueDate.month ?? 1).padStart(2, '0'),
    String(dueDate.day ?? 1).padStart(2, '0'),
  ].join('-');
  const time =
    null == dueTime.hours
      ? ''
      : ` ${dueTime.hours}:${String(dueTime.minutes ?? 0).padStart(2, '0')}`;
  return `${date}${time}`;
}

function profileName(profile = {}) {
  const joinedName = [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ');
  return profile.name?.fullName || joinedName || profile.emailAddress;
}

export function formatCourse(course, index = '') {
  const label = index ? `${index}. ` : '';

  return [
    `${label}**${course.name ?? 'Untitled course'}**`,
    course.section ? `Section: ${course.section}` : '',
    course.id ? `ID: \`${course.id}\`` : '',
    course.courseState ? `State: ${course.courseState}` : '',
    course.alternateLink ? `Link: ${course.alternateLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatCourseWork(item, index = '') {
  const label = index ? `${index}. ` : '';
  const due = formatDueDate(item.dueDate, item.dueTime);

  return [
    `${label}**${item.title ?? 'Untitled coursework'}**`,
    item.id ? `ID: \`${item.id}\`` : '',
    item.workType ? `Type: ${item.workType}` : '',
    item.state ? `State: ${item.state}` : '',
    due ? `Due: ${due}` : '',
    item.maxPoints ? `Max points: ${item.maxPoints}` : '',
    item.alternateLink ? `Link: ${item.alternateLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatCourseMaterial(material, index = '') {
  const label = index ? `${index}. ` : '';

  return [
    `${label}**${material.title ?? 'Untitled material'}**`,
    material.id ? `ID: \`${material.id}\`` : '',
    material.state ? `State: ${material.state}` : '',
    material.updateTime ? `Updated: ${formatDate(material.updateTime)}` : '',
    material.alternateLink ? `Link: ${material.alternateLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatPerson(person, index = '') {
  const label = index ? `${index}. ` : '';
  const profile = person.profile ?? {};

  return [
    `${label}**${profileName(profile) ?? 'Unknown'}**`,
    person.userId ? `User ID: \`${person.userId}\`` : '',
    profile.emailAddress ? `Email: ${profile.emailAddress}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatSubmission(submission, index = '') {
  const label = index ? `${index}. ` : '';

  return [
    `${label}**Submission ${submission.id ?? ''}**`,
    submission.userId ? `User ID: \`${submission.userId}\`` : '',
    submission.state ? `State: ${submission.state}` : '',
    null != submission.assignedGrade ? `Assigned grade: ${submission.assignedGrade}` : '',
    null != submission.draftGrade ? `Draft grade: ${submission.draftGrade}` : '',
    submission.updateTime ? `Updated: ${formatDate(submission.updateTime)}` : '',
    submission.alternateLink ? `Link: ${submission.alternateLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
