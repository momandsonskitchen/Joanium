import { CALENDAR_TOOLS } from './Calendar/Core/Chat/Tools.js';
import { CONTACTS_TOOLS } from './Contacts/Core/Chat/Tools.js';
import { DOCS_TOOLS } from './Docs/Core/Chat/Tools.js';
import { DRIVE_TOOLS } from './Drive/Core/Chat/Tools.js';
import { FORMS_TOOLS } from './Forms/Core/Chat/Tools.js';
import { GMAIL_TOOLS } from './Gmail/Core/Chat/Tools.js';
import { PHOTOS_TOOLS } from './Photos/Core/Chat/Tools.js';
import { SHEETS_TOOLS } from './Sheets/Core/Chat/Tools.js';
import { SLIDES_TOOLS } from './Slides/Core/Chat/Tools.js';
import { TASKS_TOOLS } from './Tasks/Core/Chat/Tools.js';
import { YOUTUBE_TOOLS } from './Youtube/Core/Chat/Tools.js';

export {
  CALENDAR_TOOLS,
  CONTACTS_TOOLS,
  DOCS_TOOLS,
  DRIVE_TOOLS,
  FORMS_TOOLS,
  GMAIL_TOOLS,
  PHOTOS_TOOLS,
  SHEETS_TOOLS,
  SLIDES_TOOLS,
  TASKS_TOOLS,
  YOUTUBE_TOOLS,
};
export const TOOL_DEFINITIONS = [
  CALENDAR_TOOLS,
  CONTACTS_TOOLS,
  DOCS_TOOLS,
  DRIVE_TOOLS,
  FORMS_TOOLS,
  GMAIL_TOOLS,
  PHOTOS_TOOLS,
  SHEETS_TOOLS,
  SLIDES_TOOLS,
  TASKS_TOOLS,
  YOUTUBE_TOOLS,
].flat();
export default TOOL_DEFINITIONS;
