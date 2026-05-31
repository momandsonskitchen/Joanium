import { createGoogleJsonFetch } from '../../../Core/API/GoogleApiFetch.js';

const CLASSROOM_BASE = 'https://classroom.googleapis.com/v1';
const classroomFetch = createGoogleJsonFetch('Google Classroom');

function appendCsvParams(params, key, value) {
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => params.append(key, item));
}

function pageSize(value, fallback = 25) {
  return String(Math.min(Number(value) || fallback, 100));
}

export async function listCourses(
  creds,
  { maxResults = 25, courseStates = '', teacherId = '', studentId = '' } = {},
) {
  const params = new URLSearchParams({
    pageSize: pageSize(maxResults),
  });

  appendCsvParams(params, 'courseStates', courseStates);
  if (teacherId) params.set('teacherId', teacherId);
  if (studentId) params.set('studentId', studentId);

  return (await classroomFetch(creds, `${CLASSROOM_BASE}/courses?${params}`)).courses ?? [];
}

export async function getCourse(creds, courseId) {
  return classroomFetch(creds, `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}`);
}

export async function listCourseWork(
  creds,
  courseId,
  { maxResults = 25, courseWorkStates = '' } = {},
) {
  const params = new URLSearchParams({
    pageSize: pageSize(maxResults),
  });

  appendCsvParams(params, 'courseWorkStates', courseWorkStates);

  return (
    (
      await classroomFetch(
        creds,
        `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/courseWork?${params}`,
      )
    ).courseWork ?? []
  );
}

export async function listCourseWorkMaterials(creds, courseId, { maxResults = 25 } = {}) {
  const params = new URLSearchParams({
    pageSize: pageSize(maxResults),
  });

  return (
    (
      await classroomFetch(
        creds,
        `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/courseWorkMaterials?${params}`,
      )
    ).courseWorkMaterial ?? []
  );
}

export async function listStudents(creds, courseId, { maxResults = 25 } = {}) {
  const params = new URLSearchParams({
    pageSize: pageSize(maxResults),
  });

  return (
    (
      await classroomFetch(
        creds,
        `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/students?${params}`,
      )
    ).students ?? []
  );
}

export async function listTeachers(creds, courseId, { maxResults = 25 } = {}) {
  const params = new URLSearchParams({
    pageSize: pageSize(maxResults),
  });

  return (
    (
      await classroomFetch(
        creds,
        `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/teachers?${params}`,
      )
    ).teachers ?? []
  );
}

export async function listSubmissions(
  creds,
  courseId,
  courseWorkId,
  { maxResults = 25, states = '' } = {},
) {
  const params = new URLSearchParams({
    pageSize: pageSize(maxResults),
  });

  appendCsvParams(params, 'states', states);

  return (
    (
      await classroomFetch(
        creds,
        `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(
          courseWorkId,
        )}/studentSubmissions?${params}`,
      )
    ).studentSubmissions ?? []
  );
}
