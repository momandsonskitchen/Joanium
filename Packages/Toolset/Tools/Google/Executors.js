import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
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
import { executeCalendarChatTool } from './Calendar/Core/Chat/ChatExecutor.js';
import { executeContactsChatTool } from './Contacts/Core/Chat/ChatExecutor.js';
import { executeDocsChatTool } from './Docs/Core/Chat/ChatExecutor.js';
import { executeDriveChatTool } from './Drive/Core/Chat/ChatExecutor.js';
import { executeFormsChatTool } from './Forms/Core/Chat/ChatExecutor.js';
import { executeGmailChatTool } from './Gmail/Core/Chat/ChatExecutor.js';
import { executePhotosChatTool } from './Photos/Core/Chat/ChatExecutor.js';
import { executeSheetsChatTool } from './Sheets/Core/Chat/ChatExecutor.js';
import { executeSlidesChatTool } from './Slides/Core/Chat/ChatExecutor.js';
import { executeTasksChatTool } from './Tasks/Core/Chat/ChatExecutor.js';
import { executeYouTubeChatTool } from './Youtube/Core/Chat/ChatExecutor.js';

export {
  executeCalendarChatTool,
  executeContactsChatTool,
  executeDocsChatTool,
  executeDriveChatTool,
  executeFormsChatTool,
  executeGmailChatTool,
  executePhotosChatTool,
  executeSheetsChatTool,
  executeSlidesChatTool,
  executeTasksChatTool,
  executeYouTubeChatTool,
};

export function createGoogleConnectorToolHandlers({ rootDirectory }) {
  return {
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: CALENDAR_TOOLS,
      executeTool: executeCalendarChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: CONTACTS_TOOLS,
      executeTool: executeContactsChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: DOCS_TOOLS,
      executeTool: executeDocsChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: DRIVE_TOOLS,
      executeTool: executeDriveChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: FORMS_TOOLS,
      executeTool: executeFormsChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: GMAIL_TOOLS,
      executeTool: executeGmailChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: PHOTOS_TOOLS,
      executeTool: executePhotosChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: SHEETS_TOOLS,
      executeTool: executeSheetsChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: SLIDES_TOOLS,
      executeTool: executeSlidesChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: TASKS_TOOLS,
      executeTool: executeTasksChatTool,
    }),
    ...createConnectorToolHandlers({
      rootDirectory,
      toolDefinitions: YOUTUBE_TOOLS,
      executeTool: executeYouTubeChatTool,
    }),
  };
}
