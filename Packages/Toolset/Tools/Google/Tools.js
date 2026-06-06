import { ADMIN_DIRECTORY_TOOLS } from './AdminDirectory/Core/Chat/Tools.js';
import { CALENDAR_TOOLS } from './Calendar/Core/Chat/Tools.js';
import { CHAT_TOOLS } from './Chat/Core/Chat/Tools.js';
import { CLASSROOM_TOOLS } from './Classroom/Core/Chat/Tools.js';
import { CONTACTS_TOOLS } from './Contacts/Core/Chat/Tools.js';
import { DOCS_TOOLS } from './Docs/Core/Chat/Tools.js';
import { DRIVE_TOOLS } from './Drive/Core/Chat/Tools.js';
import { FORMS_TOOLS } from './Forms/Core/Chat/Tools.js';
import { GMAIL_TOOLS } from './Gmail/Core/Chat/Tools.js';
import { MEET_TOOLS } from './Meet/Core/Chat/Tools.js';
import { PHOTOS_TOOLS } from './Photos/Core/Chat/Tools.js';
import { SHEETS_TOOLS } from './Sheets/Core/Chat/Tools.js';
import { SLIDES_TOOLS } from './Slides/Core/Chat/Tools.js';
import { TASKS_TOOLS } from './Tasks/Core/Chat/Tools.js';
import { YOUTUBE_TOOLS } from './Youtube/Core/Chat/Tools.js';

export {
  ADMIN_DIRECTORY_TOOLS,
  CALENDAR_TOOLS,
  CHAT_TOOLS,
  CLASSROOM_TOOLS,
  CONTACTS_TOOLS,
  DOCS_TOOLS,
  DRIVE_TOOLS,
  FORMS_TOOLS,
  GMAIL_TOOLS,
  MEET_TOOLS,
  PHOTOS_TOOLS,
  SHEETS_TOOLS,
  SLIDES_TOOLS,
  TASKS_TOOLS,
  YOUTUBE_TOOLS,
};
export const GOOGLE_TOOL_GROUPS = Object.freeze([
  ADMIN_DIRECTORY_TOOLS,
  CALENDAR_TOOLS,
  CHAT_TOOLS,
  CLASSROOM_TOOLS,
  CONTACTS_TOOLS,
  DOCS_TOOLS,
  DRIVE_TOOLS,
  FORMS_TOOLS,
  GMAIL_TOOLS,
  MEET_TOOLS,
  PHOTOS_TOOLS,
  SHEETS_TOOLS,
  SLIDES_TOOLS,
  TASKS_TOOLS,
  YOUTUBE_TOOLS,
]);
export const TOOL_DEFINITIONS = GOOGLE_TOOL_GROUPS.flat();
export default TOOL_DEFINITIONS;
