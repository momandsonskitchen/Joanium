import { formatGoogleDate, requireParam } from '../../../Common.js';

export { requireParam };
export const formatDate = formatGoogleDate;

export function formatUser(user, index = '') {
  const label = index ? `${index}. ` : '';

  return [
    `${label}**${user.name?.fullName ?? user.primaryEmail ?? 'Unknown user'}**`,
    user.primaryEmail ? `Email: ${user.primaryEmail}` : '',
    user.id ? `ID: \`${user.id}\`` : '',
    user.orgUnitPath ? `Org unit: ${user.orgUnitPath}` : '',
    user.isAdmin ? 'Admin: yes' : '',
    user.suspended ? 'Suspended: yes' : '',
    user.lastLoginTime ? `Last login: ${formatDate(user.lastLoginTime)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatGroup(group, index = '') {
  const label = index ? `${index}. ` : '';

  return [
    `${label}**${group.name ?? group.email ?? 'Unknown group'}**`,
    group.email ? `Email: ${group.email}` : '',
    group.id ? `ID: \`${group.id}\`` : '',
    null != group.directMembersCount ? `Members: ${group.directMembersCount}` : '',
    group.description ? `Description: ${group.description}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatMember(member, index = '') {
  const label = index ? `${index}. ` : '';

  return [
    `${label}**${member.email ?? member.id ?? 'Unknown member'}**`,
    member.id ? `ID: \`${member.id}\`` : '',
    member.role ? `Role: ${member.role}` : '',
    member.type ? `Type: ${member.type}` : '',
    member.status ? `Status: ${member.status}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
