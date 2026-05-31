import * as MeetAPI from '../API/MeetAPI.js';
import { requireGoogleCredentials } from '../../../Common.js';
import {
  formatConferenceRecord,
  formatMeetSpace,
  formatParticipant,
  formatRecording,
  requireParam,
} from './Utils.js';

export async function executeMeetChatTool(ctx, toolName, params = {}) {
  const credentials = requireGoogleCredentials(ctx);

  switch (toolName) {
    case 'meet_create_space': {
      const space = await MeetAPI.createSpace(credentials, {
        accessType: params.access_type?.trim(),
        entryPointAccess: params.entry_point_access?.trim(),
      });
      return ['Google Meet space created.', '', formatMeetSpace(space)].join('\n');
    }

    case 'meet_get_space': {
      const space = await MeetAPI.getSpace(credentials, requireParam(params, 'space_name'));
      return formatMeetSpace(space);
    }

    case 'meet_list_conference_records': {
      const records = await MeetAPI.listConferenceRecords(credentials, {
        pageSize: params.max_results ?? 25,
        filter: params.filter?.trim() ?? '',
      });

      return records.length
        ? `Google Meet conference records (${records.length}):\n\n${records
            .map((record, index) => formatConferenceRecord(record, index + 1))
            .join('\n\n')}`
        : 'No Google Meet conference records found.';
    }

    case 'meet_get_conference_record': {
      const record = await MeetAPI.getConferenceRecord(
        credentials,
        requireParam(params, 'conference_record_name'),
      );
      return formatConferenceRecord(record);
    }

    case 'meet_list_participants': {
      const recordName = requireParam(params, 'conference_record_name');
      const participants = await MeetAPI.listParticipants(credentials, recordName, {
        pageSize: params.max_results ?? 25,
      });

      return participants.length
        ? `Google Meet participants (${participants.length}):\n\n${participants
            .map((participant, index) => formatParticipant(participant, index + 1))
            .join('\n\n')}`
        : `No participants found for \`${recordName}\`.`;
    }

    case 'meet_list_recordings': {
      const recordName = requireParam(params, 'conference_record_name');
      const recordings = await MeetAPI.listRecordings(credentials, recordName, {
        pageSize: params.max_results ?? 25,
      });

      return recordings.length
        ? `Google Meet recordings (${recordings.length}):\n\n${recordings
            .map((recording, index) => formatRecording(recording, index + 1))
            .join('\n\n')}`
        : `No recordings found for \`${recordName}\`.`;
    }

    default:
      throw new Error(`Unknown Google Meet tool: ${toolName}`);
  }
}
