import { createConnectorToolHandlers } from '../../Core/ConnectorToolAdapter.js';
import { GOOGLE_TOOL_GROUPS } from './Tools.js';
import { executeAdminDirectoryChatTool } from './AdminDirectory/Core/Chat/ChatExecutor.js';
import { executeCalendarChatTool } from './Calendar/Core/Chat/ChatExecutor.js';
import { executeGoogleChatTool } from './Chat/Core/Chat/ChatExecutor.js';
import { executeClassroomChatTool } from './Classroom/Core/Chat/ChatExecutor.js';
import { executeContactsChatTool } from './Contacts/Core/Chat/ChatExecutor.js';
import { executeDocsChatTool } from './Docs/Core/Chat/ChatExecutor.js';
import { executeDriveChatTool } from './Drive/Core/Chat/ChatExecutor.js';
import { executeFormsChatTool } from './Forms/Core/Chat/ChatExecutor.js';
import { executeGmailChatTool } from './Gmail/Core/Chat/ChatExecutor.js';
import { executeMeetChatTool } from './Meet/Core/Chat/ChatExecutor.js';
import { executePhotosChatTool } from './Photos/Core/Chat/ChatExecutor.js';
import { executeSheetsChatTool } from './Sheets/Core/Chat/ChatExecutor.js';
import { executeSlidesChatTool } from './Slides/Core/Chat/ChatExecutor.js';
import { executeTasksChatTool } from './Tasks/Core/Chat/ChatExecutor.js';
import { executeYouTubeChatTool } from './Youtube/Core/Chat/ChatExecutor.js';

export * from './Tools.js';

export {
  executeAdminDirectoryChatTool,
  executeCalendarChatTool,
  executeGoogleChatTool,
  executeClassroomChatTool,
  executeContactsChatTool,
  executeDocsChatTool,
  executeDriveChatTool,
  executeFormsChatTool,
  executeGmailChatTool,
  executeMeetChatTool,
  executePhotosChatTool,
  executeSheetsChatTool,
  executeSlidesChatTool,
  executeTasksChatTool,
  executeYouTubeChatTool,
};

const GOOGLE_TOOL_EXECUTORS = Object.freeze([
  executeAdminDirectoryChatTool,
  executeCalendarChatTool,
  executeGoogleChatTool,
  executeClassroomChatTool,
  executeContactsChatTool,
  executeDocsChatTool,
  executeDriveChatTool,
  executeFormsChatTool,
  executeGmailChatTool,
  executeMeetChatTool,
  executePhotosChatTool,
  executeSheetsChatTool,
  executeSlidesChatTool,
  executeTasksChatTool,
  executeYouTubeChatTool,
]);

export function createGoogleConnectorToolHandlers({ rootDirectory }) {
  return Object.assign(
    {},
    ...GOOGLE_TOOL_GROUPS.map((toolDefinitions, index) =>
      createConnectorToolHandlers({
        rootDirectory,
        toolDefinitions,
        executeTool: GOOGLE_TOOL_EXECUTORS[index],
      }),
    ),
  );
}
